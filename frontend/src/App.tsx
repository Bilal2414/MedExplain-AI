import { useState, useRef, useEffect } from "react";
import { predictDisease, explainPrediction, analyzeSymptoms } from "./services/api";
import type { PredictResponse, ExplainResponse, AnalyzeResponse } from "./services/api";

/* ═══════════════════════════════════════════════════
   DATA & CATEGORIES (131 Dataset Features)
   ═══════════════════════════════════════════════════ */
const SYMPTOM_CATS: Record<string, string[]> = {
  "🫁 Respiratory": [
    "Cough",
    "Breathlessness",
    "Phlegm",
    "Throat Irritation",
    "Runny Nose",
    "Congestion",
    "Sinus Pressure",
    "Continuous Sneezing",
    "Blood In Sputum",
    "Mucoid Sputum",
    "Rusty Sputum"
  ],
  "🌡️ Systemic & Fever": [
    "High Fever",
    "Mild Fever",
    "Chills",
    "Shivering",
    "Fatigue",
    "Malaise",
    "Sweating",
    "Weight Loss",
    "Weight Gain",
    "Cold Hands And Feets",
    "Lethargy",
    "Dehydration",
    "Toxic Look (typhos)"
  ],
  "🧠 Neurological & Mood": [
    "Headache",
    "Dizziness",
    "Spinning Movements",
    "Loss Of Balance",
    "Unsteadiness",
    "Weakness Of One Body Side",
    "Weakness In Limbs",
    "Altered Sensorium",
    "Slurred Speech",
    "Lack Of Concentration",
    "Visual Disturbances",
    "Blurred And Distorted Vision",
    "Anxiety",
    "Depression",
    "Mood Swings",
    "Irritability",
    "Restlessness",
    "Coma"
  ],
  "💊 Gastrointestinal & Liver": [
    "Nausea",
    "Vomiting",
    "Diarrhoea",
    "Constipation",
    "Abdominal Pain",
    "Stomach Pain",
    "Belly Pain",
    "Loss Of Appetite",
    "Acidity",
    "Indigestion",
    "Passage Of Gases",
    "Distention Of Abdomen",
    "Swelling Of Stomach",
    "Ulcers On Tongue",
    "Stomach Bleeding",
    "Pain During Bowel Movements",
    "Pain In Anal Region",
    "Bloody Stool",
    "Irritation In Anus",
    "Acute Liver Failure"
  ],
  "❤️ Cardiovascular & Vascular": [
    "Chest Pain",
    "Palpitations",
    "Fast Heart Rate",
    "Swollen Legs",
    "Swollen Blood Vessels",
    "Prominent Veins On Calf",
    "Fluid Overload"
  ],
  "🦴 Musculoskeletal": [
    "Joint Pain",
    "Knee Pain",
    "Hip Joint Pain",
    "Neck Pain",
    "Back Pain",
    "Muscle Pain",
    "Muscle Weakness",
    "Muscle Wasting",
    "Cramps",
    "Stiff Neck",
    "Swelling Joints",
    "Movement Stiffness",
    "Painful Walking"
  ],
  "🌿 Skin & Nails": [
    "Itching",
    "Internal Itching",
    "Skin Rash",
    "Nodal Skin Eruptions",
    "Dischromic Patches",
    "Red Spots Over Body",
    "Pus Filled Pimples",
    "Blackheads",
    "Scurring",
    "Skin Peeling",
    "Silver Like Dusting",
    "Blister",
    "Red Sore Around Nose",
    "Yellow Crust Ooze",
    "Bruising",
    "Small Dents In Nails",
    "Inflammatory Nails",
    "Brittle Nails"
  ],
  "👁️ Eyes, ENT & Face": [
    "Redness Of Eyes",
    "Watering From Eyes",
    "Sunken Eyes",
    "Pain Behind The Eyes",
    "Yellowing Of Eyes",
    "Yellowish Skin",
    "Loss Of Smell",
    "Patches In Throat",
    "Drying And Tingling Lips",
    "Puffy Face And Eyes",
    "Enlarged Thyroid",
    "Swelled Lymph Nodes"
  ],
  "🚻 Urinary & Renal": [
    "Burning Micturition",
    "Spotting Urination",
    "Dark Urine",
    "Yellow Urine",
    "Bladder Discomfort",
    "Foul Smell Of Urine",
    "Continuous Feel Of Urine",
    "Polyuria"
  ],
  "🧬 Endocrine & Metabolic": [
    "Excessive Hunger",
    "Increased Appetite",
    "Irregular Sugar Level",
    "Obesity",
    "Abnormal Menstruation",
    "Swollen Extremeties"
  ],
  "🩸 Clinical History & Exposures": [
    "Family History",
    "History Of Alcohol Consumption",
    "Receiving Blood Transfusion",
    "Receiving Unsterile Injections",
    "Extra Marital Contacts"
  ]
};

const DURATION_OPTIONS = [
  "< 1 day",
  "1–3 days",
  "4–7 days",
  "1–2 weeks",
  "2–4 weeks",
  "1–3 months",
  "3–6 months",
  "> 6 months",
  "Chronic / recurring"
];

const PRESETS: Record<string, string[]> = {
  "🤧 Common Cold": ["Runny Nose", "Continuous Sneezing", "Throat Irritation", "Cough", "High Fever", "Sinus Pressure", "Congestion", "Phlegm", "Loss Of Smell", "Headache"],
  "🫁 Pneumonia": ["High Fever", "Breathlessness", "Chest Pain", "Cough", "Phlegm", "Rusty Sputum", "Fast Heart Rate", "Sweating", "Chills"],
  "🫀 Heart Attack": ["Chest Pain", "Breathlessness", "Sweating", "Vomiting"],
  "💉 Diabetes": ["Fatigue", "Weight Loss", "Restlessness", "Lethargy", "Irregular Sugar Level", "Blurred And Distorted Vision", "Obesity", "Excessive Hunger", "Polyuria"],
  "🦋 Hypothyroidism": ["Fatigue", "Weight Gain", "Cold Hands And Feets", "Mood Swings", "Lethargy", "Dizziness", "Puffy Face And Eyes", "Enlarged Thyroid", "Brittle Nails", "Swollen Extremeties", "Depression"],
  "⚡ Hyperthyroidism": ["Fatigue", "Mood Swings", "Weight Loss", "Restlessness", "Sweating", "Diarrhoea", "Fast Heart Rate", "Excessive Hunger", "Muscle Weakness", "Irritability"],
  "🌬️ Bronchial Asthma": ["Breathlessness", "Cough", "High Fever", "Mucoid Sputum", "Fatigue", "Family History"],
  "🦠 Tuberculosis": ["Cough", "High Fever", "Breathlessness", "Sweating", "Weight Loss", "Blood In Sputum", "Chest Pain", "Swelled Lymph Nodes", "Phlegm"],
  "🧬 Arthritis": ["Muscle Weakness", "Stiff Neck", "Swelling Joints", "Movement Stiffness", "Painful Walking"],
  "🦴 Osteoarthritis": ["Joint Pain", "Neck Pain", "Knee Pain", "Hip Joint Pain", "Swelling Joints", "Painful Walking"],
  "🧠 Migraine": ["Headache", "Acidity", "Indigestion", "Blurred And Distorted Vision", "Visual Disturbances", "Excessive Hunger", "Stiff Neck", "Depression"],
  "💊 GERD": ["Acidity", "Ulcers On Tongue", "Stomach Pain", "Cough", "Chest Pain", "Vomiting"],
  "🦟 Malaria": ["High Fever", "Chills", "Sweating", "Headache", "Nausea", "Vomiting", "Diarrhoea", "Muscle Pain"],
  "🦟 Dengue": ["Skin Rash", "Chills", "Joint Pain", "High Fever", "Headache", "Nausea", "Vomiting", "Pain Behind The Eyes", "Back Pain", "Muscle Pain", "Red Spots Over Body"],
  "🦠 Typhoid": ["High Fever", "Chills", "Headache", "Nausea", "Vomiting", "Constipation", "Abdominal Pain", "Diarrhoea", "Toxic Look (typhos)", "Belly Pain"],
  "🦠 Chicken Pox": ["Skin Rash", "Itching", "High Fever", "Mild Fever", "Headache", "Loss Of Appetite", "Swelled Lymph Nodes", "Malaise", "Red Spots Over Body"],
  "🧠 Paralysis (Brain Hemorrhage)": ["Headache", "Vomiting", "Weakness Of One Body Side", "Altered Sensorium"],
  "🩸 Hypertension": ["Headache", "Chest Pain", "Dizziness", "Loss Of Balance", "Lack Of Concentration"],
  "🦠 Hepatitis A": ["Joint Pain", "Vomiting", "Yellowish Skin", "Dark Urine", "Nausea", "Loss Of Appetite", "Abdominal Pain", "Diarrhoea", "Mild Fever", "Yellowing Of Eyes", "Muscle Pain"],
  "🦠 Hepatitis B": ["Yellowish Skin", "Dark Urine", "Abdominal Pain", "Yellowing Of Eyes", "Loss Of Appetite", "Fatigue", "Malaise", "Receiving Blood Transfusion"],
  "🦠 Hepatitis C": ["Fatigue", "Yellowish Skin", "Nausea", "Loss Of Appetite", "Yellowing Of Eyes", "Family History"],
  "🦠 Hepatitis D": ["Joint Pain", "Vomiting", "Fatigue", "Yellowish Skin", "Dark Urine", "Nausea", "Loss Of Appetite", "Abdominal Pain", "Yellowing Of Eyes"],
  "🦠 Hepatitis E": ["Joint Pain", "Vomiting", "Fatigue", "High Fever", "Yellowish Skin", "Dark Urine", "Nausea", "Loss Of Appetite", "Abdominal Pain", "Yellowing Of Eyes"],
  "🍺 Alcoholic Hepatitis": ["Vomiting", "Yellowish Skin", "Abdominal Pain", "Swelling Of Stomach", "Distention Of Abdomen", "History Of Alcohol Consumption", "Fluid Overload"],
  "🌿 Psoriasis": ["Skin Rash", "Joint Pain", "Skin Peeling", "Silver Like Dusting", "Small Dents In Nails", "Inflammatory Nails"],
  "🧼 Acne": ["Skin Rash", "Pus Filled Pimples", "Blackheads", "Scurring"],
  "🚻 Urinary Tract Infection": ["Burning Micturition", "Bladder Discomfort", "Foul Smell Of Urine", "Continuous Feel Of Urine"],
  "🌀 Vertigo (BPPV)": ["Spinning Movements", "Loss Of Balance", "Unsteadiness", "Headache", "Nausea", "Vomiting"],
  "🩻 Peptic Ulcer Disease": ["Abdominal Pain", "Indigestion", "Loss Of Appetite", "Passage Of Gases", "Internal Itching", "Vomiting"],
  "🩸 Gastroenteritis": ["Vomiting", "Sunken Eyes", "Dehydration", "Diarrhoea"],
  "🦵 Varicose Veins": ["Swollen Legs", "Swollen Blood Vessels", "Prominent Veins On Calf", "Cramps", "Bruising", "Fatigue"],
  "🦠 Allergy": ["Continuous Sneezing", "Shivering", "Chills", "Watering From Eyes"],
  "🍄 Fungal Infection": ["Itching", "Skin Rash", "Nodal Skin Eruptions", "Dischromic Patches"],
  "⚠️ Drug Reaction": ["Itching", "Skin Rash", "Stomach Pain", "Burning Micturition", "Spotting Urination"],
  "🟡 Chronic Cholestasis": ["Itching", "Vomiting", "Yellowish Skin", "Nausea", "Loss Of Appetite", "Abdominal Pain", "Yellowing Of Eyes"],
  "🟡 Jaundice": ["Itching", "Vomiting", "Fatigue", "Weight Loss", "High Fever", "Yellowish Skin", "Dark Urine", "Abdominal Pain"],
  "🩹 Impetigo": ["Skin Rash", "High Fever", "Blister", "Red Sore Around Nose", "Yellow Crust Ooze"],
  "🦴 Cervical Spondylosis": ["Back Pain", "Weakness In Limbs", "Neck Pain", "Dizziness", "Loss Of Balance"],
  "🩸 Hypoglycemia": ["Vomiting", "Fatigue", "Anxiety", "Sweating", "Headache", "Nausea", "Blurred And Distorted Vision", "Excessive Hunger", "Drying And Tingling Lips", "Slurred Speech", "Palpitations"],
  "🩸 Dimorphic Hemorrhoids (Piles)": ["Constipation", "Pain During Bowel Movements", "Pain In Anal Region", "Bloody Stool", "Irritation In Anus"],
  "🦠 AIDS": ["Muscle Wasting", "Patches In Throat", "High Fever", "Extra Marital Contacts"],
};

const EMERGENCY_DISEASES = [
  "Stroke",
  "Heart attack",
  "Sepsis",
  "Pneumonia",
  "Paralysis (brain hemorrhage)",
  "Meningitis",
  "Tuberculosis",
  "Acute liver failure"
];

function useWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

interface SelectedSymptom {
  name: string;
  duration: string;
}

export default function App() {
  const width = useWidth();
  const isMobile = width < 900;

  const [symptoms, setSymptoms] = useState<SelectedSymptom[]>([]);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [pipelineMode, setPipelineMode] = useState<"split" | "unified">("split");
  const [unifiedResult, setUnifiedResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [explanationLoading, setExplanationLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [explanationError, setExplanationError] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [durPicker, setDurPicker] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>(Object.keys(SYMPTOM_CATS)[0]);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({
    [Object.keys(SYMPTOM_CATS)[0]]: true
  });
  const [showPresetsModal, setShowPresetsModal] = useState<boolean>(false);

  const resultsRef = useRef<HTMLDivElement>(null);

  const hasSym = (n: string) => symptoms.some(s => s.name === n);
  const getDur = (n: string) => symptoms.find(s => s.name === n)?.duration || "";

  const toggleSym = (n: string) => {
    if (hasSym(n)) {
      setSymptoms(p => p.filter(s => s.name !== n));
      if (durPicker === n) setDurPicker(null);
    } else {
      setSymptoms(p => [...p, { name: n, duration: "" }]);
      setDurPicker(n);
    }
  };

  const setDur = (n: string, d: string) => {
    setSymptoms(p => p.map(s => s.name === n ? { ...s, duration: d } : s));
    setDurPicker(null);
  };

  const clearAllSymptoms = () => {
    setSymptoms([]);
    setDurPicker(null);
  };

  const toggleCatAccordion = (cat: string) => {
    setActiveCat(cat);
    setExpandedCats(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const applyPreset = (presetName: string, syms: string[]) => {
    setSymptoms(syms.map(n => ({ name: n, duration: "1–3 days" })));
    setResult(null);
    setUnifiedResult(null);
    setNotes(`Selected clinical preset profile for ${presetName}.`);
    setSidebarOpen(false);
    setShowPresetsModal(false);
    setDurPicker(null);
  };

  const analyze = async () => {
    if (!symptoms.length) {
      setError("Please select at least one symptom to analyze.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setExplanation(null);
    setUnifiedResult(null);
    setExplanationError("");

    try {
      const activeSymptomNames = symptoms.map(s => s.name);

      if (pipelineMode === "unified") {
        const symptomsPayload = symptoms.map(s => ({
          name: s.name,
          duration: s.duration || "1–3 days"
        }));

        const data = await analyzeSymptoms(symptomsPayload, notes);
        setUnifiedResult(data);
        if (isMobile) setSidebarOpen(false);

        setTimeout(() => {
          if (resultsRef.current && typeof resultsRef.current.scrollIntoView === "function") {
            resultsRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);
      } else {
        const data = await predictDisease(activeSymptomNames);
        setResult(data);
        if (isMobile) setSidebarOpen(false);

        setTimeout(() => {
          if (resultsRef.current && typeof resultsRef.current.scrollIntoView === "function") {
            resultsRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 100);

        // Trigger Gemini AI explanation layer
        setExplanationLoading(true);
        try {
          const explainData = await explainPrediction(
            activeSymptomNames,
            data.prediction,
            data.alternatives,
            data.explanation
          );
          setExplanation(explainData);
        } catch {
          setExplanationError(
            "AI explanation is temporarily unavailable. The model prediction and SHAP explanation are still available."
          );
        } finally {
          setExplanationLoading(false);
        }
      }
    } catch (e: any) {
      if (e.message?.includes("Failed to fetch") || e.message?.includes("NetworkError")) {
        setError("Network error: Cannot reach the MedExplain AI Backend. Please check your internet connection or verify the backend service status.");
      } else {
        setError(`❌ ${e.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetAnalysis = () => {
    setResult(null);
    setExplanation(null);
    setUnifiedResult(null);
    setSymptoms([]);
    setNotes("");
    setError("");
    setExplanationError("");
    setSearch("");
    setDurPicker(null);
  };

  const isEmergencyCondition = (disease: string) => {
    return EMERGENCY_DISEASES.some(emergency =>
      disease.toLowerCase().includes(emergency.toLowerCase())
    );
  };

  const generateAttributionSummary = (res: PredictResponse) => {
    const supports = res.explanation.supporting;
    const diseaseName = res.prediction.disease;

    if (!supports.length) {
      return `The statistical model suggests a possible condition of ${diseaseName} based on the mathematical correlation of positive and negative features. This is a model weight assessment, not a clinical diagnosis or evidence of medical causation.`;
    }

    const topSymptoms = supports.slice(0, 3).map(s => `"${s.symptom.replace(/_/g, " ")}"`).join(", ");
    return `The model's prediction of a possible condition of ${diseaseName} is mathematically influenced by the presence of ${topSymptoms}. These represent statistical weights within the machine learning model and do not constitute clinical evidence or prove medical causation.`;
  };

  const totalSyms = Object.values(SYMPTOM_CATS).reduce((a, b) => a + b.length, 0);

  const searchResults = search
    ? Array.from(new Set(Object.values(SYMPTOM_CATS).flat())).filter(s =>
        s.toLowerCase().includes(search.toLowerCase().trim())
      )
    : [];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", display: "flex", flexDirection: "column" }}>
      {/* ═══════════════════════════════════════════════════
          1. TOP NAVBAR
          ═══════════════════════════════════════════════════ */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                border: "1px solid #bfdbfe",
                borderRadius: 8,
                padding: "8px 12px",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              ☰ Symptoms
            </button>
          )}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 22,
              boxShadow: "0 2px 6px rgba(37,99,235,0.3)"
            }}
          >
            🩺
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
              MedExplain <span style={{ color: "#2563eb" }}>AI</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>
              Symptom Classifier
            </div>
          </div>
        </div>

        {/* Right Status Badges & Quick Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 20,
              backgroundColor: "#ecfdf5",
              color: "#059669",
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid #a7f3d0"
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#10b981", display: "inline-block" }}></span>
            Backend Active
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 20,
              backgroundColor: "#eff6ff",
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid #bfdbfe"
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#2563eb", display: "inline-block" }}></span>
            Model Loaded
          </div>

          <button
            onClick={() => setShowPresetsModal(true)}
            style={{
              backgroundColor: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            ⚡ Presets (41)
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
          2. MAIN BODY: SIDEBAR + CONTENT AREA
          ═══════════════════════════════════════════════════ */}
      <div style={{ display: "flex", flex: 1, position: "relative" }}>
        {/* SIDEBAR: SYMPTOM CATEGORIES & SELECTION */}
        <aside
          style={{
            width: isMobile ? "100%" : 330,
            flexShrink: 0,
            backgroundColor: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            display: isMobile ? (sidebarOpen ? "flex" : "none") : "flex",
            flexDirection: "column",
            position: isMobile ? "fixed" : "sticky",
            top: isMobile ? 65 : 65,
            left: 0,
            bottom: 0,
            zIndex: 30,
            height: "calc(100vh - 65px)",
            boxShadow: isMobile ? "0 10px 25px rgba(0,0,0,0.15)" : "none"
          }}
        >
          {/* Sidebar Header */}
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📋</span> Symptom Categories
              </div>
              {symptoms.length > 0 && (
                <span
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12
                  }}
                >
                  {symptoms.length} selected
                </span>
              )}
            </div>

            {/* Search Box */}
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: 10, fontSize: 14, color: "#64748b" }}>🔍</span>
              <input
                type="text"
                placeholder={`Search ${totalSyms} symptoms...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  height: 38,
                  padding: "8px 34px 8px 34px",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#0f172a",
                  backgroundColor: "#f8fafc",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: 8,
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: 9,
                    border: "none",
                    background: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Categories / Search Results Scroll Area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {search ? (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", padding: "6px 8px 10px 8px" }}>
                  Search Results ({searchResults.length})
                </div>
                {searchResults.length === 0 ? (
                  <div style={{ padding: "20px 10px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                    No symptoms found matching "{search}"
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {searchResults.map(sym => {
                      const isChecked = hasSym(sym);
                      return (
                        <div
                          key={sym}
                          onClick={() => toggleSym(sym)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "9px 12px",
                            borderRadius: 8,
                            backgroundColor: isChecked ? "#eff6ff" : "#ffffff",
                            border: `1px solid ${isChecked ? "#bfdbfe" : "#e2e8f0"}`,
                            cursor: "pointer",
                            transition: "background-color 0.15s"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: "#2563eb",
                              cursor: "pointer"
                            }}
                          />
                          <span style={{ fontSize: 13.5, fontWeight: isChecked ? 700 : 500, color: isChecked ? "#1d4ed8" : "#1e293b", flex: 1 }}>
                            {sym}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Accordion List */
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(SYMPTOM_CATS).map(([catKey, symList]) => {
                  const isExpanded = expandedCats[catKey] || false;
                  const [icon, ...nameParts] = catKey.split(" ");
                  const catName = nameParts.join(" ");
                  const selectedInCat = symList.filter(s => hasSym(s)).length;
                  const isActiveCategory = activeCat === catKey;

                  return (
                    <div
                      key={catKey}
                      style={{
                        borderRadius: 10,
                        border: `1px solid ${isActiveCategory || isExpanded ? "#bfdbfe" : "#e2e8f0"}`,
                        overflow: "hidden",
                        backgroundColor: "#ffffff"
                      }}
                    >
                      {/* Accordion Category Header Button */}
                      <button
                        onClick={() => toggleCatAccordion(catKey)}
                        style={{
                          width: "100%",
                          padding: "11px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: isExpanded ? "#2563eb" : isActiveCategory ? "#eff6ff" : "#ffffff",
                          color: isExpanded ? "#ffffff" : isActiveCategory ? "#1d4ed8" : "#1e293b",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.15s"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 16 }}>{icon}</span>
                          <span style={{ fontSize: 13.5, fontWeight: 700 }}>{catName}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {selectedInCat > 0 && (
                            <span
                              style={{
                                backgroundColor: isExpanded ? "#ffffff" : "#2563eb",
                                color: isExpanded ? "#2563eb" : "#ffffff",
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: 10
                              }}
                            >
                              {selectedInCat}
                            </span>
                          )}
                          <span
                            style={{
                              backgroundColor: isExpanded ? "rgba(255,255,255,0.2)" : "#f1f5f9",
                              color: isExpanded ? "#ffffff" : "#64748b",
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 10
                            }}
                          >
                            {symList.length}
                          </span>
                          <span style={{ fontSize: 10, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                            ▼
                          </span>
                        </div>
                      </button>

                      {/* Symptoms List inside category */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: "8px 10px",
                            backgroundColor: "#f8fafc",
                            borderTop: "1px solid #e2e8f0",
                            display: "flex",
                            flexDirection: "column",
                            gap: 4
                          }}
                        >
                          {symList.map(sym => {
                            const isChecked = hasSym(sym);
                            return (
                              <div
                                key={sym}
                                onClick={() => toggleSym(sym)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: "8px 10px",
                                  borderRadius: 6,
                                  backgroundColor: isChecked ? "#eff6ff" : "#ffffff",
                                  border: `1px solid ${isChecked ? "#93c5fd" : "#e2e8f0"}`,
                                  cursor: "pointer",
                                  transition: "background-color 0.15s"
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  style={{
                                    width: 15,
                                    height: 15,
                                    accentColor: "#2563eb",
                                    cursor: "pointer"
                                  }}
                                />
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: isChecked ? 700 : 500,
                                    color: isChecked ? "#1d4ed8" : "#1e293b",
                                    flex: 1
                                  }}
                                >
                                  {sym}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════
            3. MAIN WORKSPACE / CONTENT AREA
            ═══════════════════════════════════════════════════ */}
        <main style={{ flex: 1, padding: isMobile ? "16px 12px" : "28px 36px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
          {/* Header Title Banner */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              padding: "20px 24px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 26
                }}
              >
                🧠
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
                  Machine Learning Symptom Classifier
                </h1>
                <p style={{ margin: "4px 0 0 0", fontSize: 13.5, color: "#64748b" }}>
                  Select symptoms from the sidebar, set durations, then click Analyze.
                </p>
              </div>
            </div>

            {/* Pipeline Mode Switcher */}
            <div style={{ display: "flex", backgroundColor: "#f1f5f9", padding: 4, borderRadius: 10, gap: 4 }}>
              <button
                onClick={() => setPipelineMode("split")}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: pipelineMode === "split" ? "#ffffff" : "transparent",
                  color: pipelineMode === "split" ? "#2563eb" : "#64748b",
                  boxShadow: pipelineMode === "split" ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                }}
              >
                Split Pipeline (Predict + Explain)
              </button>
              <button
                onClick={() => setPipelineMode("unified")}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor: pipelineMode === "unified" ? "#ffffff" : "transparent",
                  color: pipelineMode === "unified" ? "#2563eb" : "#64748b",
                  boxShadow: pipelineMode === "unified" ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                }}
              >
                🔬 Unified Differential (/analyze)
              </button>
            </div>
          </div>

          {/* Validation Error Banner */}
          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 12,
                padding: "14px 18px",
                marginBottom: 20,
                color: "#b91c1c",
                fontSize: 13.5,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <span>⚠️</span>
              <div style={{ flex: 1 }}>{error}</div>
              <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}>✕</button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              CARD 1: SELECTED SYMPTOMS
              ═══════════════════════════════════════════════════ */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              padding: "20px 24px",
              marginBottom: 20
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <span>📝</span> Selected Symptoms ({symptoms.length})
              </div>

              {symptoms.length > 0 && (
                <button
                  onClick={clearAllSymptoms}
                  style={{
                    backgroundColor: "transparent",
                    color: "#ef4444",
                    border: "1px solid #fecaca",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  Clear All 🗑️
                </button>
              )}
            </div>

            {symptoms.length === 0 ? (
              <div
                style={{
                  border: "2px dashed #e2e8f0",
                  borderRadius: 10,
                  padding: "28px 20px",
                  textAlign: "center",
                  color: "#64748b",
                  backgroundColor: "#f8fafc"
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>👈</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>No symptoms selected yet</div>
                <div style={{ fontSize: 12.5, marginTop: 4 }}>
                  Click symptoms in the categories on the left sidebar to add them for classification.
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {symptoms.map(s => {
                  const duration = getDur(s.name);
                  return (
                    <div
                      key={s.name}
                      style={{
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        borderRadius: 24,
                        padding: "7px 14px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: "0 2px 4px rgba(37,99,235,0.2)"
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.name}</span>

                      {/* Duration Tag */}
                      <button
                        onClick={() => setDurPicker(durPicker === s.name ? null : s.name)}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.2)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 12,
                          padding: "2px 8px",
                          fontSize: 11,
                          fontWeight: 500,
                          cursor: "pointer"
                        }}
                      >
                        {duration ? `⏱️ ${duration}` : "+ Set Duration"}
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={() => toggleSym(s.name)}
                        style={{
                          backgroundColor: "transparent",
                          color: "rgba(255,255,255,0.8)",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 16,
                          fontWeight: 700,
                          padding: "0 2px"
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Duration Selector Dropdown/Tray */}
            {durPicker && (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  backgroundColor: "#eff6ff",
                  borderRadius: 10,
                  border: "1px solid #bfdbfe"
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#1d4ed8", marginBottom: 8 }}>
                  Select duration for "{durPicker}":
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {DURATION_OPTIONS.map(d => (
                    <button
                      key={d}
                      onClick={() => setDur(durPicker, d)}
                      style={{
                        backgroundColor: getDur(durPicker) === d ? "#2563eb" : "#ffffff",
                        color: getDur(durPicker) === d ? "#ffffff" : "#1e293b",
                        border: `1px solid ${getDur(durPicker) === d ? "#2563eb" : "#cbd5e1"}`,
                        borderRadius: 16,
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {d}
                    </button>
                  ))}
                  <button
                    onClick={() => setDurPicker(null)}
                    style={{
                      backgroundColor: "transparent",
                      color: "#64748b",
                      border: "none",
                      fontSize: 12,
                      cursor: "pointer",
                      padding: "5px 8px"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════
              CARD 2: PATIENT NOTES / HISTORY
              ═══════════════════════════════════════════════════ */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              padding: "20px 24px",
              marginBottom: 20
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span>📝</span> Patient Notes / History <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b" }}>(Optional)</span>
            </div>

            <textarea
              rows={3}
              placeholder="Example: Patient is a 45-year-old male presenting with mild respiratory tightness..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                fontSize: 13.5,
                color: "#0f172a",
                backgroundColor: "#f8fafc",
                border: "1.5px solid #cbd5e1",
                borderRadius: 10,
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box"
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: "#64748b" }}>
              <span>🔒</span>
              <span><strong>Privacy Warning (HIPAA):</strong> Do not input any personally identifiable information.</span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              ACTION BUTTONS
              ═══════════════════════════════════════════════════ */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <button
              onClick={analyze}
              disabled={loading}
              style={{
                flex: "1 1 240px",
                backgroundColor: loading ? "#93c5fd" : "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: 10,
                padding: "14px 28px",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background-color 0.15s"
              }}
            >
              {loading ? "🔬 Querying classifier..." : "🔬 Analyze Symptoms"}
            </button>

            <button
              onClick={() => setPipelineMode(pipelineMode === "split" ? "unified" : "split")}
              style={{
                backgroundColor: "#ffffff",
                color: "#2563eb",
                border: "1.5px solid #bfdbfe",
                borderRadius: 10,
                padding: "14px 20px",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              🔀 Split Pipeline (Predict + Explain)
            </button>

            {(result || unifiedResult) && (
              <button
                onClick={resetAnalysis}
                style={{
                  backgroundColor: "#f1f5f9",
                  color: "#64748b",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  padding: "14px 20px",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                🔄 Reset
              </button>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════
              MEDICAL DISCLAIMER CARD
              ═══════════════════════════════════════════════════ */}
          <div
            style={{
              backgroundColor: "#fffbeb",
              borderRadius: 12,
              border: "1px solid #fde68a",
              padding: "16px 20px",
              marginBottom: 24,
              color: "#92400e"
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span>⚠️</span> Medical Disclaimer
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              MedExplain is an educational AI tool and does not provide a medical diagnosis. Results should not replace evaluation by a qualified healthcare professional.
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: "#b45309", display: "flex", alignItems: "center", gap: 6 }}>
              <span>ℹ️</span> Please consult a doctor if symptoms persist or worsen.
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
              RESULTS AREA
              ═══════════════════════════════════════════════════ */}
          <div ref={resultsRef}>
            {/* SPLIT PIPELINE RESULTS */}
            {result && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Emergency Warning Banner if applicable */}
                {isEmergencyCondition(result.prediction.disease) && (
                  <div
                    style={{
                      backgroundColor: "#fef2f2",
                      border: "2px solid #ef4444",
                      borderRadius: 12,
                      padding: "18px 22px",
                      color: "#991b1b"
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span>🚨</span> URGENT EMERGENCY WARNING
                    </div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                      MedExplain has detected a possible high-risk condition (<strong>{result.prediction.disease}</strong>). If you or the patient are experiencing severe symptoms such as <strong>difficulty breathing, chest pain, sudden weakness, or slurred speech</strong>, please seek immediate professional emergency medical care or call emergency services (like 911) immediately.
                    </div>
                  </div>
                )}

                {/* Primary Prediction Card */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 14,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    padding: "24px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                    <div>
                      <span
                        style={{
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 20,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em"
                        }}
                      >
                        Model Possible Condition Prediction
                      </span>
                      <h2 style={{ margin: "8px 0 0 0", fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
                        {result.prediction.disease}
                      </h2>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>
                        {Math.round(result.prediction.confidence * 100)}%
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                        {Math.round(result.prediction.confidence * 100)}% Model Probability
                      </div>
                    </div>
                  </div>

                  {/* Confidence Progress Bar */}
                  <div style={{ height: 10, backgroundColor: "#f1f5f9", borderRadius: 6, overflow: "hidden", marginBottom: 20 }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.round(result.prediction.confidence * 100)}%`,
                        backgroundColor: "#2563eb",
                        borderRadius: 6,
                        transition: "width 0.5s ease"
                      }}
                    />
                  </div>

                  {/* SHAP Feature Weights Section */}
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 18 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>📊</span> Model Reasoning & Feature Weight Explainer (SHAP)
                    </div>
                    <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 16 }}>
                      {generateAttributionSummary(result)}
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                      {/* Supporting Symptoms */}
                      <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#166534", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>✅</span> Mathematically Supported ({result.explanation.supporting.length})
                        </div>
                        {result.explanation.supporting.length === 0 ? (
                          <div style={{ fontSize: 12, color: "#64748b" }}>No active symptoms had positive statistical weights.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {result.explanation.supporting.map((item, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
                                <span style={{ fontWeight: 600, color: "#1e293b" }}>{item.symptom.replace(/_/g, " ")}</span>
                                <span style={{ fontWeight: 700, color: "#15803d", backgroundColor: "#dcfce7", padding: "2px 8px", borderRadius: 6 }}>
                                  +{item.contribution}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Opposing Symptoms */}
                      <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>⚠️</span> Statistically Opposing ({result.explanation.against.length})
                        </div>
                        {result.explanation.against.length === 0 ? (
                          <div style={{ fontSize: 12, color: "#64748b" }}>No active symptoms penalized this prediction.</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {result.explanation.against.map((item, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5 }}>
                                <span style={{ fontWeight: 600, color: "#1e293b" }}>{item.symptom.replace(/_/g, " ")}</span>
                                <span style={{ fontWeight: 700, color: "#b91c1c", backgroundColor: "#fee2e2", padding: "2px 8px", borderRadius: 6 }}>
                                  {item.contribution}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Alternative Conditions Section */}
                  {result.alternatives && result.alternatives.length > 0 && (
                    <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 20, paddingTop: 18 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}>
                        Alternative Possible Conditions
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {result.alternatives.slice(0, 4).map((alt, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 14px",
                              backgroundColor: "#f8fafc",
                              borderRadius: 8,
                              border: "1px solid #e2e8f0"
                            }}
                          >
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#1e293b" }}>{alt.disease}</span>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#2563eb" }}>
                              {Math.round(alt.probability * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Gemini AI Explanation Section */}
                {explanationLoading && (
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      padding: "24px",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#2563eb" }}>
                      Generating AI Educational Explanation...
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4 }}>
                      Synthesizing clinical relationships and educational context with Gemini AI.
                    </div>
                  </div>
                )}

                {explanationError && (
                  <div
                    style={{
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: 12,
                      padding: "16px 20px",
                      color: "#92400e"
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                      AI-Generated Explanation Unavailable
                    </div>
                    <div style={{ fontSize: 13 }}>{explanationError}</div>
                  </div>
                )}

                {explanation && (
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 14,
                      border: "1px solid #bfdbfe",
                      boxShadow: "0 2px 8px rgba(37,99,235,0.06)",
                      padding: "24px"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <span style={{ fontSize: 22 }}>✨</span>
                      <div>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                          AI-Generated Educational Explanation
                        </h3>
                        <div style={{ fontSize: 12, color: "#64748b" }}>Powered by Google Gemini</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13.5, lineHeight: 1.5, color: "#334155" }}>
                      <div>
                        <strong>Possible Condition Explanation:</strong> {explanation.possible_condition_explanation}
                      </div>
                      <div>
                        {explanation.summary}
                      </div>
                      <div>
                        {explanation.symptom_relationship}
                      </div>
                      {explanation.safety_guidance && (
                        <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: 12, borderRadius: 8, color: "#1e40af" }}>
                          <strong>Safety Guidance:</strong> {explanation.safety_guidance}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* UNIFIED DIFFERENTIAL RESULTS */}
            {unifiedResult && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {unifiedResult.differentials_note && (
                  <div
                    style={{
                      backgroundColor: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: 14,
                      padding: "20px 24px"
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1d4ed8", marginBottom: 6 }}>
                      Clinical Differential Note
                    </div>
                    <div style={{ fontSize: 13.5, color: "#1e3a8a", lineHeight: 1.5 }}>
                      {unifiedResult.differentials_note}
                    </div>
                  </div>
                )}

                {unifiedResult.conditions && unifiedResult.conditions.map((cond, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      padding: "24px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.04)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{cond.name}</h3>
                      <span
                        style={{
                          backgroundColor: "#eff6ff",
                          color: "#2563eb",
                          fontSize: 12,
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: 20
                        }}
                      >
                        {cond.urgency || "Routine"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.5 }}>
                      {cond.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════
          PRESETS MODAL
          ═══════════════════════════════════════════════════ */}
      {showPresetsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 20
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: 16,
              maxWidth: 700,
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
          >
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>⚡ Clinical Disease Presets (41)</h3>
                <div style={{ fontSize: 12.5, color: "#64748b" }}>Select any preset to populate authentic symptom constellations.</div>
              </div>
              <button onClick={() => setShowPresetsModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>✕</button>
            </div>

            <div style={{ padding: "16px 24px", overflowY: "auto", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              {Object.entries(PRESETS).map(([name, symList]) => (
                <button
                  key={name}
                  onClick={() => applyPreset(name, symList)}
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "12px 14px",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{name}</div>
                  <div style={{ fontSize: 11.5, color: "#64748b" }}>{symList.slice(0, 3).join(", ")}...</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
