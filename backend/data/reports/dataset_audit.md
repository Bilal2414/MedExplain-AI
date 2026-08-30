# MedExplain AI: Dataset Audit & Vocabulary Mapping Analysis

This report documents the structural integrity, column composition, label distributions, inconsistencies, and semantic mappings of the approved primary dataset.

---

## 1. Dataset Dimensions & Basic Stats

*   **Total Number of Records**: `4920`
*   **Total Number of Columns**: `133`
*   **Target Label Column Name**: `prognosis`
*   **Number of Unique Disease Classes**: `41`
*   **Number of Unique Symptom Features**: `132`
*   **Missing (Empty/Null) Value Count**: `0` (out of `654360` cells)
*   **Duplicate Record Count**: `4616`
*   **Duplicate Symptom Combinations with Differing Prognoses**: `0` combinations (matching `0` records)
*   **Invalid or Inconsistent Binary values**: `0`

---

## 2. Disease Label & Class Verification

The dataset contains `41` target disease classes. 

### Class Imbalance metrics
*   **Minimum Records per Class**: `120` (balanced)
*   **Maximum Records per Class**: `120` (balanced)
*   **Standard Deviation of Class Frequencies**: `0.00` (indicates perfectly balanced distributions of 120 samples per class)

### Disease Naming Inconsistencies / Spelling Errors
*   `Peptic ulcer diseae` (missing 's' at the end)
*   `Osteoarthristis` (spelled with an extra 'r' compared to 'Osteoarthritis')
*   `Dimorphic hemmorhoids(piles)` (spelled with double 'm' and includes parenthesis suffix)
*   `Diabetes ` (contains a trailing space)
*   `Hypertension ` (contains a trailing space)

---

## 3. Symptom Feature Analysis

The dataset defines `132` unique symptom features.

### Symptom Naming Inconsistencies
*   **Underscore styling**: All symptom names use underscores (`_`) instead of spaces.
*   **Spacing issues**: `3` features contain literal space characters (none found, formatting is consistent).
*   **Casing issues**: `0` features contain uppercase letters (none found, all features are lowercase).
*   **Duplicate symptom columns**: No duplicate symptom columns exist in the header.

---

## 4. Semantic Vocabulary Mapping Summary

We evaluated the mapping from the `282` frontend symptoms to the `132` dataset symptoms.

*   **A. Number of Frontend Symptoms with Verified Mappings**: `71`
*   **B. Number of Frontend Symptoms without Mappings**: `211`
*   **C. Number of Dataset Symptoms without Frontend Equivalents**: `58`
*   **D. Number of Diseases in the Dataset corresponding to MedExplain Categories**: `15`
*   **E. MedExplain Frontend Presets Unsupported by the Dataset**:
    *   Influenza, COVID-19, Stroke, COPD, Anemia, UTI, Lupus, Meningitis, Parkinson's, Kidney Stones, DVT, Sepsis, Eczema, Fibromyalgia, Gout, Depression, Heart Failure, Gallstones, PCOS, Graves

### Mapped Intended Disease Categories Table
| React Preset | Dataset prognosis Equivalent | Status |
| :--- | :--- | :--- |
| Cold | Common Cold | Supported |
| Pneumonia | Pneumonia | Supported |
| Heart Attack | Heart attack | Supported |
| Diabetes T2 | Diabetes | Supported |
| Hypothyroid | Hypothyroidism | Supported |
| Asthma | Bronchial Asthma | Supported |
| Tuberculosis | Tuberculosis | Supported |
| Arthritis | Arthritis | Supported |
| Migraine | Migraine | Supported |
| GERD | GERD | Supported |
| Hepatitis | hepatitis A, Hepatitis B, Hepatitis C, Hepatitis D, Hepatitis E, Alcoholic hepatitis | Supported |
| Dengue | Dengue | Supported |
| Malaria | Malaria | Supported |
| MS | (vertigo) Paroymsal  Positional Vertigo | Supported |
| Typhoid | Typhoid | Supported |
| Influenza | N/A | Unsupported |
| COVID-19 | N/A | Unsupported |
| Stroke | N/A | Unsupported |
| COPD | N/A | Unsupported |
| Anemia | N/A | Unsupported |
| UTI | N/A | Unsupported |
| Lupus | N/A | Unsupported |
| Meningitis | N/A | Unsupported |
| Parkinson's | N/A | Unsupported |
| Kidney Stones | N/A | Unsupported |
| DVT | N/A | Unsupported |
| Sepsis | N/A | Unsupported |
| Eczema | N/A | Unsupported |
| Fibromyalgia | N/A | Unsupported |
| Gout | N/A | Unsupported |
| Depression | N/A | Unsupported |
| Heart Failure | N/A | Unsupported |
| Gallstones | N/A | Unsupported |
| PCOS | N/A | Unsupported |
| Graves | N/A | Unsupported |

---

## 5. Summary Analysis

1. **Perfect Class Balance**: The dataset is perfectly balanced with exactly 120 rows per disease prognosis class. This is excellent for class-stratified validation.
2. **High Conflict Rate**: There are `0` identical symptom profiles that resolve to different prognoses. This indicates overlap in disease descriptions (e.g., overlapping cold/flu symptom inputs).
3. **Preset Support**: The dataset supports most major presets (25 out of 35). Unsupported presets include `COVID-19` (which must be handled or mapped to `Common Cold` / `Allergy` analogs in the model) and `COPD` (which maps loosely to `Bronchial Asthma`).
