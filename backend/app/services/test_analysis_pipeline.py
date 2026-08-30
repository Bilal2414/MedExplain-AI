import sys
import json
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to Python path to import app correctly
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

from app.config import settings
from app.main import app
from app.services.ml_service import ml_service
from app.services.gemini_service import gemini_service
from app.schemas.analysis import AnalyzeResponse

class TestAnalysisPipeline(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
    def setUp(self):
        self.sample_symptoms = [
            {"name": "cough", "duration": "1–3 days"},
            {"name": "shivering", "duration": "< 1 day"}
        ]
        self.sample_analyze_request = {
            "symptoms": self.sample_symptoms,
            "notes": "Patient is a 45-year-old male."
        }
        
        self.mock_gemini_differential_json = {
            "differentials_note": "Based on model correlations, Allergy and Common Cold are considered possible conditions.",
            "conditions": [
                {
                    "name": "Allergy",
                    "icd": "J30.9",
                    "prevalence": "Common",
                    "typical_duration": "Chronic / recurring",
                    "urgency": "Routine",
                    "specialist": "Allergist",
                    "contagious": False,
                    "key_features": ["sneezing", "itchy eyes"],
                    "matched_symptoms": ["shivering"],
                    "duration_insight": "Symptom duration aligns with persistent allergic exposure.",
                    "recommendation": "Avoid known allergens. Antihistamines as recommended.",
                    "red_flags_specific": ["Difficulty breathing"]
                },
                {
                    "name": "Common Cold",
                    "icd": "J00",
                    "prevalence": "Common",
                    "typical_duration": "1–2 weeks",
                    "urgency": "Routine",
                    "specialist": "General Practitioner",
                    "contagious": True,
                    "key_features": ["runny nose", "sore throat"],
                    "matched_symptoms": ["cough"],
                    "duration_insight": "Duration is typical for viral upper respiratory infection.",
                    "recommendation": "Rest and hydration.",
                    "red_flags_specific": ["High fever"]
                }
            ],
            "red_flags": ["Difficulty breathing", "Persistent high fever"],
            "lifestyle_advice": ["Rest, hydrate, avoid allergens."],
            "disclaimer": "Educational AI explanation."
        }
        
        self.mock_response_payload = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps(self.mock_gemini_differential_json)
                    }]
                }
            }]
        }

    # 1. ML Service predict_differentials tests
    def test_predict_differentials_success(self):
        """Test predict_differentials returns top predictions and correct SHAP values structure."""
        if not ml_service.is_loaded:
            self.skipTest("ML Model is not loaded")
        
        result = ml_service.predict_differentials(["cough", "shivering"], top_n=3)
        self.assertIn("prediction", result)
        self.assertIn("alternatives", result)
        self.assertIn("conditions", result)
        self.assertGreater(len(result["conditions"]), 0)
        
        # Check SHAP structure in conditions
        for cond in result["conditions"]:
            self.assertIn("name", cond)
            self.assertIn("confidence", cond)
            self.assertIn("shap", cond)
            for item in cond["shap"]:
                self.assertIn("symptom", item)
                self.assertIn("value", item)
                self.assertIn(item["symptom"], ["cough", "shivering"])

    def test_predict_differentials_empty_symptoms(self):
        """Test that predict_differentials with empty symptoms list raises ValueError."""
        if not ml_service.is_loaded:
            self.skipTest("ML Model is not loaded")
        with self.assertRaises(ValueError):
            ml_service.predict_differentials([])

    def test_predict_differentials_unknown_symptom(self):
        """Test that predict_differentials with unknown symptom name raises ValueError."""
        if not ml_service.is_loaded:
            self.skipTest("ML Model is not loaded")
        with self.assertRaises(ValueError) as context:
            ml_service.predict_differentials(["cough", "non_existent_symptom_123"])
        self.assertIn("Unknown symptoms detected", str(context.exception))

    # 2. Gemini Service generate_differential_analysis tests
    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_generate_differential_analysis_success(self, mock_post, mock_settings):
        """Test a successful differential explanation synthesis from Gemini."""
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = self.mock_response_payload
        mock_post.return_value = mock_res
        
        predictions_data = {
            "prediction": {"disease": "Allergy", "confidence": 0.86},
            "alternatives": [{"disease": "Common Cold", "probability": 0.05}],
            "conditions": [
                {"name": "Allergy", "confidence": 0.86, "shap": [{"symptom": "shivering", "value": 1.5}]},
                {"name": "Common Cold", "confidence": 0.05, "shap": [{"symptom": "cough", "value": 0.2}]}
            ]
        }
        
        result = await gemini_service.generate_differential_analysis(
            self.sample_symptoms, predictions_data, patient_notes="Notes"
        )
        
        self.assertEqual(result["differentials_note"], self.mock_gemini_differential_json["differentials_note"])
        self.assertEqual(len(result["conditions"]), 2)
        self.assertEqual(result["conditions"][0]["name"], "Allergy")
        self.assertEqual(result["conditions"][1]["name"], "Common Cold")
        
        # Verify schema payload config is set
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(kwargs["json"]["generationConfig"]["responseMimeType"], "application/json")
        self.assertIn("responseSchema", kwargs["json"]["generationConfig"])

    # 3. Route POST /api/analyze tests
    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    def test_api_analyze_success(self, mock_post, mock_settings):
        """Test API analyze POST endpoint maps SHAP and returns validated AnalyzeResponse."""
        if not ml_service.is_loaded:
            self.skipTest("ML Model is not loaded")
            
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = self.mock_response_payload
        mock_post.return_value = mock_res
        
        response = self.client.post("/api/analyze", json=self.sample_analyze_request)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        
        # Validate Pydantic schema
        try:
            validated = AnalyzeResponse(**data)
        except Exception as e:
            self.fail(f"API /analyze response failed schema validation: {e}")
            
        self.assertEqual(data["differentials_note"], self.mock_gemini_differential_json["differentials_note"])
        self.assertEqual(len(data["conditions"]), 2)
        
        # Ensure confidence and SHAP mappings are aligned from local ML results
        first_cond = data["conditions"][0]
        self.assertEqual(first_cond["name"], "Allergy")
        self.assertGreater(first_cond["confidence"], 0.0)
        self.assertGreater(len(first_cond["shap"]), 0)
        self.assertEqual(first_cond["shap"][0]["symptom"], "shivering")

    @patch("app.routes.analysis.settings")
    def test_api_analyze_missing_api_key(self, mock_settings):
        """Test that missing Gemini API key returns 503 Service Unavailable."""
        mock_settings.GEMINI_API_KEY = ""
        mock_settings.API_BEARER_TOKEN = ""
        response = self.client.post("/api/analyze", json=self.sample_analyze_request)
        self.assertEqual(response.status_code, 503)
        self.assertIn("Gemini AI service configuration is missing", response.json()["detail"])

    def test_api_analyze_empty_symptoms(self):
        """Test that empty symptoms list returns 422 Unprocessable Entity due to Pydantic constraints."""
        payload = {
            "symptoms": [],
            "notes": "Empty symptoms test"
        }
        response = self.client.post("/api/analyze", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_api_analyze_too_many_symptoms(self):
        """Test that submitting more than 131 symptoms returns a 400 Bad Request."""
        payload = {
            "symptoms": [{"name": "cough", "duration": "1–3 days"}] * 150,
            "notes": "Too many symptoms"
        }
        response = self.client.post("/api/analyze", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("exceeds maximum limit of 131", response.json()["detail"])

    @patch("app.routes.analysis.settings")
    def test_api_analyze_with_bearer_token_required_success(self, mock_settings):
        """Test /api/analyze succeeds when matching Bearer token is provided."""
        if not ml_service.is_loaded:
            self.skipTest("ML Model is not loaded")
        mock_settings.API_BEARER_TOKEN = "secret_token_123"
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        # Mock Gemini request logic to prevent HTTP callout
        with patch("app.services.gemini_service.settings") as mock_gemini_settings, \
             patch("httpx.AsyncClient.post") as mock_post:
            mock_gemini_settings.GEMINI_API_KEY = "mock_key"
            mock_res = MagicMock()
            mock_res.status_code = 200
            mock_res.json.return_value = self.mock_response_payload
            mock_post.return_value = mock_res
            
            headers = {"Authorization": "Bearer secret_token_123"}
            response = self.client.post("/api/analyze", json=self.sample_analyze_request, headers=headers)
            self.assertEqual(response.status_code, 200)

    @patch("app.routes.analysis.settings")
    def test_api_analyze_with_bearer_token_required_unauthorized(self, mock_settings):
        """Test /api/analyze returns 401 Unauthorized when token is missing or incorrect."""
        mock_settings.API_BEARER_TOKEN = "secret_token_123"
        
        # 1. Missing header
        response = self.client.post("/api/analyze", json=self.sample_analyze_request)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Missing or malformed Authorization header", response.json()["detail"])
        
        # 2. Incorrect token
        headers = {"Authorization": "Bearer wrong_token"}
        response = self.client.post("/api/analyze", json=self.sample_analyze_request, headers=headers)
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid Authorization token", response.json()["detail"])

if __name__ == "__main__":
    unittest.main()
