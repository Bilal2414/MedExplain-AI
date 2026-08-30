import json
import logging
# pyrefly: ignore [missing-import]
import httpx
from app.config import settings

logger = logging.getLogger("app.services.gemini_service")

# List of acute emergency conditions
EMERGENCY_DISEASES = [
    "Stroke",
    "Heart attack",
    "Sepsis",
    "Pneumonia",
    "Paralysis (brain hemorrhage)",
    "Meningitis"
]

class GeminiService:
    def __init__(self):
        self.api_url_base = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        
    def synthesize_explanation_fallback(self, prediction_data: dict) -> dict:
        """
        Synthesizes a rule-based clinical explanation fallback when Gemini API key
        is not configured or encounters remote service errors.
        """
        disease = prediction_data.get("prediction", {}).get("disease", "Unknown Condition")
        confidence = prediction_data.get("prediction", {}).get("confidence", 0.0)
        explanation = prediction_data.get("explanation", {})
        supporting = explanation.get("supporting", [])
        
        top_syms = [s["symptom"].replace("_", " ") for s in supporting[:3]]
        syms_str = ", ".join(top_syms) if top_syms else "the reported symptoms"
        
        is_emergency = any(emergency.lower() in disease.lower() for emergency in EMERGENCY_DISEASES)
        safety = (
            "CRITICAL EMERGENCY WARNING: This condition belongs to a high-risk medical emergency class. "
            "If you or the patient are experiencing severe symptoms (such as chest pain, sudden weakness, or difficulty breathing), "
            "please contact emergency services (like 911) immediately."
            if is_emergency else
            "This assessment is educational and based on statistical probability. Please consult a qualified medical professional for clinical evaluation."
        )
        
        return {
            "summary": f"The statistical classifier calculated a possible condition of {disease} with a model probability of {confidence * 100:.1f}%.",
            "possible_condition_explanation": f"{disease} is a condition with clinical features that mathematically align with {syms_str}.",
            "symptom_relationship": f"The machine learning decision boundary was positively weighted by {syms_str}. These statistical weights represent dataset correlations rather than medical causation.",
            "alternative_conditions": "Alternative conditions are ranked by mathematical likelihood across the trained dataset classes.",
            "safety_guidance": safety,
            "medical_disclaimer": "MedExplain is an educational AI tool and does not provide a medical diagnosis. Results should not replace evaluation by a qualified healthcare professional."
        }

    def synthesize_differential_fallback(
        self, 
        symptoms_with_durations: list[dict], 
        predictions_data: dict, 
        patient_notes: str = None
    ) -> dict:
        """
        Synthesizes structured differential diagnosis fallback when Gemini API key
        is not configured or encounters remote service errors.
        """
        top_conditions = predictions_data.get("conditions", [])
        primary = predictions_data.get("prediction", {}).get("disease", "Unknown Condition")
        primary_conf = predictions_data.get("prediction", {}).get("confidence", 0.0)
        
        conditions_list = []
        for cond in top_conditions:
            cond_name = cond.get("name", "")
            is_emer = any(e.lower() in cond_name.lower() for e in EMERGENCY_DISEASES)
            urgency = "Emergency" if is_emer else ("Urgent" if cond.get("confidence", 0) > 0.6 else "Routine")
            
            matched = [s["name"] for s in symptoms_with_durations]
            
            conditions_list.append({
                "name": cond_name,
                "icd": "R69",
                "prevalence": "Common",
                "typical_duration": "1–2 weeks",
                "urgency": urgency,
                "specialist": "General Practitioner",
                "contagious": False,
                "key_features": matched[:3] if matched else ["Clinical presentation"],
                "matched_symptoms": matched,
                "duration_insight": "Reported duration aligns with typical statistical progression in the dataset.",
                "recommendation": "Consult a licensed healthcare provider for clinical evaluation.",
                "red_flags_specific": ["Severe worsening of symptoms", "Difficulty breathing"]
            })
            
        return {
            "differentials_note": f"Based on the reported symptoms, the model identified {primary} ({primary_conf * 100:.1f}% probability) as the primary candidate among {len(top_conditions)} differential possibilities.",
            "conditions": conditions_list,
            "red_flags": ["Severe chest pain", "Shortness of breath", "Sudden weakness or numbness", "High persistent fever"],
            "lifestyle_advice": ["Rest adequately", "Maintain hydration", "Monitor symptom progression"],
            "disclaimer": "MedExplain is an educational AI tool and does not provide a medical diagnosis. Results should not replace evaluation by a qualified healthcare professional."
        }
        
    async def generate_explanation(self, prediction_data: dict) -> dict:
        """
        Receives predictive and SHAP information from the ML pipeline,
        crafts a structured prompt enforcing strict safety guidelines,
        and requests a schema-validated JSON explanation from Gemini.
        """
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("Gemini API key is not configured.")

        # Extract data parameters
        symptoms = prediction_data.get("symptoms", [])
        disease = prediction_data.get("prediction", {}).get("disease", "Unknown Condition")
        confidence = prediction_data.get("prediction", {}).get("confidence", 0.0)
        alternatives = prediction_data.get("alternatives", [])
        
        explanation = prediction_data.get("explanation", {})
        supporting_shap = explanation.get("supporting", [])
        opposing_shap = explanation.get("against", [])

        # Check if the disease class matches high-risk emergency categories
        is_emergency = any(
            emergency.lower() in disease.lower() 
            for emergency in EMERGENCY_DISEASES
        )

        # Build prompt guidelines
        emergency_instruction = ""
        if is_emergency:
            emergency_instruction = (
                "CRITICAL: The predicted condition belongs to a high-risk medical emergency class. "
                "You MUST prioritize warning the user to seek immediate professional emergency medical care "
                "and contact emergency services (such as 911) immediately. Do not soften this guidance."
            )
        else:
            emergency_instruction = (
                "Provide general, educational guidance on when to seek professional care. "
                "Do not diagnose the patient, and recommend consulting a healthcare professional."
            )

        # Map supporting and opposing symptoms list
        supporting_list = [f"{item['symptom']} (weight: {item['contribution']:.2f})" for item in supporting_shap]
        opposing_list = [f"{item['symptom']} (weight: {item['contribution']:.2f})" for item in opposing_shap]
        alternatives_list = [f"{item['disease']} (probability: {item['probability']:.2f})" for item in alternatives[:3]]

        prompt = f"""
You are an educational AI assistant for MedExplain, a medical machine learning prediction tool.
Your task is to synthesize and explain a machine learning model's prediction of a possible condition.
The model predicted the possible condition "{disease}" with a statistical probability of {confidence * 100:.2f}%.

Patient's reported active symptoms: {", ".join(symptoms)}
Symptom feature weights supporting this prediction: {", ".join(supporting_list) if supporting_list else "None"}
Symptom feature weights opposing this prediction: {", ".join(opposing_list) if opposing_list else "None"}
Top alternative conditions identified by the model: {", ".join(alternatives_list) if alternatives_list else "None"}

Strict Safety Instructions:
1. Do not diagnose the patient. Keep all terminology educational.
2. Do not say that the predicted condition is confirmed. Use phrases like "Possible condition" or "Model prediction".
3. Do not invent symptoms, medical history, or laboratory test results not listed above.
4. Do not recommend specific prescription medications, dosages, or dangerous treatment instructions.
5. Recommend professional medical evaluation for clinical assessment.
6. Clearly distinguish the statistical model's boundary weights from an actual clinical diagnosis.
7. {emergency_instruction}

You MUST return a JSON object with the following fields:
- "summary": A brief, safe, educational summary.
- "possible_condition_explanation": An educational explanation of the predicted possible condition.
- "symptom_relationship": An explanation of how the selected symptoms relate to this possible condition based on the model's weights. Use clear, patient-friendly wording indicating that these represent mathematical correlations inside the model rather than medical causation.
- "alternative_conditions": General educational notes about alternative conditions.
- "safety_guidance": Guidance on when to seek professional care (or immediate emergency services).
- "medical_disclaimer": Standard educational disclaimer stating MedExplain does not provide clinical diagnoses.
"""

        # Enforce JSON output schema
        schema = {
            "type": "OBJECT",
            "properties": {
                "summary": {"type": "STRING"},
                "possible_condition_explanation": {"type": "STRING"},
                "symptom_relationship": {"type": "STRING"},
                "alternative_conditions": {"type": "STRING"},
                "safety_guidance": {"type": "STRING"},
                "medical_disclaimer": {"type": "STRING"}
            },
            "required": [
                "summary",
                "possible_condition_explanation",
                "symptom_relationship",
                "alternative_conditions",
                "safety_guidance",
                "medical_disclaimer"
            ]
        }

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": schema,
                "temperature": 0.2
            }
        }

        url = f"{self.api_url_base}?key={api_key}"
        
        # Make the request with a timeout
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=10.0)
                
                if response.status_code == 429:
                    raise ValueError("Gemini API rate limit exceeded (HTTP 429).")
                elif response.status_code == 403 or response.status_code == 400:
                    raise ValueError(f"Gemini API request validation error (HTTP {response.status_code}).")
                elif response.status_code != 200:
                    raise ValueError(f"Gemini API error (HTTP {response.status_code}).")
                
                res_data = response.json()
                
                # Extract text response from Gemini contents payload structure
                candidates = res_data.get("candidates", [])
                if not candidates:
                    raise ValueError("Empty response candidates returned from Gemini.")
                    
                content_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if not content_text:
                    raise ValueError("Empty explanation text returned from Gemini.")
                
                # Parse explanation text as JSON
                explanation_dict = json.loads(content_text)
                
                # Check for required fields
                for field in schema["required"]:
                    if field not in explanation_dict:
                        raise ValueError(f"Missing required schema field: {field}")
                        
                return explanation_dict
                
            except httpx.TimeoutException:
                logger.error("Gemini API request timed out.")
                raise ValueError("Gemini API request timed out.")
            except httpx.RequestError as re:
                logger.error("Network error connecting to Gemini API: %s", str(re))
                raise ValueError("Gemini API network connection failure.")
            except json.JSONDecodeError:
                logger.error("Failed to parse Gemini output text as JSON.")
                raise ValueError("Malformed response format received from Gemini.")

    async def generate_differential_analysis(
        self, 
        symptoms_with_durations: list[dict], 
        predictions_data: dict, 
        patient_notes: str = None
    ) -> dict:
        """
        Synthesizes the complete differential diagnosis explanation for multiple conditions.
        Enforces AnalyzeResponse JSON schema on Gemini's output.
        """
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("Gemini API key is not configured.")

        # Extract predicted condition names for emergency check and prompting
        top_conditions = predictions_data.get("conditions", [])
        top_names = [cond.get("name", "") for cond in top_conditions]

        # Check if any condition name in the predictions belongs to high-risk emergency categories
        is_emergency = False
        for cond_name in top_names:
            if any(emergency.lower() in cond_name.lower() for emergency in EMERGENCY_DISEASES):
                is_emergency = True
                break

        # Build prompt guidelines
        emergency_instruction = ""
        if is_emergency:
            emergency_instruction = (
                "CRITICAL: At least one of the predicted differential conditions belongs to a high-risk medical emergency class. "
                "You MUST prioritize warning the user to seek immediate professional emergency medical care "
                "and contact emergency services (such as 911) immediately. Do not soften this guidance."
            )
        else:
            emergency_instruction = (
                "Provide general, educational guidance on when to seek professional care. "
                "Do not diagnose the patient, and recommend consulting a healthcare professional."
            )

        # Format symptoms summary
        symptoms_str_list = [f"{item['name']} (duration: {item['duration']})" for item in symptoms_with_durations]
        symptoms_summary = ", ".join(symptoms_str_list)
        
        # Format predictions summary
        conditions_list = []
        for cond in top_conditions:
            shap_details = [f"{item['symptom']} (weight: {item['value']:.4f})" for item in cond.get("shap", [])]
            shap_summary = ", ".join(shap_details) if shap_details else "None"
            conditions_list.append(
                f"- Possible Condition: {cond['name']} (probability: {cond['confidence'] * 100:.2f}%)\n"
                f"  Symptom correlations inside the model: {shap_summary}"
            )
        predictions_summary = "\n".join(conditions_list)
        
        notes_summary = patient_notes if patient_notes else "None provided."

        prompt = f"""
You are an educational AI assistant for MedExplain, a medical machine learning prediction tool.
Your task is to synthesize and explain a machine learning model's differential diagnosis predictions based on active symptoms and their durations.
The model predicted the following differential diagnoses:
{predictions_summary}

Patient's reported symptoms and durations:
{symptoms_summary}

Patient's clinical notes/history:
{notes_summary}

Strict Safety Instructions:
1. Do not diagnose the patient. Keep all terminology educational.
2. Do not say that any predicted condition is confirmed. Use phrases like "Possible condition" or "Model prediction".
3. Do not invent symptoms, medical history, or laboratory test results not listed above.
4. Do not recommend specific prescription medications, dosages, or dangerous treatment instructions.
5. Recommend professional medical evaluation for clinical assessment.
6. Clearly distinguish the statistical model's boundary weights from an actual clinical diagnosis. Explain that the SHAP values represent mathematical correlations inside the model rather than medical causation.
7. {emergency_instruction}

You MUST return a JSON object with the following fields:
- "differentials_note": An overview summary explaining the differential diagnoses and general findings.
- "conditions": A list of dicts, one for each condition in the predictions list exactly. Each dict MUST contain:
  - "name": Match the condition name exactly (must be one of: {', '.join(top_names)}).
  - "icd": The standard ICD-10 clinical diagnosis code.
  - "prevalence": Prevalence summary, e.g. "Common", "Rare".
  - "typical_duration": Typical duration of the illness, e.g. "1–2 weeks".
  - "urgency": Urgency tier: "Routine", "Urgent", or "Emergency".
  - "specialist": Clinical specialist to consult, e.g. "Pulmonologist".
  - "contagious": true or false (boolean).
  - "key_features": List of typical key features or presentations.
  - "matched_symptoms": List of user symptoms that match this condition.
  - "duration_insight": AI explanation of how the user's reported symptom duration aligns (or does not align) with typical presentations of this condition.
  - "recommendation": Suggested educational next steps.
  - "red_flags_specific": List of condition-specific warning signs.
- "red_flags": List of general emergency warning signs.
- "lifestyle_advice": General home care or lifestyle suggestions.
- "disclaimer": Standard educational disclaimer.
"""

        # Enforce JSON output schema
        schema = {
            "type": "OBJECT",
            "properties": {
                "differentials_note": {"type": "STRING"},
                "conditions": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "name": {"type": "STRING"},
                            "icd": {"type": "STRING"},
                            "prevalence": {"type": "STRING"},
                            "typical_duration": {"type": "STRING"},
                            "urgency": {"type": "STRING"},
                            "specialist": {"type": "STRING"},
                            "contagious": {"type": "BOOLEAN"},
                            "key_features": {
                                "type": "ARRAY",
                                "items": {"type": "STRING"}
                            },
                            "matched_symptoms": {
                                "type": "ARRAY",
                                "items": {"type": "STRING"}
                            },
                            "duration_insight": {"type": "STRING"},
                            "recommendation": {"type": "STRING"},
                            "red_flags_specific": {
                                "type": "ARRAY",
                                "items": {"type": "STRING"}
                            }
                        },
                        "required": [
                            "name", "icd", "prevalence", "typical_duration", 
                            "urgency", "specialist", "contagious", "key_features", 
                            "matched_symptoms", "duration_insight", "recommendation", 
                            "red_flags_specific"
                        ]
                    }
                },
                "red_flags": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"}
                },
                "lifestyle_advice": {
                    "type": "ARRAY",
                    "items": {"type": "STRING"}
                },
                "disclaimer": {"type": "STRING"}
            },
            "required": [
                "differentials_note",
                "conditions",
                "red_flags",
                "lifestyle_advice",
                "disclaimer"
            ]
        }

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseSchema": schema,
                "temperature": 0.2
            }
        }

        url = f"{self.api_url_base}?key={api_key}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=12.0)
                
                if response.status_code == 429:
                    raise ValueError("Gemini API rate limit exceeded (HTTP 429).")
                elif response.status_code in (400, 403):
                    raise ValueError(f"Gemini API request validation error (HTTP {response.status_code}).")
                elif response.status_code != 200:
                    raise ValueError(f"Gemini API error (HTTP {response.status_code}).")
                
                res_data = response.json()
                
                candidates = res_data.get("candidates", [])
                if not candidates:
                    raise ValueError("Empty response candidates returned from Gemini.")
                    
                content_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                if not content_text:
                    raise ValueError("Empty explanation text returned from Gemini.")
                
                explanation_dict = json.loads(content_text)
                
                # Check for top-level required fields
                for field in schema["required"]:
                    if field not in explanation_dict:
                        raise ValueError(f"Missing required schema field: {field}")
                        
                # Perform basic schema check on items in the conditions list
                for cond in explanation_dict["conditions"]:
                    for field in schema["properties"]["conditions"]["items"]["required"]:
                        if field not in cond:
                            raise ValueError(f"Missing required condition schema field: {field}")
                            
                return explanation_dict
                
            except httpx.TimeoutException:
                logger.error("Gemini API request timed out.")
                raise ValueError("Gemini API request timed out.")
            except httpx.RequestError as re:
                logger.error("Network error connecting to Gemini API: %s", str(re))
                raise ValueError("Gemini API network connection failure.")
            except json.JSONDecodeError:
                logger.error("Failed to parse Gemini output text as JSON.")
                raise ValueError("Malformed response format received from Gemini.")

# Instantiate GeminiService singleton
gemini_service = GeminiService()
