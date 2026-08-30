/**
 * Reusable API service for MedExplain AI frontend.
 * Communicates with the FastAPI backend prediction endpoint.
 */

export interface Prediction {
  disease: string;
  confidence: number;
}

export interface Alternative {
  disease: string;
  probability: number;
}

export interface SymptomContribution {
  symptom: string;
  contribution: number;
}

export interface Explanation {
  supporting: SymptomContribution[];
  against: SymptomContribution[];
}

export interface PredictResponse {
  prediction: Prediction;
  alternatives: Alternative[];
  explanation: Explanation;
  disclaimer: string;
}

const API_BASE_URL = typeof window !== "undefined" && (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  )
  ? `http://${window.location.hostname}:8000/api`
  : "/api";

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("API_BEARER_TOKEN") || (window as any).API_BEARER_TOKEN;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function predictDisease(symptoms: string[]): Promise<PredictResponse> {
  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ symptoms }),
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const errData = await response.json();
      errorMessage = errData.detail || errData.error || errorMessage;
    } catch {
      // JSON parsing failed, keep default error message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export interface ExplainResponse {
  summary: string;
  possible_condition_explanation: string;
  symptom_relationship: string;
  alternative_conditions: string;
  safety_guidance: string;
  medical_disclaimer: string;
}

export async function explainPrediction(
  symptoms: string[],
  prediction: Prediction,
  alternatives: Alternative[],
  explanation: Explanation
): Promise<ExplainResponse> {
  const payload = {
    symptoms,
    prediction,
    alternatives,
    explanation
  };

  const response = await fetch(`${API_BASE_URL}/explain`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const errData = await response.json();
      errorMessage = errData.detail || errData.error || errorMessage;
    } catch {
      // JSON parsing failed
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export interface SymptomInput {
  name: string;
  duration: string;
}

export interface ShapImpact {
  symptom: string;
  value: number;
}

export interface ConditionDifferential {
  name: string;
  confidence: number;
  confidence_label: string;
  icd: string;
  prevalence: string;
  typical_duration: string;
  urgency: string;
  specialist: string;
  contagious: boolean;
  key_features: string[];
  matched_symptoms: string[];
  duration_insight: string;
  recommendation: string;
  red_flags_specific: string[];
  shap: ShapImpact[];
}

export interface AnalyzeResponse {
  differentials_note: string;
  conditions: ConditionDifferential[];
  red_flags: string[];
  lifestyle_advice: string[];
  disclaimer: string;
}

export async function analyzeSymptoms(
  symptoms: SymptomInput[],
  notes: string = ""
): Promise<AnalyzeResponse> {
  const payload = {
    symptoms,
    notes: notes || undefined
  };

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const errData = await response.json();
      errorMessage = errData.detail || errData.error || errorMessage;
    } catch {
      // JSON parsing failed
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

