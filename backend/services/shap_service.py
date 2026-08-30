import os
import json
import joblib
import pandas as pd
import numpy as np
import shap
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
RAW_DIR = BASE_DIR / "data" / "raw"

class ShapService:
    """
    Service to calculate real SHAP explainability values for the MedExplain AI classifier.
    Exposes reusable functionality to explain individual predictions.
    
    Disclaimer: SHAP explainability describes model behavior/feature associations.
    It is NOT medical causation or objective clinical evidence.
    """
    
    def __init__(self, model_path=None, encoder_path=None, features_path=None, training_path=None):
        self.model_path = Path(model_path) if model_path else MODELS_DIR / "best_model.joblib"
        self.encoder_path = Path(encoder_path) if encoder_path else MODELS_DIR / "label_encoder.joblib"
        self.features_path = Path(features_path) if features_path else MODELS_DIR / "feature_names.json"
        self.training_path = Path(training_path) if training_path else RAW_DIR / "Training.csv"
        
        # Load serialized model, label encoder, and feature names
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model file not found at {self.model_path}. Run training first.")
        self.model = joblib.load(self.model_path)
        self.le = joblib.load(self.encoder_path)
        
        with open(self.features_path, mode="r", encoding="utf-8") as f:
            self.feature_names = json.load(f)
            
        # Initialize background data for SHAP explainer
        if not self.training_path.exists():
            raise FileNotFoundError(f"Background dataset not found at {self.training_path}.")
        df_raw = pd.read_csv(self.training_path)
        
        # Process background dataset features to match training schema
        cols = list(df_raw.columns)
        if 'fluid_overload.1' in cols:
            first_idx = cols.index('fluid_overload')
            df_raw = df_raw.drop(df_raw.columns[first_idx], axis=1)
            df_raw = df_raw.rename(columns={'fluid_overload.1': 'fluid_overload'})
            
        new_cols = []
        for col in df_raw.columns[:-1]:
            cleaned = col.strip().lower().replace(" ", "_")
            while "__" in cleaned:
                cleaned = cleaned.replace("__", "_")
            if cleaned == "foul_smell_ofurine":
                cleaned = "foul_smell_of_urine"
            new_cols.append(cleaned)
            
        X_background = df_raw.iloc[:, :-1].copy()
        X_background.columns = new_cols
        
        # Enforce feature names list match
        if list(X_background.columns) != self.feature_names:
            # Reorder columns to match feature_names
            X_background = X_background[self.feature_names]
            
        # Build masker and LinearExplainer
        # Enforce max_samples to use the full background dataset and suppress sub-sampling warnings
        masker = shap.maskers.Independent(X_background, max_samples=len(X_background))
        self.explainer = shap.LinearExplainer(self.model, masker)
        
    def explain_prediction(self, feature_vector, predicted_class):
        """
        Calculates feature attribution (SHAP values) for the given predicted class.
        
        Parameters:
        - feature_vector: list or np.ndarray of length 131 representing binary symptom features.
        - predicted_class: str (class name) or int (class index corresponding to prediction).
        
        Returns:
        - list of dicts: [
            { "symptom": "fever", "value": 0.42, "direction": "supports" }, ...
          ]
        """
        fv = np.array(feature_vector).flatten().reshape(1, -1)
        if fv.shape[1] != len(self.feature_names):
            raise ValueError(f"Feature vector has length {fv.shape[1]}, but model requires {len(self.feature_names)} features.")
            
        # Resolve class index
        if isinstance(predicted_class, (int, np.integer)):
            class_idx = int(predicted_class)
            if class_idx < 0 or class_idx >= len(self.le.classes_):
                raise ValueError(f"Class index {class_idx} is out of bounds.")
        elif isinstance(predicted_class, str):
            if predicted_class not in self.le.classes_:
                raise ValueError(f"Class name '{predicted_class}' not found in label encoder classes.")
            class_idx = list(self.le.classes_).index(predicted_class)
        else:
            raise TypeError("predicted_class must be a string or integer index.")
            
        # Construct dataframe with correct feature order/names
        X_test = pd.DataFrame(fv, columns=self.feature_names)
        
        # Compute SHAP explanation values
        explanation = self.explainer(X_test)
        
        # Extract values for the target predicted class
        # multiclass LinearExplainer returns shape: (n_samples, n_features, n_classes)
        shap_vals = explanation.values[0, :, class_idx]
        
        # Format results
        results = []
        for i, val in enumerate(shap_vals):
            feat_name = self.feature_names[i]
            direction = "supports" if val >= 0 else "against"
            results.append({
                "symptom": feat_name,
                "value": float(val),
                "direction": direction
            })
            
        return results
