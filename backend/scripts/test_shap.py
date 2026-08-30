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

MODEL_PATH = MODELS_DIR / "best_model.joblib"
FEATURES_PATH = MODELS_DIR / "feature_names.json"
ENCODER_PATH = MODELS_DIR / "label_encoder.joblib"
TRAINING_PATH = RAW_DIR / "Training.csv"

def inspect_model_and_shap():
    # 1. Load serialized model, feature list, and label encoder
    print("Loading model and artifacts...")
    model = joblib.load(MODEL_PATH)
    le = joblib.load(ENCODER_PATH)
    
    with open(FEATURES_PATH, mode="r", encoding="utf-8") as f:
        feature_names = json.load(f)
        
    print(f"Model Type: {type(model)}")
    print(f"Number of Features: {len(feature_names)}")
    print(f"Number of Classes: {len(le.classes_)}")
    
    # Verify coefficients dimensions
    # For multiclass, model.coef_ shape is (n_classes, n_features)
    print(f"Coefficients shape: {model.coef_.shape}")
    print(f"Intercepts shape: {model.intercept_.shape}")
    
    # 2. Create a mock input vector corresponding to 'Common Cold'
    # Classic symptoms for Common Cold: continuous_sneezing, chills, shivering, runny_nose, congestion, cough, high_fever
    mock_symptoms = ["continuous_sneezing", "chills", "shivering", "runny_nose", "congestion", "cough", "high_fever"]
    
    # Initialize zero feature vector
    x_input = np.zeros((1, len(feature_names)))
    for sym in mock_symptoms:
        if sym in feature_names:
            idx = feature_names.index(sym)
            x_input[0, idx] = 1
            
    # Convert mock input to dataframe with correct feature names
    X_test = pd.DataFrame(x_input, columns=feature_names)
    
    # Predict
    pred_idx = model.predict(X_test)[0]
    pred_label = le.inverse_transform([pred_idx])[0]
    pred_probs = model.predict_proba(X_test)[0]
    
    print(f"\nMock Input active symptoms: {mock_symptoms}")
    print(f"Predicted Class Index: {pred_idx}")
    print(f"Predicted Class Name: {pred_label}")
    print(f"Confidence score: {pred_probs[pred_idx]:.4f}")
    
    # 3. Compute SHAP Values
    print("\nInitializing SHAP Explainer...")
    # Load Training.csv for background dataset
    df_raw = pd.read_csv(TRAINING_PATH)
    
    # Clean Training.csv features the same way as training
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
    
    # Verify feature ordering matches feature_names
    assert list(X_background.columns) == feature_names, "Background features mismatch feature_names order!"
    
    # Use LinearExplainer for Logistic Regression
    explainer = shap.LinearExplainer(model, X_background)
    
    # Compute SHAP explanation
    explanation = explainer(X_test)
    
    # Check shape of explanation.values
    # For multiclass, it returns (n_samples, n_features, n_classes)
    print(f"SHAP values explanation shape: {explanation.values.shape}")
    
    # Extract values for the predicted class index
    shap_vals_for_class = explanation.values[0, :, pred_idx]
    print(f"Extracted SHAP values for class '{pred_label}' (shape: {shap_vals_for_class.shape})")
    
    # Map values to feature names
    shap_map = list(zip(feature_names, shap_vals_for_class))
    
    # Sort by absolute SHAP value to find top contributors
    shap_map_sorted = sorted(shap_map, key=lambda x: abs(x[1]), reverse=True)
    
    print("\nTop 5 contributing symptoms to decision (Absolute SHAP values):")
    for feat, val in shap_map_sorted[:5]:
        direction = "supports" if val > 0 else "against"
        print(f"  - '{feat}': {val:.4f} ({direction})")

    print("\nTop 3 active symptoms in input and their SHAP values:")
    active_sorted = sorted([(feat, val) for feat, val in shap_map if X_test.loc[0, feat] == 1], key=lambda x: x[1], reverse=True)
    for feat, val in active_sorted:
        direction = "supports" if val > 0 else "against"
        print(f"  - '{feat}': {val:.4f} ({direction})")

if __name__ == "__main__":
    inspect_model_and_shap()
