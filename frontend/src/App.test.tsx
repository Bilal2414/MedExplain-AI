import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import App from "./App";
import { predictDisease, explainPrediction, analyzeSymptoms } from "./services/api";

// Mock the api service module
vi.mock("./services/api", () => ({
  predictDisease: vi.fn(),
  explainPrediction: vi.fn(),
  analyzeSymptoms: vi.fn(),
}));

const mockPredictResponse = {
  prediction: {
    disease: "Allergy",
    confidence: 0.8637,
  },
  alternatives: [
    { disease: "Common Cold", probability: 0.05 },
    { disease: "Pneumonia", probability: 0.02 },
  ],
  explanation: {
    supporting: [
      { symptom: "shivering", contribution: 1.8744 },
    ],
    against: [],
  },
  disclaimer: "MedExplain is an educational AI tool and does not provide a medical diagnosis. Results should not replace evaluation by a qualified healthcare professional.",
};

const mockExplainResponse = {
  summary: "Mock AI educational summary of Allergy.",
  possible_condition_explanation: "Mock AI detailed possible condition explanation.",
  symptom_relationship: "Mock AI symptom relationship weights explanation.",
  alternative_conditions: "Mock AI alternative possible conditions notes.",
  safety_guidance: "Mock AI safety guidance warning.",
  medical_disclaimer: "Mock AI educational disclaimer statement.",
};

describe("MedExplain Frontend Integration & Safety Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should show error validation when analyzing with empty symptoms", async () => {
    render(<App />);
    
    const analyzeBtn = screen.getAllByText("🔬 Analyze Symptoms")[0];
    fireEvent.click(analyzeBtn);
    
    const errorMsg = await screen.findByText("Please select at least one symptom to analyze.");
    expect(errorMsg).toBeDefined();
    expect(predictDisease).not.toHaveBeenCalled();
  });

  it("should display loading state for prediction while waiting for API response", async () => {
    (predictDisease as any).mockReturnValue(new Promise(() => {}));
    
    render(<App />);
    
    const coughBtn = screen.getAllByText("Cough")[0];
    fireEvent.click(coughBtn);
    
    const analyzeBtn = screen.getAllByText("🔬 Analyze Symptoms")[0];
    fireEvent.click(analyzeBtn);
    
    expect(screen.getByText("🔬 Querying classifier...")).toBeDefined();
  });

  it("should render ML predictions and trigger Gemini explanation loading card", async () => {
    (predictDisease as any).mockResolvedValue(mockPredictResponse);
    // Delay the explain prediction promise to test loading card visibility
    (explainPrediction as any).mockReturnValue(new Promise(() => {}));
    
    render(<App />);
    
    const coughBtn = screen.getAllByText("Cough")[0];
    fireEvent.click(coughBtn);
    
    const analyzeBtn = screen.getAllByText("🔬 Analyze Symptoms")[0];
    fireEvent.click(analyzeBtn);
    
    // ML results load
    await waitFor(() => {
      expect(screen.getByText("Allergy")).toBeDefined();
    });
    
    // AI Explanation section displays the loading spinner card
    expect(screen.getByText("Generating AI Educational Explanation...")).toBeDefined();
  });

  it("should render both predictions and successful Gemini explanation", async () => {
    (predictDisease as any).mockResolvedValue(mockPredictResponse);
    (explainPrediction as any).mockResolvedValue(mockExplainResponse);
    
    render(<App />);
    
    const coughBtn = screen.getAllByText("Cough")[0];
    fireEvent.click(coughBtn);
    
    const analyzeBtn = screen.getAllByText("🔬 Analyze Symptoms")[0];
    fireEvent.click(analyzeBtn);
    
    // Wait for the AI explanation details to load on page
    await waitFor(() => {
      expect(screen.getByText("Mock AI educational summary of Allergy.")).toBeDefined();
    });
    
    // Check key AI section headings and descriptions
    expect(screen.getByText("AI-Generated Educational Explanation")).toBeDefined();
    expect(screen.getByText("Possible Condition Explanation:")).toBeDefined();
    expect(screen.getByText("Mock AI detailed possible condition explanation.")).toBeDefined();
    expect(screen.getByText("Mock AI symptom relationship weights explanation.")).toBeDefined();
    
    // Ensure safety disclaimer remains visible
    expect(screen.getAllByText(/MedExplain is an educational AI tool/i).length).toBeGreaterThan(0);
    
    // Safe wording validation: Ensure diagnostic words like 'Diagnosis:' or 'You have' are not used in headings
    expect(screen.queryByText("Diagnosis:")).toBeNull();
    expect(screen.queryByText(/You have Allergy/i)).toBeNull();
  });

  it("should gracefully handle Gemini failure and render correct fallback banner", async () => {
    (predictDisease as any).mockResolvedValue(mockPredictResponse);
    (explainPrediction as any).mockRejectedValue(new Error("Gemini API key is not configured."));
    
    render(<App />);
    
    const coughBtn = screen.getAllByText("Cough")[0];
    fireEvent.click(coughBtn);
    
    const analyzeBtn = screen.getAllByText("🔬 Analyze Symptoms")[0];
    fireEvent.click(analyzeBtn);
    
    // Wait for ML results to render
    await waitFor(() => {
      expect(screen.getByText("Allergy")).toBeDefined();
    });
    
    // Verify explanation fallback warning box is visible
    await waitFor(() => {
      expect(screen.getByText(/AI-Generated Explanation Unavailable/i)).toBeDefined();
      expect(screen.getByText(/AI explanation is temporarily unavailable. The model prediction/i)).toBeDefined();
    });
    
    // Verify that primary ML predictions and alternative condition bars are still fully visible
    expect(screen.getByText("Allergy")).toBeDefined();
    expect(screen.getByText("86% Model Probability")).toBeDefined();
    expect(screen.getByText("Common Cold")).toBeDefined();
  });

  it("should display a prominent emergency warning banner when predicted condition is Stroke", async () => {
    const emergencyResponse = mockPredictResponse;
    emergencyResponse.prediction.disease = "Stroke";
    
    (predictDisease as any).mockResolvedValue(emergencyResponse);
    (explainPrediction as any).mockResolvedValue(mockExplainResponse);
    
    render(<App />);
    
    const coughBtn = screen.getAllByText("Cough")[0];
    fireEvent.click(coughBtn);
    
    const analyzeBtn = screen.getAllByText("🔬 Analyze Symptoms")[0];
    fireEvent.click(analyzeBtn);
    
    await waitFor(() => {
      expect(screen.getByText("URGENT EMERGENCY WARNING")).toBeDefined();
      expect(screen.getByText(/difficulty breathing, chest pain, sudden weakness, or slurred speech/i)).toBeDefined();
    });
  });

  it("should render unified differential analysis when pipeline mode is set to unified", async () => {
    const mockAnalyzeResponse = {
      differentials_note: "Mock unified AI differentials note.",
      conditions: [
        {
          name: "Allergy",
          confidence: 0.86,
          confidence_label: "High",
          icd: "J30.9",
          prevalence: "Common",
          typical_duration: "Chronic",
          urgency: "Routine",
          specialist: "Allergist",
          contagious: false,
          key_features: ["sneezing", "itchy eyes"],
          matched_symptoms: ["shivering"],
          duration_insight: "Duration aligns with allergen exposure.",
          recommendation: "Avoid allergens.",
          red_flags_specific: [],
          shap: [{ symptom: "shivering", value: 1.87 }]
        }
      ],
      red_flags: ["Difficulty breathing"],
      lifestyle_advice: ["Avoid allergens"],
      disclaimer: "Educational AI tool disclaimer."
    };
    
    (analyzeSymptoms as any).mockResolvedValue(mockAnalyzeResponse);
    
    render(<App />);
    
    // Switch to unified pipeline
    const unifiedBtn = screen.getByText("🔬 Unified Differential (/analyze)");
    fireEvent.click(unifiedBtn);
    
    const coughBtn = screen.getAllByText("Cough")[0];
    fireEvent.click(coughBtn);
    
    const analyzeBtn = screen.getAllByText("🔬 Analyze Symptoms")[0];
    fireEvent.click(analyzeBtn);
    
    await waitFor(() => {
      expect(screen.getByText("Mock unified AI differentials note.")).toBeDefined();
      expect(screen.getByText("Allergy")).toBeDefined();
      expect(screen.getByText("Routine")).toBeDefined();
    });
  });
});
