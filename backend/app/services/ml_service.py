import logging
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from app.config import settings

try:
    from services.shap_service import ShapService
except ImportError:
    try:
        from backend.services.shap_service import ShapService
    except ImportError:
        import sys
        sys.path.append(str(Path(__file__).resolve().parent.parent.parent))
        from backend.services.shap_service import ShapService

SYNONYM_MAP = {
    # Fever & Systemic
    "fever": "high_fever",
    "pyrexia": "high_fever",
    "temperature": "high_fever",
    "low_grade_fever": "mild_fever",
    "slight_fever": "mild_fever",
    "tiredness": "fatigue",
    "exhaustion": "fatigue",
    "low_energy": "fatigue",
    "excessive_sweating": "sweating",
    "night_sweats": "sweating",
    "diaphoresis": "sweating",
    "unintentional_weight_loss": "weight_loss",
    "weight_gain": "weight_gain",
    "swollen_nodes": "swelled_lymph_nodes",
    "lymphadenopathy": "swelled_lymph_nodes",
    "swollen_lymph_nodes": "swelled_lymph_nodes",
    "swollen_ankles": "swollen_extremeties",
    "ankle_swelling": "swollen_extremeties",
    "cold_hands_and_feet": "cold_hands_and_feets",
    "cold_extremities": "cold_hands_and_feets",
    
    # Respiratory
    "sore_throat": "throat_irritation",
    "scratchy_throat": "throat_irritation",
    "throat_pain": "throat_irritation",
    "shortness_of_breath": "breathlessness",
    "dyspnea": "breathlessness",
    "difficulty_breathing": "breathlessness",
    "sneezing": "continuous_sneezing",
    "sneeze": "continuous_sneezing",
    "dry_cough": "cough",
    "productive_cough": "cough",
    "coughing": "cough",
    "nasal_congestion": "congestion",
    "blocked_nose": "congestion",
    "stuffy_nose": "congestion",
    "rhinorrhea": "runny_nose",
    "smell_loss": "loss_of_smell",
    "anosmia": "loss_of_smell",
    "taste_loss": "loss_of_smell",
    "hemoptysis": "blood_in_sputum",
    "coughing_blood": "blood_in_sputum",
    "sputum": "phlegm",
    "mucus": "phlegm",
    
    # Gastrointestinal & Liver
    "diarrhea": "diarrhoea",
    "loose_motions": "diarrhoea",
    "watery_stool": "diarrhoea",
    "stomach_ache": "stomach_pain",
    "tummy_pain": "belly_pain",
    "heartburn": "acidity",
    "acid_reflux": "acidity",
    "gas": "passage_of_gases",
    "flatulence": "passage_of_gases",
    "bloating": "distention_of_abdomen",
    "abdominal_distension": "distention_of_abdomen",
    "jaundice": "yellowish_skin",
    "jaundice_skin": "yellowish_skin",
    "blood_in_stool": "bloody_stool",
    "rectal_bleeding": "bloody_stool",
    "anal_itching": "irritation_in_anus",
    "pain_in_anus": "pain_in_anal_region",
    
    # Neurological & Psychological
    "vertigo": "spinning_movements",
    "balance_problems": "loss_of_balance",
    "loss_of_coordination": "loss_of_balance",
    "confusion": "altered_sensorium",
    "disorientation": "altered_sensorium",
    "brain_fog": "lack_of_concentration",
    "poor_concentration": "lack_of_concentration",
    "facial_drooping": "weakness_of_one_body_side",
    "vision_changes": "visual_disturbances",
    "blurred_vision": "blurred_and_distorted_vision",
    "double_vision": "visual_disturbances",
    "loss_of_consciousness": "coma",
    "syncope": "coma",
    "migraine": "headache",
    "severe_headache": "headache",
    "neck_stiffness": "stiff_neck",
    
    # Musculoskeletal
    "body_ache": "muscle_pain",
    "muscle_aches": "muscle_pain",
    "myalgia": "muscle_pain",
    "joint_aches": "joint_pain",
    "arthralgia": "joint_pain",
    "stiff_joints": "movement_stiffness",
    "stiffness": "movement_stiffness",
    "morning_stiffness": "movement_stiffness",
    "swollen_joints": "swelling_joints",
    "swelling_of_joints": "swelling_joints",
    "leg_pain": "painful_walking",
    
    # Skin & Nails
    "rash": "skin_rash",
    "skin_eruption": "nodal_skin_eruptions",
    "itching_skin": "itching",
    "pruritus": "itching",
    "acne": "pus_filled_pimples",
    "pimples": "pus_filled_pimples",
    "boils": "nodal_skin_eruptions",
    "skin_discoloration": "dischromic_patches",
    "red_spots": "red_spots_over_body",
    "blisters": "blister",
    "psoriasis_plaques": "silver_like_dusting",
    "nail_changes": "small_dents_in_nails",
    
    # Urinary & Endocrine
    "frequent_urination": "polyuria",
    "excessive_urination": "polyuria",
    "excessive_thirst": "polyuria",
    "polydipsia": "polyuria",
    "painful_urination": "burning_micturition",
    "dysuria": "burning_micturition",
    "urinary_urgency": "continuous_feel_of_urine",
    "foul_smell_ofurine": "foul_smell_of_urine",
    "spotting_urination": "spotting_urination",
    "goiter": "enlarged_thyroid",
    "thyroid_swelling": "enlarged_thyroid",
    "irregular_periods": "abnormal_menstruation",
    "rapid_heartbeat": "fast_heart_rate",
    "tachycardia": "fast_heart_rate",
    "heart_palpitations": "palpitations",
    "toxic_look": "toxic_look_(typhos)",
}

logger = logging.getLogger(__name__)

class MLService:
    def __init__(self):
        self.model_path = Path(settings.MODEL_PATH)
        self.encoder_path = Path(settings.ENCODER_PATH)
        self.features_path = Path(settings.FEATURES_PATH)
        
        self.model = None
        self.le = None
        self.feature_names = None
        self.shap_service = None
        self.is_loaded = False
        
        self.load_model()

    def normalize_symptom(self, s: str) -> str | None:
        """
        Normalizes arbitrary user/frontend symptom names to exact feature keys.
        Handles casing, spaces, punctuation, underscores, and clinical synonyms.
        """
        if not s or not isinstance(s, str):
            return None
            
        cleaned = s.strip().lower()
        # Remove brackets/parentheses and replace dashes/slashes with underscore
        for ch in ["(", ")", "[", "]", "{", "}", ",", "."]:
            cleaned = cleaned.replace(ch, "")
        for ch in ["-", "/", "\\"]:
            cleaned = cleaned.replace(ch, "_")
            
        cleaned = "_".join(cleaned.split())
        while "__" in cleaned:
            cleaned = cleaned.replace("__", "_")
            
        if self.feature_names and cleaned in self.feature_names:
            return cleaned
            
        # Check explicit dataset typos / variances
        if cleaned == "foul_smell_ofurine":
            return "foul_smell_of_urine"
        if cleaned in ("toxic_look", "toxic_look_typhos"):
            return "toxic_look_(typhos)"
        if cleaned in ("dischromic_patches", "dischromic_patch"):
            return "dischromic_patches"
            
        # Check synonym map
        if cleaned in SYNONYM_MAP:
            mapped = SYNONYM_MAP[cleaned]
            if self.feature_names and mapped in self.feature_names:
                return mapped

        # Substring/Fuzzy match check
        if self.feature_names:
            for vf in self.feature_names:
                if cleaned == vf:
                    return vf
            for vf in self.feature_names:
                if len(cleaned) >= 4 and (cleaned == vf or cleaned in vf or vf in cleaned):
                    return vf

        return None

    def load_model(self) -> None:
        """
        Attempts to load the serialized ML model, label encoder, and feature names.
        Initializes the SHAP explainability service.
        """
        if not self.model_path.exists() or not self.encoder_path.exists() or not self.features_path.exists():
            logger.warning(
                f"ML model artifacts not found. Model path: {self.model_path}, Encoder path: {self.encoder_path}, Features path: {self.features_path}. "
                "Backend will run in 'model-not-loaded' mode."
            )
            self.is_loaded = False
            return

        try:
            self.model = joblib.load(self.model_path)
            self.le = joblib.load(self.encoder_path)
            with open(self.features_path, mode="r", encoding="utf-8") as f:
                self.feature_names = json.load(f)
                
            # Initialize SHAP service
            self.shap_service = ShapService(
                model_path=self.model_path,
                encoder_path=self.encoder_path,
                features_path=self.features_path
            )
            
            self.is_loaded = True
            logger.info("Successfully loaded ML model, LabelEncoder, and SHAP explainer.")
        except Exception as e:
            logger.error(f"Error loading ML model components: {e}", exc_info=True)
            self.is_loaded = False

    def predict_disease(self, user_symptoms: list[str]) -> dict:
        """
        Validates symptoms, executes prediction, retrieves alternatives,
        and generates SHAP explainability attributions.
        """
        if not self.is_loaded:
            raise RuntimeError("ML model is not loaded.")
            
        if not user_symptoms:
            raise ValueError("Symptom list cannot be empty.")
            
        # Clean user symptoms list and validate against feature schema
        cleaned_user_symptoms = []
        unknown_symptoms = []
        for s in user_symptoms:
            normalized = self.normalize_symptom(s)
            if normalized:
                if normalized not in cleaned_user_symptoms:
                    cleaned_user_symptoms.append(normalized)
            else:
                unknown_symptoms.append(s)
                
        if unknown_symptoms:
            raise ValueError(f"Unknown symptoms detected: {', '.join(unknown_symptoms)}")
            
        # Build 131-dimension binary feature vector
        fv = np.zeros(len(self.feature_names))
        for cleaned in cleaned_user_symptoms:
            idx = self.feature_names.index(cleaned)
            fv[idx] = 1.0
            
        # Run prediction
        X_test = pd.DataFrame(fv.reshape(1, -1), columns=self.feature_names)
        pred_class_idx = self.model.predict(X_test)[0]
        pred_class_name = self.le.inverse_transform([pred_class_idx])[0]
        
        # Get probability distributions
        probs = self.model.predict_proba(X_test)[0]
        confidence = float(probs[pred_class_idx])
        
        # Get alternatives (sorted descending, excluding the primary prediction)
        alternatives = []
        for idx, prob in enumerate(probs):
            if idx == pred_class_idx:
                continue
            class_name = self.le.inverse_transform([idx])[0]
            alternatives.append({
                "disease": class_name,
                "probability": float(prob)
            })
        # Sort alternatives by probability descending
        alternatives = sorted(alternatives, key=lambda x: x["probability"], reverse=True)
        
        # Call SHAP service to generate explanation attributions
        try:
            shap_results = self.shap_service.explain_prediction(fv, pred_class_idx)
        except Exception as e:
            logger.error(f"SHAP explanation failed: {e}")
            raise RuntimeError(f"SHAP explanation service error: {e}")
            
        # Filter and split attributions into supporting and against lists
        supporting = []
        against = []
        
        for item in shap_results:
            symptom_name = item["symptom"]
            shap_val = item["value"]
            
            # Check if symptom is active in user input
            if symptom_name in cleaned_user_symptoms:
                contrib_item = {
                    "symptom": symptom_name,
                    "contribution": round(shap_val, 4)
                }
                if shap_val >= 0:
                    supporting.append(contrib_item)
                else:
                    against.append(contrib_item)
                    
        # Sort by absolute contribution descending
        supporting = sorted(supporting, key=lambda x: abs(x["contribution"]), reverse=True)
        against = sorted(against, key=lambda x: abs(x["contribution"]), reverse=True)
        
        return {
            "prediction": {
                "disease": pred_class_name,
                "confidence": round(confidence, 4)
            },
            "alternatives": alternatives,
            "explanation": {
                "supporting": supporting,
                "against": against
            },
            "disclaimer": (
                "MedExplain is an educational AI tool and does not provide a medical diagnosis. "
                "Results should not replace evaluation by a qualified healthcare professional."
            )
        }

    def predict_differentials(self, user_symptoms: list[str], top_n: int = 3) -> dict:
        """
        Calculates prediction probability distributions over all classes,
        sorts them, and calculates local SHAP explanations for the top N conditions.
        
        Returns:
        - dict matching structured prediction data for unified analysis.
        """
        if not self.is_loaded:
            raise RuntimeError("ML model is not loaded.")
            
        if not user_symptoms:
            raise ValueError("Symptom list cannot be empty.")
            
        # Clean user symptoms list and validate against feature schema
        cleaned_user_symptoms = []
        unknown_symptoms = []
        for s in user_symptoms:
            normalized = self.normalize_symptom(s)
            if normalized:
                if normalized not in cleaned_user_symptoms:
                    cleaned_user_symptoms.append(normalized)
            else:
                unknown_symptoms.append(s)
                
        if unknown_symptoms:
            raise ValueError(f"Unknown symptoms detected: {', '.join(unknown_symptoms)}")
            
        # Build 131-dimension binary feature vector
        fv = np.zeros(len(self.feature_names))
        for cleaned in cleaned_user_symptoms:
            idx = self.feature_names.index(cleaned)
            fv[idx] = 1.0
            
        # Run prediction
        X_test = pd.DataFrame(fv.reshape(1, -1), columns=self.feature_names)
        pred_class_idx = self.model.predict(X_test)[0]
        pred_class_name = self.le.inverse_transform([pred_class_idx])[0]
        
        # Get probability distributions
        probs = self.model.predict_proba(X_test)[0]
        confidence = float(probs[pred_class_idx])
        
        # Map all conditions to their predictions
        all_predictions = []
        for idx, prob in enumerate(probs):
            class_name = self.le.inverse_transform([idx])[0]
            all_predictions.append({
                "name": class_name,
                "confidence": float(prob),
                "class_idx": idx
            })
            
        # Sort predictions descending by confidence
        sorted_predictions = sorted(all_predictions, key=lambda x: x["confidence"], reverse=True)
        
        # Select top N conditions for SHAP explainability
        top_conditions = sorted_predictions[:top_n]
        
        # Extract SHAP explanations for each of the top N conditions
        conditions_with_shap = []
        for cond in top_conditions:
            cond_name = cond["name"]
            cond_conf = cond["confidence"]
            cond_idx = cond["class_idx"]
            
            try:
                shap_results = self.shap_service.explain_prediction(fv, cond_idx)
            except Exception as e:
                logger.error(f"SHAP explanation failed for class {cond_name}: {e}")
                raise RuntimeError(f"SHAP explanation service error: {e}")
                
            # Filter and extract SHAP contributions for active symptoms
            cond_shap_list = []
            for item in shap_results:
                symptom_name = item["symptom"]
                shap_val = item["value"]
                
                # We only explain symptoms that are active/present in user symptoms
                if symptom_name in cleaned_user_symptoms:
                    cond_shap_list.append({
                        "symptom": symptom_name,
                        "value": round(shap_val, 4)
                    })
                    
            # Sort symptoms by absolute SHAP value descending
            cond_shap_list = sorted(cond_shap_list, key=lambda x: abs(x["value"]), reverse=True)
            
            conditions_with_shap.append({
                "name": cond_name,
                "confidence": round(cond_conf, 4),
                "shap": cond_shap_list
            })
            
        # Format prediction detail & alternatives for Gemini prompting
        prediction_detail = {
            "disease": pred_class_name,
            "confidence": round(confidence, 4)
        }
        
        alternatives = []
        for cond in sorted_predictions[1:]: # exclude primary
            alternatives.append({
                "disease": cond["name"],
                "probability": round(cond["confidence"], 4)
            })
            
        return {
            "prediction": prediction_detail,
            "alternatives": alternatives[:5], # top 5 alternatives
            "conditions": conditions_with_shap
        }


# Instantiate MLService singleton
ml_service = MLService()
