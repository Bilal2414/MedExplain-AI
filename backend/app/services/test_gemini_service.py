import sys
import json
import unittest
from unittest.mock import patch, MagicMock, AsyncMock
from pathlib import Path

# Add backend directory to Python path to import app correctly
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

from app.config import settings
from app.services.gemini_service import gemini_service

class TestGeminiService(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.sample_payload = {
            "symptoms": ["cough", "high_fever"],
            "prediction": {
                "disease": "Allergy",
                "confidence": 0.86
            },
            "alternatives": [
                {"disease": "Common Cold", "probability": 0.05}
            ],
            "explanation": {
                "supporting": [
                    {"symptom": "shivering", "contribution": 1.5}
                ],
                "against": []
            }
        }
        self.mock_gemini_json = {
            "summary": "This is a summary of Allergy.",
            "possible_condition_explanation": "Allergy description.",
            "symptom_relationship": "Symptom description.",
            "alternative_conditions": "Alternatives description.",
            "safety_guidance": "Safety description.",
            "medical_disclaimer": "Standard disclaimer statement."
        }
        self.mock_response_payload = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps(self.mock_gemini_json)
                    }]
                }
            }]
        }

    @patch("app.services.gemini_service.settings")
    async def test_missing_api_key(self, mock_settings):
        """Test that missing Gemini API key raises ValueError."""
        mock_settings.GEMINI_API_KEY = ""
        with self.assertRaises(ValueError) as context:
            await gemini_service.generate_explanation(self.sample_payload)
        self.assertIn("API key is not configured", str(context.exception))

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_successful_explanation(self, mock_post, mock_settings):
        """Test a successful explanation synthesis from Gemini."""
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        # Configure MagicMock response
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = self.mock_response_payload
        mock_post.return_value = mock_res
        
        result = await gemini_service.generate_explanation(self.sample_payload)
        
        self.assertEqual(result["summary"], "This is a summary of Allergy.")
        self.assertEqual(result["possible_condition_explanation"], "Allergy description.")
        self.assertEqual(result["medical_disclaimer"], "Standard disclaimer statement.")
        
        # Verify post payload schema structure is called
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertIn("generationConfig", kwargs["json"])
        self.assertEqual(kwargs["json"]["generationConfig"]["responseMimeType"], "application/json")

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_rate_limiting_429(self, mock_post, mock_settings):
        """Test that HTTP 429 rate limit is captured and raises ValueError."""
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        mock_res = MagicMock()
        mock_res.status_code = 429
        mock_post.return_value = mock_res
        
        with self.assertRaises(ValueError) as context:
            await gemini_service.generate_explanation(self.sample_payload)
        self.assertIn("rate limit exceeded", str(context.exception))

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_timeout_exception(self, mock_post, mock_settings):
        """Test that connection timeout is handled and raises ValueError."""
        import httpx
        mock_settings.GEMINI_API_KEY = "mock_key"
        mock_post.side_effect = httpx.TimeoutException("Connection timed out")
        
        with self.assertRaises(ValueError) as context:
            await gemini_service.generate_explanation(self.sample_payload)
        self.assertIn("request timed out", str(context.exception))

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_malformed_response_json(self, mock_post, mock_settings):
        """Test that malformed/non-JSON contents raise ValueError."""
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        # Return plain text instead of JSON
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": "This is plain text, not a JSON object!"
                    }]
                }
            }]
        }
        mock_post.return_value = mock_res
        
        with self.assertRaises(ValueError) as context:
            await gemini_service.generate_explanation(self.sample_payload)
        self.assertIn("Malformed response format", str(context.exception))

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_emergency_condition_flag(self, mock_post, mock_settings):
        """Test that predicted emergency Stroke condition modifies prompt instructions."""
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        # Modify payload for emergency predicted condition
        emergency_payload = self.sample_payload.copy()
        emergency_payload["prediction"] = {
            "disease": "Stroke",
            "confidence": 0.95
        }
        
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = self.mock_response_payload
        mock_post.return_value = mock_res
        
        await gemini_service.generate_explanation(emergency_payload)
        
        # Assert that prompt text includes critical warning guidelines
        args, kwargs = mock_post.call_args
        prompt_text = kwargs["json"]["contents"][0]["parts"][0]["text"]
        
        self.assertIn("CRITICAL: The predicted condition belongs to a high-risk medical emergency class", prompt_text)
        self.assertIn("prioritize warning the user to seek immediate professional emergency medical care", prompt_text)

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_request_error_exception(self, mock_post, mock_settings):
        """Test that httpx.RequestError (network connection failure) is handled and raises ValueError."""
        import httpx
        mock_settings.GEMINI_API_KEY = "mock_key"
        mock_post.side_effect = httpx.RequestError("Network connection failed")
        
        with self.assertRaises(ValueError) as context:
            await gemini_service.generate_explanation(self.sample_payload)
        self.assertIn("Gemini API network connection failure", str(context.exception))

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_validation_error_403(self, mock_post, mock_settings):
        """Test that HTTP 403 or 400 is captured and raises request validation error ValueError."""
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        mock_res = MagicMock()
        mock_res.status_code = 403
        mock_post.return_value = mock_res
        
        with self.assertRaises(ValueError) as context:
            await gemini_service.generate_explanation(self.sample_payload)
        self.assertIn("Gemini API request validation error (HTTP 403)", str(context.exception))

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_api_error_500(self, mock_post, mock_settings):
        """Test that HTTP 500 other API error raises ValueError."""
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        mock_res = MagicMock()
        mock_res.status_code = 500
        mock_post.return_value = mock_res
        
        with self.assertRaises(ValueError) as context:
            await gemini_service.generate_explanation(self.sample_payload)
        self.assertIn("Gemini API error (HTTP 500)", str(context.exception))

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_empty_candidates(self, mock_post, mock_settings):
        """Test that empty candidates list returns ValueError."""
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {"candidates": []}
        mock_post.return_value = mock_res
        
        with self.assertRaises(ValueError) as context:
            await gemini_service.generate_explanation(self.sample_payload)
        self.assertIn("Empty response candidates returned from Gemini", str(context.exception))

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_empty_text(self, mock_post, mock_settings):
        """Test that empty part text returns ValueError."""
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{"text": ""}]
                }
            }]
        }
        mock_post.return_value = mock_res
        
        with self.assertRaises(ValueError) as context:
            await gemini_service.generate_explanation(self.sample_payload)
        self.assertIn("Empty explanation text returned from Gemini", str(context.exception))

    @patch("app.services.gemini_service.settings")
    @patch("httpx.AsyncClient.post")
    async def test_missing_required_schema_field(self, mock_post, mock_settings):
        """Test that missing required schema field in Gemini JSON output raises ValueError."""
        mock_settings.GEMINI_API_KEY = "mock_key"
        
        # Missing "medical_disclaimer" field from mock Gemini JSON
        incomplete_gemini_json = self.mock_gemini_json.copy()
        incomplete_gemini_json.pop("medical_disclaimer")
        
        mock_res = MagicMock()
        mock_res.status_code = 200
        mock_res.json.value = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps(incomplete_gemini_json)
                    }]
                }
            }]
        }
        # Wait, json() is a method on response, so return_value is needed!
        mock_res.json.return_value = {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": json.dumps(incomplete_gemini_json)
                    }]
                }
            }]
        }
        mock_post.return_value = mock_res
        
        with self.assertRaises(ValueError) as context:
            await gemini_service.generate_explanation(self.sample_payload)
        self.assertIn("Missing required schema field: medical_disclaimer", str(context.exception))

if __name__ == "__main__":
    unittest.main()
