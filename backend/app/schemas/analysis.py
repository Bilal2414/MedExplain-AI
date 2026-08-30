from pydantic import BaseModel, Field
from typing import List, Optional

# Request Schemas
class SymptomInput(BaseModel):
    name: str = Field(..., description="The name of the symptom selected, e.g., 'Fever'", min_length=1)
    duration: str = Field(..., description="The selected duration tier, e.g., '1–3 days'")

class AnalyzeRequest(BaseModel):
    symptoms: List[SymptomInput] = Field(..., description="List of patient-selected symptoms and their durations", min_items=1)
    notes: Optional[str] = Field(None, description="Optional free-form clinical notes, medical history, age, etc.")

# Response Schemas (for actual analysis returns)
class ShapImpact(BaseModel):
    symptom: str = Field(..., description="Symptom name contributing to the prediction")
    value: float = Field(..., description="SHAP feature attribution value (positive or negative impact)")

class ConditionDifferential(BaseModel):
    name: str = Field(..., description="Name of the predicted medical condition")
    confidence: float = Field(..., description="ML model confidence score/probability (0.0 to 1.0)")
    confidence_label: str = Field(..., description="Confidence category label, e.g., 'High', 'Moderate', 'Low'")
    icd: str = Field(..., description="ICD-10 clinical diagnosis code")
    prevalence: str = Field(..., description="Disease prevalence summary, e.g., 'Common', 'Rare'")
    typical_duration: str = Field(..., description="Typical duration of the illness, e.g., '1-2 weeks'")
    urgency: str = Field(..., description="Medical urgency tier: 'Routine', 'Urgent', or 'Emergency'")
    specialist: str = Field(..., description="Primary clinical specialist to consult")
    contagious: bool = Field(..., description="Whether the condition is infectious/contagious")
    key_features: List[str] = Field(default_factory=list, description="Key features or classic presentations")
    matched_symptoms: List[str] = Field(default_factory=list, description="List of user symptoms that match this condition")
    duration_insight: Optional[str] = Field(None, description="Gemini-generated explanation of the symptom duration alignment")
    recommendation: Optional[str] = Field(None, description="Specific clinical recommendation or next steps")
    red_flags_specific: Optional[List[str]] = Field(None, description="Condition-specific warnings/red flags")
    shap: List[ShapImpact] = Field(default_factory=list, description="SHAP contribution values for this condition's prediction")

class AnalyzeResponse(BaseModel):
    differentials_note: str = Field(..., description="Overview summary explaining the differential diagnoses")
    conditions: List[ConditionDifferential] = Field(..., description="List of differential diagnoses sorted by probability")
    red_flags: List[str] = Field(default_factory=list, description="General emergency warning signs for these symptoms")
    lifestyle_advice: List[str] = Field(default_factory=list, description="General health, home care, and lifestyle suggestions")
    disclaimer: str = Field(..., description="Standard medical liability disclaimer")

# Predict API Schemas
class PredictRequest(BaseModel):
    symptoms: List[str] = Field(..., description="List of patient-selected symptom names")

class PredictionDetail(BaseModel):
    disease: str = Field(..., description="Name of the predicted disease")
    confidence: float = Field(..., description="Confidence probability (0.0 to 1.0)")

class AlternativeDetail(BaseModel):
    disease: str = Field(..., description="Name of the alternative disease")
    probability: float = Field(..., description="Probability score for this alternative")

class SymptomContribution(BaseModel):
    symptom: str = Field(..., description="Symptom feature name")
    contribution: float = Field(..., description="SHAP attribution value")

class ExplanationDetail(BaseModel):
    supporting: List[SymptomContribution] = Field(default_factory=list, description="Active symptoms supporting the prediction")
    against: List[SymptomContribution] = Field(default_factory=list, description="Active symptoms working against the prediction")

class PredictResponse(BaseModel):
    prediction: PredictionDetail = Field(..., description="The primary disease prediction details")
    alternatives: List[AlternativeDetail] = Field(default_factory=list, description="List of alternative diseases and their probabilities")
    explanation: ExplanationDetail = Field(..., description="Breakdown of supporting and opposing symptoms")
    disclaimer: str = Field(..., description="Medical safety disclaimer")

# Gemini Explain API Schemas
class ExplainRequest(BaseModel):
    symptoms: List[str] = Field(..., description="List of patient-selected symptom names")
    prediction: PredictionDetail = Field(..., description="The primary disease prediction details")
    alternatives: List[AlternativeDetail] = Field(default_factory=list, description="List of alternative diseases and their probabilities")
    explanation: ExplanationDetail = Field(..., description="Breakdown of supporting and opposing symptoms")

class ExplainResponse(BaseModel):
    summary: str = Field(..., description="A brief, safe, educational summary.")
    possible_condition_explanation: str = Field(..., description="An educational explanation of the predicted possible condition.")
    symptom_relationship: str = Field(..., description="An explanation of how the selected symptoms relate to this possible condition based on the model's weights.")
    alternative_conditions: str = Field(..., description="General educational notes about alternative conditions.")
    safety_guidance: str = Field(..., description="Guidance on when to seek professional care.")
    medical_disclaimer: str = Field(..., description="Standard educational disclaimer.")


