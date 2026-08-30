# MedExplain AI: Medical Safety Review

This report details the medical safety protocols, risk mitigation strategies, and terminology alignments implemented within the MedExplain system.

---

## 1. Safety Principles & Mitigation Strategies

MedExplain is designed exclusively as an **educational AI tool**. To prevent misuse, clinical over-reliance, or confusion with medical diagnostic devices, the following checks are enforced:

1.  **Non-Diagnostic Framing**: The UI and backend avoid clinical confirmation words like "confirmed diagnosis", "diagnosis", or "differential". All outcomes are framed as **"Model Possible Condition Predictions"**.
2.  **No Clinical Certainty**: Model output percentages are explicitly labeled as **"Model Probability"** or **"Statistical Score"** to convey to users that they represent mathematical boundaries rather than diagnostic certainty.
3.  **Educational Scope**: Results must not replace evaluation by a qualified healthcare professional.

---

## 2. Standardized Medical Disclaimer

Both the FastAPI backend metadata and the React symptom entry pages display the standardized safety disclaimer prominently:

> *"MedExplain is an educational AI tool and does not provide a medical diagnosis. Results should not replace evaluation by a qualified healthcare professional."*

*   **Symptom Selection Display**: Positioned directly below the "Analyze Symptoms" button in the input panel.
*   **Result Screen Display**: Positioned inside a warning card directly below the primary prediction details.

---

## 3. Emergency Warning Mechanism

For high-risk conditions represented in the dataset (such as *Stroke, Heart attack, Sepsis, Pneumonia, Paralysis (brain hemorrhage), and Meningitis*), a prominent warning box is rendered at the top of the results screen:

> 🚨 **URGENT EMERGENCY WARNING**
>
> MedExplain has detected a possible high-risk condition.
> **Note: This is an educational model prediction, and the system cannot reliably detect all medical emergencies.**
> If you are experiencing severe symptoms such as difficulty breathing, chest pain, sudden weakness, or slurred speech, please seek immediate professional medical care or call emergency services (like 911) immediately.

---

## 4. SHAP Explainability & Medical Causation

SHAP (SHapley Additive exPlanations) values provide mathematical insight into how the machine learning boundary was calculated. They represent *feature importance inside the trained model*.

### Important Safety Constraints
*   **No Medical Causation**: SHAP weights illustrate feature associations in the machine learning calculations. They do **not** prove medical causation and must never be presented to patients as diagnostic evidence.
*   **Safe Explainer Wording**: The UI explainer card is titled `"Model Reasoning & Feature Weight Explainer"`, and describes:
    *   *"These symptoms mathematically supported/opposed this model prediction. These represent statistical weights within the machine learning model and do not constitute clinical evidence or prove medical causation."*
*   **Filtered Views**: Only active symptoms (features containing a value of `1` in the patient vector) are shown. Inactive symptoms are filtered out to prevent confusing users with baseline mathematical biases.
