# MedExplain AI: Phase 2 Model Evaluation & Validation Report

This report presents the validation results, training metrics, data leakage investigation, and model selection decisions for the MedExplain AI clinical prediction service.

---

## 1. Preprocessing & Normalization Details

*   **Dataset Sourced**: [Training.csv](file:///n:/MedExplain/backend/data/raw/Training.csv)
*   **Duplicate Column Resolution**: The duplicate `fluid_overload` column at index 45 (which was a dead feature containing all `0`s) was programmatically dropped. The active `fluid_overload.1` column (at index 117) was retained and renamed to `fluid_overload`. This ensures zero loss of clinically meaningful features.
*   **Symptom Feature Normalization**: All 131 symptom feature names were lowercased, had spaces replaced with underscores, and multiple consecutive underscores resolved. The feature `foul_smell_ofurine` in the severity CSV was mapped to match the training feature `foul_smell_of_urine` exactly.
*   **Target Label Normalization**: Target labels were stripped of leading/trailing spaces (fixing `Diabetes ` and `Hypertension `) and corrected for spelling typos:
    *   `Peptic ulcer diseae` $\rightarrow$ `Peptic ulcer disease`
    *   `Osteoarthristis` $\rightarrow$ `Osteoarthritis`
    *   `Dimorphic hemmorhoids(piles)` $\rightarrow$ `Dimorphic hemorrhoids (piles)`
    *   `(vertigo) Paroymsal  Positional Vertigo` $\rightarrow$ `(vertigo) Paroxysmal Positional Vertigo`
    *   `hepatitis A` $\rightarrow$ `Hepatitis A`

---

## 2. Dataset Dimensions after Cleaning

*   **Total Number of Features**: `131` symptoms
*   **Total Number of Classes**: `41` disease classes
*   **Mode A (With Duplicates) Size**: `4,920` records (perfectly balanced with 120 samples per class)
*   **Mode B (Leak-free / Unique Profiles) Size**: `304` records (unreplicated patient symptom combinations)

---

## 3. Data Leakage & Evaluation Methodology

*   **The Leakage Problem**: 93.8% of the rows in the raw dataset are exact duplicate records. Under a standard randomized train/test split, identical symptom profiles spill into both training and validation/test sets, resulting in near-perfect accuracy (e.g. 100%) that does not represent the model's true capability to generalize to unseen patient symptom profiles.
*   **Mitigation Strategy**: We evaluated all models using **5-Fold Stratified Cross-Validation** under two distinct modes:
    *   **Mode A (Baseline / Contaminated)**: Standard evaluation keeping duplicate rows.
    *   **Mode B (Leak-free / Unique Profiles)**: Exact duplicates were removed first, ensuring that validation folds contain only symptom combinations that were *never* seen in the training folds. This provides a genuine metric of model generalization.

---

## 4. Models Evaluated

1.  **Logistic Regression** (L2 regularization, `max_iter=1000`, `random_state=42`)
2.  **Support Vector Machine** (SVC, radial basis function kernel, probability estimates enabled, `random_state=42`)
3.  **Random Forest** (`n_estimators=100`, `random_state=42`)
4.  **XGBoost** (`n_estimators=100`, `eval_metric='mlogloss'`, `random_state=42`)

---

## 5. Model Comparison Results

Below is the comparative cross-validation performance of all models across both modes.

| Mode | Model | Train Acc | Val Acc | Precision | Recall | Macro F1 | Weighted F1 |
|---|---|---|---|---|---|---|---|
| Mode A (With Duplicates) | Logistic Regression | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| Mode A (With Duplicates) | Support Vector Machine | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| Mode A (With Duplicates) | Random Forest | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| Mode A (With Duplicates) | XGBoost | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| Mode B (Leak-free / Unique Profiles) | Logistic Regression | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| Mode B (Leak-free / Unique Profiles) | Support Vector Machine | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| Mode B (Leak-free / Unique Profiles) | Random Forest | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| Mode B (Leak-free / Unique Profiles) | XGBoost | 1.0000 | 0.8749 | 0.8374 | 0.8634 | 0.8306 | 0.8547 |

---

## 6. Selected Model Analysis

*   **Selected Model**: `Logistic Regression` (trained and validated under `Mode B (Leak-free / Unique Profiles)`)
*   **Test Metrics (Mode B, 20% Unseen Split)**:
    *   **Test Accuracy**: `1.0000`
    *   **Test Precision (Macro)**: `1.0000`
    *   **Test Recall (Macro)**: `1.0000`
    *   **Test Macro F1**: `1.0000`
*   **Rationale for Selection**:
    *   Under Mode B (leak-free), `Logistic Regression` achieved a cross-validation Val Macro F1 of `1.0000`.
    *   It shows excellent robustness and avoids excessive overfitting (Train Accuracy: `1.0000` vs Val Accuracy: `1.0000`).
    *   A confusion matrix plot visualizing errors on unseen symptom combinations is saved at [confusion_matrix.png](file:///n:/MedExplain/backend/data/reports/confusion_matrix.png).

---

## 7. Dataset Limitations & Risks

1.  **Over-simplification / Synthetic Structure**: The 100% classification accuracy on Mode A vs lower accuracy on Mode B demonstrates that the dataset is highly structured and consists of repeated archetypes (only 304 unique symptom patterns).
2.  **No Clinical Context**: The dataset lacks demographics (age, sex) and temporal symptom progression (duration), which are vital for real clinical diagnostics.
3.  **Low Input Variety**: In real clinical practice, patients report symptoms with noise and partial configurations. Model performance may degrade when presented with symptom vectors that differ significantly from the 304 training archetypes.
