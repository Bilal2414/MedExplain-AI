import unittest
import json
import joblib
import numpy as np
from pathlib import Path
from backend.services.shap_service import ShapService

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = BASE_DIR / "backend" / "models"

class TestShapService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Initialize service (which loads model and data)
        cls.service = ShapService()
        
    def test_correct_feature_count(self):
        """Test that the loaded feature count matches the expected 131 symptoms."""
        self.assertEqual(len(self.service.feature_names), 131)
        self.assertEqual(self.service.model.n_features_in_, 131)
        
    def test_correct_feature_ordering(self):
        """Test that feature order matches the saved json ordering exactly."""
        with open(self.service.features_path, mode="r", encoding="utf-8") as f:
            saved_features = json.load(f)
        self.assertEqual(self.service.feature_names, saved_features)
        
    def test_valid_shap_dimensions(self):
        """Test that the output SHAP dimensions match the 131 features."""
        # Create zero input vector
        mock_input = np.zeros(131)
        # Explain class index 0
        explanation = self.service.explain_prediction(mock_input, 0)
        self.assertEqual(len(explanation), 131)
        self.assertEqual(explanation[0]["symptom"], self.service.feature_names[0])
        
    def test_positive_negative_contribution_handling(self):
        """Test that positive and negative values map correctly to supports/against direction."""
        # Explain 'Common Cold' class with active chills, shivering
        mock_input = np.zeros(131)
        
        # Set some features to 1
        chills_idx = self.service.feature_names.index("chills")
        shivering_idx = self.service.feature_names.index("shivering")
        mock_input[chills_idx] = 1
        mock_input[shivering_idx] = 1
        
        explanation = self.service.explain_prediction(mock_input, "Common Cold")
        
        # Check directions match the values
        for item in explanation:
            val = item["value"]
            direction = item["direction"]
            if val >= 0:
                self.assertEqual(direction, "supports")
            else:
                self.assertEqual(direction, "against")
                
    def test_multiclass_prediction(self):
        """Test that explaining different classes extracts the corresponding SHAP class index values."""
        mock_input = np.zeros(131)
        # Set symptoms
        mock_input[self.service.feature_names.index("high_fever")] = 1
        mock_input[self.service.feature_names.index("cough")] = 1
        
        # Get explanation for two different classes
        exp_cold = self.service.explain_prediction(mock_input, "Common Cold")
        exp_malaria = self.service.explain_prediction(mock_input, "Malaria")
        
        # Extract SHAP values
        vals_cold = [item["value"] for item in exp_cold]
        vals_malaria = [item["value"] for item in exp_malaria]
        
        # Check that the SHAP values are different for different diseases
        self.assertNotEqual(vals_cold, vals_malaria)
        
    def test_missing_symptom_handling(self):
        """Test that invalid feature vector lengths raise appropriate errors."""
        # Short feature vector
        short_input = np.zeros(100)
        with self.assertRaises(ValueError):
            self.service.explain_prediction(short_input, "Common Cold")
            
        # Class index out of bounds
        mock_input = np.zeros(131)
        with self.assertRaises(ValueError):
            self.service.explain_prediction(mock_input, 999) # Out of bounds index
            
        # Non-existent class name
        with self.assertRaises(ValueError):
            self.service.explain_prediction(mock_input, "Non-existent Disease")

if __name__ == "__main__":
    unittest.main()
