# MedExplain AI: SHAP Explainability Validation Report

This report documents the verification, structure, and sample outputs of the SHAP explainability layer integrated into the MedExplain AI disease-prediction classifier.

---

## 1. Explainability Infrastructure Details

*   **Target Model Type**: Multi-class Logistic Regression (`sklearn.linear_model.LogisticRegression`)
*   **Number of Features**: `131` unique symptoms
*   **Number of Classes**: `41` target conditions
*   **SHAP Explainer Sourced**: `shap.LinearExplainer`
*   **Reference Masker**: `shap.maskers.Independent` built on the complete training background dataset (sub-sampling disabled to enforce exact mathematical baseline).

---

## 2. Core Explanation Logic

Logistic Regression computes linear log-odds scores for each class. The explainer uses the exact weights (coefficients) and baseline (mean feature values) to compute attribution:

$$\phi_{c, j}(x) = w_{c, j} \cdot (x_j - E[x_j])$$

*   Where $w_{c, j}$ is the coefficient of feature $j$ for class $c$.
*   Where $E[x_j]$ is the mean frequency of symptom $j$ in the background training dataset.
*   Where $x_j$ is the binary value (0 or 1) of symptom $j$ in the patient input.

The service resolves multi-class outputs programmatically by mapping the predicted class index (using `LabelEncoder`) to the correct slice of the `(1, 131, 41)` output dimensions, yielding a localized `(131,)` symptom-importance mapping.

---

## 3. Sample Prediction Explanation Case

*   **Patient Active Symptoms**: `['continuous_sneezing', 'chills', 'shivering', 'runny_nose', 'congestion', 'cough', 'high_fever']`
*   **Model Prediction**: `Allergy` (confidence: `86.37%`)
*   **Computed SHAP Attribution Results**:

| Symptom Feature | Feature Input | SHAP Value | Explanation Direction | Rationale |
|---|---|---|---|---|
| `shivering` | 1 | `+1.8744` | **supports** | Strongly aligns with Allergy profile in the dataset. |
| `continuous_sneezing` | 1 | `+1.7884` | **supports** | Strongly aligns with Allergy profile in the dataset. |
| `chills` | 1 | `+1.5129` | **supports** | Strongly aligns with Allergy profile in the dataset. |
| `runny_nose` | 1 | `-0.0610` | **against** | Weakly pushes decision towards other classes. |
| `congestion` | 1 | `-0.0610` | **against** | Weakly pushes decision towards other classes. |
| `cough` | 1 | `-0.1677` | **against** | Pushes decision towards Common Cold / Pneumonia. |
| `high_fever` | 1 | `-0.3257` | **against** | Fever is atypical for Allergy; presence strongly penalizes the prediction. |

---

## 4. Key Medical Disclaimer & Interpretation Limitations

> [!IMPORTANT]
> **SHAP values explain the MODEL, not the BODY.**
> 
> *   **Model Attribution vs Medical Causation**: SHAP values measure how heavily a model relies on specific feature inputs to cross its mathematical decision boundaries. They do **NOT** prove physiological, clinical, or biological causation.
> *   **No Clinical Evidence**: A positive SHAP value for a symptom (e.g., `shivering`) does not constitute clinical proof that the patient has the predicted disease. It only indicates that the presence of the symptom increased the model's prediction score for that disease class.
> *   **Dataset Bias Dependency**: SHAP attribution maps the biases, spelling errors, and artificial distributions of the training set. If the training data contains clinical inaccuracies or simplifications, the SHAP values will reflect and reinforce those same errors.
> *   **User Presentation**: Explanations must be presented strictly as educational insights detailing the model's classification reasoning, with clear disclaimers that this tool does not substitute professional clinical evaluation.
