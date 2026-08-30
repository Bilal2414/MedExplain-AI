import os
import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "data" / "reports"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

TRAINING_PATH = RAW_DIR / "Training.csv"

def clean_data(df):
    cols = list(df.columns)
    
    # 1. Resolve duplicate fluid_overload column
    if 'fluid_overload.1' in cols:
        first_idx = cols.index('fluid_overload')
        df = df.drop(df.columns[first_idx], axis=1)
        df = df.rename(columns={'fluid_overload.1': 'fluid_overload'})
    
    # Normalize symptom feature names
    new_cols = []
    for col in df.columns[:-1]: # exclude prognosis
        cleaned = col.strip().lower()
        cleaned = cleaned.replace(" ", "_")
        while "__" in cleaned:
            cleaned = cleaned.replace("__", "_")
        if cleaned == "foul_smell_ofurine":
            cleaned = "foul_smell_of_urine"
        new_cols.append(cleaned)
        
    df.columns = new_cols + [df.columns[-1]]
    
    # 2. Normalize target prognosis labels
    df[df.columns[-1]] = df[df.columns[-1]].astype(str).str.strip()
    
    corrections = {
        "Peptic ulcer diseae": "Peptic ulcer disease",
        "Osteoarthristis": "Osteoarthritis",
        "Dimorphic hemmorhoids(piles)": "Dimorphic hemorrhoids (piles)",
        "(vertigo) Paroymsal  Positional Vertigo": "(vertigo) Paroxysmal Positional Vertigo",
        "hepatitis A": "Hepatitis A"
    }
    df[df.columns[-1]] = df[df.columns[-1]].replace(corrections)
    
    return df

def train_best_model():
    if not TRAINING_PATH.exists():
        raise FileNotFoundError(f"Training dataset not found at {TRAINING_PATH}")
        
    df_raw = pd.read_csv(TRAINING_PATH)
    df = clean_data(df_raw)
    
    X = df.iloc[:, :-1]
    y = df.iloc[:, -1]
    
    feature_names = list(X.columns)
    
    # Encode targets
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # Define models to compare on Mode B (Leak-free)
    df_mode_b = df.drop_duplicates().copy()
    X_b = df_mode_b.iloc[:, :-1]
    y_b = df_mode_b.iloc[:, -1]
    
    le_b = LabelEncoder()
    y_b_encoded = le_b.fit_transform(y_b)
    
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Support Vector Machine": SVC(probability=True, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=42)
    }
    
    best_model_key = None
    best_macro_f1 = -1.0
    
    # Run cross-validation on Mode B to find the best model
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    for model_name, clf in models.items():
        f1s = []
        for train_idx, val_idx in skf.split(X_b, y_b_encoded):
            X_tr, X_val = X_b.iloc[train_idx], X_b.iloc[val_idx]
            y_tr, y_val = y_b_encoded[train_idx], y_b_encoded[val_idx]
            
            clf.fit(X_tr, y_tr)
            preds = clf.predict(X_val)
            _, _, f1, _ = precision_recall_fscore_support(y_val, preds, average='macro', zero_division=0)
            f1s.append(f1)
            
        mean_f1 = np.mean(f1s)
        print(f"CV Macro F1 for {model_name} on Mode B: {mean_f1:.4f}")
        if mean_f1 > best_macro_f1:
            best_macro_f1 = mean_f1
            best_model_key = model_name
            
    print(f"\nSelected Best Model based on Mode B generalization: {best_model_key} (CV Macro F1: {best_macro_f1:.4f})")
    
    # Instantiate and fit the best model on the FULL preprocessed dataset (X, y_encoded)
    if best_model_key == "Logistic Regression":
        best_clf = LogisticRegression(max_iter=1000, random_state=42)
    elif best_model_key == "Support Vector Machine":
        best_clf = SVC(probability=True, random_state=42)
    elif best_model_key == "Random Forest":
        best_clf = RandomForestClassifier(n_estimators=100, random_state=42)
    else:
        best_clf = XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', random_state=42)
        
    print(f"Fitting final {best_model_key} on full dataset (shape: {X.shape})...")
    best_clf.fit(X, y_encoded)
    
    # Serialization
    best_model_path = MODELS_DIR / "best_model.joblib"
    feature_names_path = MODELS_DIR / "feature_names.json"
    label_encoder_path = MODELS_DIR / "label_encoder.joblib"
    metadata_path = MODELS_DIR / "model_metadata.json"
    
    # Save best classifier
    joblib.dump(best_clf, best_model_path)
    # Save label encoder
    joblib.dump(le, label_encoder_path)
    # Save feature names order list
    with open(feature_names_path, mode="w", encoding="utf-8") as f:
        json.dump(feature_names, f, indent=2)
        
    # Save model metadata
    metadata = {
        "model_name": best_model_key,
        "selected_on_mode_b_val_f1": f"{best_macro_f1:.4f}",
        "num_features": len(feature_names),
        "num_classes": len(le.classes_),
        "classes_list": list(le.classes_),
        "features_list": feature_names,
        "parameters": str(best_clf.get_params())
    }
    with open(metadata_path, mode="w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"Saved best_model.joblib to {best_model_path}")
    print(f"Saved feature_names.json to {feature_names_path}")
    print(f"Saved label_encoder.joblib to {label_encoder_path}")
    print(f"Saved model_metadata.json to {metadata_path}")
    print("\n--- Model Training Pipeline Complete ---")

if __name__ == "__main__":
    train_best_model()
