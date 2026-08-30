import logging
from fastapi import APIRouter, HTTPException, status, Header, Depends, Request
from app.schemas.analysis import AnalyzeRequest, AnalyzeResponse, PredictRequest, PredictResponse, ExplainRequest, ExplainResponse
from app.config import settings
from app.services.ml_service import ml_service
from app.services.gemini_service import gemini_service
from app.limiter import limiter

router = APIRouter(prefix="/api", tags=["Analysis"])
logger = logging.getLogger("app.routes.analysis")

async def verify_bearer_token(authorization: str = Header(None)):
    """
    Dependency to verify the Authorization: Bearer <token> header
    against the configured settings.API_BEARER_TOKEN.
    Bypasses validation if API_BEARER_TOKEN is not configured.
    """
    if settings.API_BEARER_TOKEN:
        if not authorization or not authorization.startswith("Bearer "):
            logger.warning("Rejecting request: Missing or malformed Authorization header.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or malformed Authorization header."
            )
        token = authorization.split(" ")[1]
        if token != settings.API_BEARER_TOKEN:
            logger.warning("Rejecting request: Invalid Bearer token.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Authorization token."
            )

@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze patient symptoms and generate differential diagnosis"
)
@limiter.limit(settings.RATE_LIMIT)
async def analyze_symptoms(payload: AnalyzeRequest, request: Request, _ = Depends(verify_bearer_token)):
    """
    Validates patient symptoms, notes, and triggers the ML + SHAP + Gemini pipeline.
    Returns the unified differential diagnosis explanation.
    """
    # 1. API key configuration check
    if not settings.GEMINI_API_KEY:
        logger.warning("Gemini AI API key is missing. Returning 503 Service Unavailable for analyze endpoint.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini AI service configuration is missing."
        )

    # 2. Check that ML model is loaded
    if not ml_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model or SHAP explanation components are not loaded on server."
        )

    # 3. Request validation for size limits
    if len(payload.symptoms) > 131:
        logger.warning("Rejected analyze request: symptoms list length %d exceeds maximum limit of 131.", len(payload.symptoms))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Symptom list length exceeds maximum limit of 131."
        )
        
    try:
        # Extract symptom names list and deduplicate preserving order
        symptom_names = [s.name for s in payload.symptoms]
        unique_symptom_names = list(dict.fromkeys(symptom_names))
        
        # 4. Trigger ML predictions & SHAP explanations
        predictions_data = ml_service.predict_differentials(unique_symptom_names, top_n=3)
        
        # Format symptoms list with durations for Gemini service
        symptoms_with_durations = [
            {"name": s.name, "duration": s.duration} for s in payload.symptoms
        ]
        
        # 5. Call Gemini service to compile structured differential reasoning
        try:
            analysis_result = await gemini_service.generate_differential_analysis(
                symptoms_with_durations=symptoms_with_durations,
                predictions_data=predictions_data,
                patient_notes=payload.notes
            )
        except Exception as gemini_err:
            logger.warning("Gemini remote call failed (%s). Using synthesized clinical differential fallback.", str(gemini_err))
            analysis_result = gemini_service.synthesize_differential_fallback(
                symptoms_with_durations=symptoms_with_durations,
                predictions_data=predictions_data,
                patient_notes=payload.notes
            )
        
        # Map the predictions SHAP values directly into the Gemini-returned condition dictionaries
        # matching the ConditionDifferential model.
        pred_map = {cond["name"]: cond["shap"] for cond in predictions_data["conditions"]}
        conf_map = {cond["name"]: cond["confidence"] for cond in predictions_data["conditions"]}
        
        for cond in analysis_result["conditions"]:
            cond_name = cond["name"]
            # Set SHAP values calculated from backend ML service
            cond["shap"] = pred_map.get(cond_name, [])
            
            # Ensure confidence is populated from prediction_data
            raw_conf = conf_map.get(cond_name, 0.0)
            cond["confidence"] = raw_conf
            
            # Map confidence probability to low/moderate/high category label
            if raw_conf >= 0.70:
                cond["confidence_label"] = "High"
            elif raw_conf >= 0.40:
                cond["confidence_label"] = "Moderate"
            else:
                cond["confidence_label"] = "Low"
                
        # Sort final conditions by confidence descending to enforce probability order
        analysis_result["conditions"] = sorted(
            analysis_result["conditions"], 
            key=lambda x: x["confidence"], 
            reverse=True
        )
        
        logger.info(
            "Successfully completed differential symptom analysis for %d symptoms.", 
            len(unique_symptom_names)
        )
        return analysis_result
        
    except ValueError as ve:
        logger.warning("Analyze request validation failed: %s", str(ve))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error("Error during differential analysis calculation: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI analysis service encountered an error: {str(e)}"
        )

@router.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict primary disease and alternative diagnoses, explained with SHAP"
)
@limiter.limit(settings.RATE_LIMIT)
async def predict_disease(payload: PredictRequest, request: Request, _ = Depends(verify_bearer_token)):
    """
    Accepts patient symptom list, converts to vector representation,
    predicts the primary disease and alternative probability rankings,
    and returns SHAP supporting and against contributions.
    """
    if not ml_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model or SHAP explanation components are not loaded on server."
        )

    # Request validation for size limits
    if len(payload.symptoms) > 131:
        logger.warning("Rejected prediction request: symptoms list length %d exceeds maximum limit of 131.", len(payload.symptoms))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Symptom list length exceeds maximum limit of 131."
        )
        
    try:
        # Deduplicate symptoms list preserving order
        unique_symptoms = list(dict.fromkeys(payload.symptoms))
        
        result = ml_service.predict_disease(unique_symptoms)
        logger.info("Successfully processed prediction request with %d unique symptoms.", len(unique_symptoms))
        return result
    except ValueError as ve:
        logger.warning("Prediction request validation failed: %s", str(ve))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error("Internal server error during prediction calculation: %s", str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inference or explanation service error."
        )

@router.post(
    "/explain",
    response_model=ExplainResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate safe AI-synthesized differential reasoning explanation using Gemini"
)
@limiter.limit(settings.RATE_LIMIT)
async def explain_prediction(payload: ExplainRequest, request: Request, _ = Depends(verify_bearer_token)):
    """
    Validates prediction payload against the ML prediction pipeline and
    calls Gemini to generate a safe educational explanation of the statistical prediction.
    """
    # 1. API key configuration check
    if not settings.GEMINI_API_KEY:
        logger.warning("Gemini AI API key is missing. Returning 503 Service Unavailable for explain endpoint.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini AI service configuration is missing."
        )

    # 2. Strict validation of submitted data against backend ML prediction pipeline
    try:
        # Deduplicate symptoms list preserving order
        unique_symptoms = list(dict.fromkeys(payload.symptoms))
        expected = ml_service.predict_disease(unique_symptoms)
    except ValueError as ve:
        logger.warning("Explanation validation failed: %s", str(ve))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Prediction validation failed: {str(ve)}"
        )

    # Validate predicted disease name matches expected
    if expected["prediction"]["disease"] != payload.prediction.disease:
        logger.warning(
            "Rejected explanation: disease mismatch. Submitted: %s, Expected: %s",
            payload.prediction.disease, expected["prediction"]["disease"]
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The submitted predicted disease does not match the ML prediction pipeline output."
        )

    # Validate prediction probability matches expected (within float precision margin)
    if abs(expected["prediction"]["confidence"] - payload.prediction.confidence) > 1e-3:
        logger.warning(
            "Rejected explanation: confidence mismatch. Submitted: %f, Expected: %f",
            payload.prediction.confidence, expected["prediction"]["confidence"]
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The submitted confidence score does not match the ML prediction pipeline output."
        )

    # 3. Call Gemini service to compile structured safe explanation
    try:
        explanation = await gemini_service.generate_explanation(payload.model_dump())
        logger.info(
            "Successfully synthesized AI explanation for condition: %s (%d symptoms)",
            payload.prediction.disease, len(unique_symptoms)
        )
        return explanation
    except Exception as gemini_err:
        logger.warning("Gemini remote call failed (%s). Using synthesized explanation fallback.", str(gemini_err))
        return gemini_service.synthesize_explanation_fallback(payload.model_dump())



