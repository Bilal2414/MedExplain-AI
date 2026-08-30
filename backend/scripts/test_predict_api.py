import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

# Add backend directory to Python path to import app correctly
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from app.main import app
from app.schemas.analysis import PredictResponse

class TestPredictAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Initialize the FastAPI TestClient
        cls.client = TestClient(app)

    def test_health_check(self):
        """Test that the health check endpoint returns 200 and model is loaded."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["model_loaded"])

    def test_readiness_check(self):
        """Test that the readiness check endpoint returns 200 ready status."""
        response = self.client.get("/ready")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ready")

    def test_valid_prediction_single_symptom(self):
        """Test a valid prediction request with a single symptom."""
        payload = {
            "symptoms": ["cough"]
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        # Verify Pydantic schema validation by instantiating the response model
        try:
            validated = PredictResponse(**data)
        except Exception as e:
            self.fail(f"Response does not validate against PredictResponse schema: {e}")
            
        self.assertIn("prediction", data)
        self.assertIn("disease", data["prediction"])
        self.assertIn("confidence", data["prediction"])
        
        self.assertIn("alternatives", data)
        self.assertGreater(len(data["alternatives"]), 0)
        
        self.assertIn("explanation", data)
        self.assertIn("supporting", data["explanation"])
        self.assertIn("against", data["explanation"])
        
        # 'cough' should be present in explanation lists as it is the only active symptom
        active_explained = [item["symptom"] for item in data["explanation"]["supporting"]] + \
                           [item["symptom"] for item in data["explanation"]["against"]]
        self.assertIn("cough", active_explained)
        
        # Verify disclaimer
        self.assertIn("disclaimer", data)
        self.assertIn("MedExplain is an educational AI tool", data["disclaimer"])

    def test_valid_prediction_multiple_symptoms(self):
        """Test a valid prediction request with multiple symptoms."""
        payload = {
            "symptoms": ["shivering", "chills", "high_fever", "cough"]
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertEqual(data["prediction"]["disease"], "Allergy") # Mock symptoms mapped to Allergy in Logistic Regression baseline
        
        # Confirm that active symptoms appear in explanation
        supporting_syms = [item["symptom"] for item in data["explanation"]["supporting"]]
        against_syms = [item["symptom"] for item in data["explanation"]["against"]]
        
        # Verify that only submitted active symptoms are explained
        for sym in data["explanation"]["supporting"]:
            self.assertIn(sym["symptom"], payload["symptoms"])
            
        for sym in data["explanation"]["against"]:
            self.assertIn(sym["symptom"], payload["symptoms"])

    def test_duplicate_symptoms(self):
        """Test that duplicate symptoms are processed successfully and deduplicated."""
        payload = {
            "symptoms": ["cough", "cough", "shivering", "shivering"]
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("prediction", data)
        self.assertEqual(data["prediction"]["disease"], "Allergy")

    def test_extremely_large_symptoms_list(self):
        """Test that submitting more than 131 symptoms returns a 400 Bad Request."""
        payload = {
            "symptoms": ["cough"] * 150
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("detail", data)
        self.assertIn("exceeds maximum limit of 131", data["detail"])

    def test_unknown_symptom(self):
        """Test that submitting an unknown symptom returns a clear 400 Bad Request error."""
        payload = {
            "symptoms": ["cough", "non_existent_symptom_xyz"]
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("detail", data)
        self.assertIn("Unknown symptoms detected", data["detail"])
        self.assertIn("non_existent_symptom_xyz", data["detail"])

    def test_empty_symptoms(self):
        """Test that submitting an empty symptoms list returns a 400 Bad Request error."""
        payload = {
            "symptoms": []
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("detail", data)
        self.assertIn("Symptom list cannot be empty", data["detail"])

    def test_malformed_request(self):
        """Test that submitting an invalid JSON payload returns a 422 Unprocessable Entity error."""
        payload = {
            "symptom_list_wrong_key": ["cough"]
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_human_readable_and_synonym_symptoms(self):
        """Test that human-readable UI strings and common clinical synonyms are normalized successfully."""
        payload = {
            "symptoms": ["Continuous Sneezing", "High Fever", "Sore throat", "Shortness of breath", "Diarrhea", "Joint pain"]
        }
        response = self.client.post("/api/predict", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("prediction", data)
        self.assertIn("disease", data["prediction"])
        self.assertIn("explanation", data)

if __name__ == "__main__":
    unittest.main()

