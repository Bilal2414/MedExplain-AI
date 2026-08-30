import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════ */
const SYMPTOM_CATS = {
  "🫁 Respiratory": ["Cough","Dry cough","Productive cough","Shortness of breath","Wheezing","Chest tightness","Sore throat","Runny nose","Nasal congestion","Sneezing","Hoarseness","Stridor","Hemoptysis","Pleuritic chest pain","Orthopnea","Sleep apnea","Chronic cough","Postnasal drip","Epistaxis","Nasal polyps","Tachypnea","Clubbing of fingers","Barrel chest"],
  "🌡️ Systemic": ["Fever","Low-grade fever","High fever","Chills","Rigors","Night sweats","Fatigue","Malaise","Weight loss","Weight gain","Loss of appetite","Excessive sweating","Generalized weakness","Pallor","Cachexia","Dehydration","Edema","Lymphadenopathy","Heat intolerance","Cold intolerance","Unintentional weight loss","Low energy","Recurrent infections"],
  "🧠 Neurological": ["Headache","Migraine","Dizziness","Vertigo","Confusion","Disorientation","Memory loss","Numbness","Tingling","Weakness in limbs","Vision changes","Double vision","Blurred vision","Hearing loss","Tinnitus","Seizures","Tremor","Balance problems","Loss of coordination","Facial drooping","Slurred speech","Sudden severe headache","Loss of consciousness","Syncope","Cognitive decline","Brain fog","Neck stiffness","Photophobia","Aura"],
  "💊 Gastrointestinal": ["Nausea","Vomiting","Diarrhea","Constipation","Abdominal pain","Abdominal cramps","Bloating","Heartburn","Acid reflux","Dysphagia","Blood in stool","Melena","Rectal bleeding","Jaundice","Ascites","Flatulence","Belching","Mucus in stool","Abdominal distension","Early satiety","Hiccups","Loss of bowel control","Anal itching","Tenesmus","Hematemesis","Odynophagia"],
  "❤️ Cardiovascular": ["Chest pain","Palpitations","Rapid heartbeat","Irregular heartbeat","Swelling in legs","Ankle swelling","Fainting","Shortness of breath on exertion","Cyanosis","Cold extremities","Leg pain on walking","Neck vein distension","Hypertension symptoms","Hypotension","Claudication","Orthostatic hypotension","Bounding pulse","Peripheral edema"],
  "🦴 Musculoskeletal": ["Joint pain","Muscle aches","Back pain","Neck pain","Lower back pain","Stiffness","Swollen joints","Morning stiffness","Muscle cramps","Bone pain","Reduced range of motion","Muscle weakness","Muscle wasting","Tenderness","Difficulty walking","Hip pain","Shoulder pain","Knee pain","Gout attacks","Crepitus","Elbow pain","Wrist pain","Foot pain","Muscle twitching","Myalgia"],
  "🌿 Skin": ["Rash","Itching","Hives","Jaundice (skin)","Skin discoloration","Excessive bruising","Dry skin","Acne","Eczema patches","Psoriasis plaques","Hair loss","Nail changes","Skin ulcers","Petechiae","Purpura","Skin peeling","Hyperpigmentation","Wound not healing","Skin nodules","Spider veins","Alopecia","Malar rash","Butterfly rash","Telangiectasia"],
  "👁️ Eyes / ENT": ["Red eyes","Eye discharge","Eye pain","Photophobia","Dry eyes","Watery eyes","Ear pain","Ear discharge","Ear fullness","Smell loss","Taste loss","Mouth sores","Gum bleeding","Dry mouth","Voice changes","Neck swelling","Swollen lymph nodes in neck","Excessive salivation","Proptosis","Nystagmus","Epistaxis (nose bleed)"],
  "🧬 Endocrine": ["Excessive thirst","Frequent urination","Excessive hunger","Unexplained weight gain","Unexplained weight loss","Hair thinning","Constipation (thyroid)","Goiter","Gynecomastia","Moon face","Buffalo hump","Stretch marks","Bone fragility","Hypoglycemia symptoms","Hyperglycemia symptoms","Polydipsia","Polyuria","Acanthosis nigricans"],
  "🩸 Hematological": ["Easy bruising","Prolonged bleeding","Frequent infections","Unexplained anemia","Recurrent fever","Night sweats (lymphoma)","Enlarged spleen","Enlarged lymph nodes","Bone pain (marrow)","Oral ulcers (autoimmune)","Sensitivity to sunlight","Thrombosis symptoms","Pallor from anemia","Petechiae (blood)","Splenomegaly","Hepatomegaly"],
  "🚻 Urological": ["Painful urination","Blood in urine","Cloudy urine","Dark urine","Decreased urine output","Urinary urgency","Urinary incontinence","Difficulty urinating","Flank pain","Kidney stone pain","Pelvic pain","Testicular pain","Scrotal swelling","Nocturia","Erectile dysfunction","Hesitancy"],
  "🧘 Mental Health": ["Anxiety","Panic attacks","Depression","Mood swings","Irritability","Insomnia","Hypersomnia","Hallucinations","Delusions","Paranoia","Social withdrawal","Lack of motivation","Poor concentration","Obsessive thoughts","Compulsive behaviors","Hyperactivity","Impulsivity","Suicidal ideation","Mania","Emotional numbness","Anhedonia"],
  "👶 Pediatric": ["Crying excessively","Refusing to feed","High-pitched cry","Bulging fontanelle","Rash with fever","Febrile seizure","Ear pulling","Limping","Bedwetting","School refusal","Delayed milestones","Failure to thrive"],
  "🤰 Reproductive": ["Irregular periods","Heavy bleeding","Pelvic inflammatory pain","Vaginal discharge","Breast lump","Nipple discharge","Testicular swelling","Prostate symptoms","Infertility concerns","Painful intercourse"],
};

const DURATION_OPTIONS = ["< 1 day","1–3 days","4–7 days","1–2 weeks","2–4 weeks","1–3 months","3–6 months","> 6 months","Chronic / recurring"];

const PRESETS = {
  "🤧 Cold":["Runny nose","Sneezing","Sore throat","Cough","Fatigue"],
  "🤒 Influenza":["Fever","Chills","Muscle aches","Fatigue","Cough","Sore throat"],
  "🦠 COVID-19":["Fever","Dry cough","Fatigue","Smell loss","Taste loss","Shortness of breath"],
  "🫁 Pneumonia":["Fever","Productive cough","Shortness of breath","Chest pain","Fatigue"],
  "❤️ Heart Attack":["Chest pain","Shortness of breath","Nausea","Excessive sweating","Palpitations"],
  "🧠 Stroke":["Facial drooping","Slurred speech","Weakness in limbs","Sudden severe headache","Vision changes"],
  "💉 Diabetes T2":["Excessive thirst","Frequent urination","Excessive hunger","Fatigue","Blurred vision"],
  "🦋 Hypothyroid":["Fatigue","Weight gain","Cold intolerance","Constipation (thyroid)","Dry skin","Hair thinning"],
  "🌬️ Asthma":["Wheezing","Shortness of breath","Chest tightness","Cough"],
  "🌬️ COPD":["Chronic cough","Shortness of breath","Wheezing","Productive cough","Fatigue"],
  "🦠 Tuberculosis":["Cough","Hemoptysis","Night sweats","Weight loss","Fever","Fatigue"],
  "🧬 Arthritis":["Joint pain","Morning stiffness","Swollen joints","Fatigue","Fever"],
  "🧠 Migraine":["Migraine","Nausea","Vision changes","Photophobia","Dizziness"],
  "🩸 Anemia":["Fatigue","Pallor","Dizziness","Shortness of breath","Rapid heartbeat"],
  "🦠 UTI":["Painful urination","Frequent urination","Urinary urgency","Cloudy urine","Pelvic pain"],
  "💊 GERD":["Heartburn","Acid reflux","Chest pain","Dysphagia","Chronic cough"],
  "🦠 Hepatitis":["Jaundice","Fatigue","Nausea","Abdominal pain","Dark urine"],
  "🧬 Lupus":["Joint pain","Butterfly rash","Fatigue","Fever","Oral ulcers (autoimmune)"],
  "🦠 Meningitis":["Sudden severe headache","Fever","Neck stiffness","Photophobia","Nausea"],
  "🧠 Parkinson's":["Tremor","Stiffness","Balance problems","Slurred speech","Fatigue"],
  "🩻 Kidney Stones":["Kidney stone pain","Blood in urine","Nausea","Frequent urination","Flank pain"],
  "🦠 Dengue":["Fever","Headache","Eye pain","Muscle aches","Rash","Easy bruising"],
  "🦠 Malaria":["Fever","Chills","Rigors","Headache","Muscle aches","Nausea"],
  "🩸 DVT":["Swelling in legs","Leg pain on walking","Skin discoloration"],
  "🦠 Sepsis":["Fever","Rapid heartbeat","Confusion","Chills","Excessive sweating"],
  "🌿 Eczema":["Itching","Eczema patches","Dry skin","Rash","Skin peeling"],
  "🧬 Fibromyalgia":["Muscle aches","Fatigue","Insomnia","Headache","Brain fog"],
  "🩸 Gout":["Gout attacks","Joint pain","Swollen joints","Fever"],
  "🧬 MS":["Numbness","Weakness in limbs","Vision changes","Balance problems","Fatigue"],
  "🧘 Depression":["Depression","Fatigue","Insomnia","Loss of appetite","Poor concentration","Anhedonia"],
  "🫀 Heart Failure":["Shortness of breath on exertion","Ankle swelling","Fatigue","Orthopnea","Rapid heartbeat"],
  "🩻 Gallstones":["Abdominal pain","Nausea","Vomiting","Jaundice","Fever"],
  "🦠 Typhoid":["Fever","Abdominal pain","Constipation","Malaise","Rash"],
  "🩸 PCOS":["Weight gain","Acne","Hair loss","Excessive hunger","Irregular periods"],
  "🧬 Graves":["Rapid heartbeat","Weight loss","Excessive sweating","Tremor","Anxiety","Proptosis"],
};

const urgencyColors={Routine:"#00c87a",Urgent:"#ffb830",Emergency:"#ff4d6a"};
const KEY_STORAGE="medexplain_gemini_key";

const C={bg:"#0d1117",sb:"#111820",s2:"#18222e",s3:"#1e2c3a",border:"#1e3048",blue:"#2d8bff",green:"#00c87a",amber:"#ffb830",red:"#ff4d6a",text:"#e8f0f8",muted:"#8fa8c0",dim:"#506070",google:"#4285f4"};

function useWidth(){
  const [w,setW]=useState(window.innerWidth);
  useEffect(()=>{const h=()=>setW(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return w;
}

export default function App(){
  const width=useWidth();
  const isMobile=width<768;

  const [apiKey,setApiKey]=useState("backend_secured");
  const [keyInput,setKeyInput]=useState("");
  const [keySet,setKeySet]=useState(true);
  const [symptoms,setSymptoms]=useState([]);
  const [notes,setNotes]=useState("");
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [activeTab,setActiveTab]=useState("diagnoses");
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [sideOpen,setSideOpen]=useState(false);
  const [shapIdx,setShapIdx]=useState(0);
  const [search,setSearch]=useState("");
  const [durPicker,setDurPicker]=useState(null);
  const [activeCat,setActiveCat]=useState(Object.keys(SYMPTOM_CATS)[0]);
  const resultsRef=useRef(null);

  const saveKey=()=>{const k=keyInput.trim();if(!k)return;localStorage.setItem(KEY_STORAGE,k);setApiKey(k);setKeySet(true);setKeyInput("");};
  const hasSym=n=>symptoms.some(s=>s.name===n);
  const getDur=n=>symptoms.find(s=>s.name===n)?.duration||"";
  const toggleSym=n=>{
    if(hasSym(n)){setSymptoms(p=>p.filter(s=>s.name!==n));if(durPicker===n)setDurPicker(null);}
    else{setSymptoms(p=>[...p,{name:n,duration:""}]);setDurPicker(n);}
  };
  const setDur=(n,d)=>{setSymptoms(p=>p.map(s=>s.name===n?{...s,duration:d}:s));setDurPicker(null);};
  const applyPreset=ss=>{setSymptoms(ss.map(n=>({name:n,duration:""})));setResult(null);setSideOpen(false);setDurPicker(null);};

  /* ── FASTAPI SECURE BACKEND CALL (ML, SHAP, and Gemini Pipeline) ── */
  const API_URL = "https://medexplain-ai-ewbd.onrender.com";
  const analyze=async()=>{
    if(!symptoms.length)return;
    setLoading(true);setError("");setResult(null);
    try{
      const res=await fetch(
        `${API_URL}/api/analyze`,
        {method:"POST",headers:{"Content-Type":"application/json"},
         body:JSON.stringify({
           symptoms: symptoms.map(s => ({name: s.name, duration: s.duration})),
           notes: notes
         })}
      );
      if(!res.ok){
        const err=await res.json();
        const msg=err?.detail||err?.error||`HTTP ${res.status}`;
        throw new Error(msg);
      }
      const data=await res.json();
      setResult(data);
      setActiveTab("diagnoses");
      setTimeout(()=>resultsRef.current?.scrollIntoView({behavior:"smooth"}),100);
      if(isMobile)setSideOpen(false);
    }catch(e){
      if(e.message.includes("Failed to fetch")||e.message.includes("NetworkError")){
        setError(`Network error: Cannot reach MedExplain AI Backend (${API_URL}). Please verify your connection.`);
      }else{
        setError(`❌ ${e.message}`);
      }
    }
    setLoading(false);
  };

  const confColor=v=>v>=0.7?C.green:v>=0.4?C.amber:C.muted;
  const confEmoji=l=>({High:"🟢",Moderate:"🟡",Low:"🔴"}[l]||"⚪");
  const totalSyms=Object.values(SYMPTOM_CATS).reduce((a,b)=>a+b.length,0);
  const conds=result?.conditions||[];

  const allSymsInCat=cat=>SYMPTOM_CATS[cat]||[];
  const filteredSyms=cat=>{
    const items=SYMPTOM_CATS[cat]||[];
    return search?items.filter(s=>s.toLowerCase().includes(search.toLowerCase())):items;
  };
  const allCats=Object.keys(SYMPTOM_CATS);
  const searchResults=search?Object.entries(SYMPTOM_CATS).flatMap(([,items])=>items.filter(s=>s.toLowerCase().includes(search.toLowerCase()))):[];

  const ShapBar=({val})=>{
    const pct=Math.min(Math.abs(val)/0.5,1)*46;
    return(<div style={{position:"relative",flex:1,height:14,background:C.s3,borderRadius:3}}><div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:C.border}}/>{val>=0?<div style={{position:"absolute",left:"50%",top:2,bottom:2,width:pct,background:C.blue,borderRadius:2}}/>:<div style={{position:"absolute",right:"50%",top:2,bottom:2,width:pct,background:C.red,borderRadius:2}}/>}</div>);
  };

  /* ── SYMPTOM PANEL (tabbed by category, all visible) ── */
  const SymptomPanel=({inModal=false})=>(
    <div style={{display:"flex",flexDirection:"column",height:inModal?"100%":"auto",minHeight:0}}>
      {/* Search */}
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <input
          style={{width:"100%",background:C.s2,border:`1.5px solid ${C.border}`,borderRadius:7,padding:"8px 12px",color:C.text,fontSize:12,outline:"none",boxSizing:"border-box"}}
          placeholder={`🔍 Search ${totalSyms} symptoms…`}
          value={search} onChange={e=>setSearch(e.target.value)}/>
        {symptoms.length>0&&<div style={{fontSize:10,color:C.green,marginTop:5,fontFamily:"monospace"}}>{symptoms.length} symptom(s) selected</div>}
      </div>

      {/* Category tabs — horizontal scroll */}
      {!search&&(
        <div style={{display:"flex",overflowX:"auto",borderBottom:`1px solid ${C.border}`,flexShrink:0,WebkitOverflowScrolling:"touch"}}>
          {allCats.map(cat=>{
            const selCount=allSymsInCat(cat).filter(s=>hasSym(s)).length;
            const isActive=activeCat===cat;
            return(
              <button key={cat} onClick={()=>setActiveCat(cat)}
                style={{flexShrink:0,padding:"8px 12px",fontSize:11,fontWeight:600,cursor:"pointer",
                  color:isActive?C.blue:C.dim,border:"none",background:"none",
                  borderBottom:`2px solid ${isActive?C.blue:"transparent"}`,
                  marginBottom:-1,whiteSpace:"nowrap",transition:"color .15s",position:"relative"}}>
                {cat}
                {selCount>0&&<span style={{marginLeft:4,background:C.blue,color:"#fff",borderRadius:20,fontSize:8,padding:"1px 5px",fontFamily:"monospace"}}>{selCount}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Symptoms grid — ALL visible, no collapse */}
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",WebkitOverflowScrolling:"touch"}}>
        {search?(
          <>
            <div style={{fontSize:9,color:C.dim,fontFamily:"monospace",marginBottom:8}}>{searchResults.length} results for "{search}"</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {searchResults.map(sym=>{
                const sel=hasSym(sym);
                const dur=getDur(sym);
                return(
                  <div key={sym} style={{position:"relative"}}>
                    <button onClick={()=>toggleSym(sym)}
                      style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${sel?C.blue:C.border}`,
                        background:sel?"rgba(45,139,255,.18)":C.s2,color:sel?"#7bb8ff":C.muted,
                        fontSize:11,cursor:"pointer",fontWeight:sel?700:400,transition:"all .15s"}}>
                      {sel&&"✓ "}{sym}
                      {sel&&dur&&<span style={{marginLeft:5,fontSize:9,color:C.green,fontFamily:"monospace"}}>⏱{dur}</span>}
                    </button>
                    {sel&&durPicker===sym&&(
                      <DurPickerPopup name={sym}/>
                    )}
                  </div>
                );
              })}
              {searchResults.length===0&&<div style={{color:C.dim,fontSize:12}}>No symptoms match "{search}"</div>}
            </div>
          </>
        ):(
          <>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {allSymsInCat(activeCat).map(sym=>{
                const sel=hasSym(sym);
                const dur=getDur(sym);
                const isPicking=durPicker===sym;
                return(
                  <div key={sym} style={{position:"relative"}}>
                    <button onClick={()=>toggleSym(sym)}
                      style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${sel?C.blue:C.border}`,
                        background:sel?"rgba(45,139,255,.18)":C.s2,color:sel?"#7bb8ff":C.muted,
                        fontSize:11,cursor:"pointer",fontWeight:sel?700:400,transition:"all .15s",display:"flex",alignItems:"center",gap:5}}>
                      {sel&&<span style={{color:C.green,fontSize:12}}>✓</span>}{sym}
                      {sel&&dur&&<span style={{fontSize:9,color:C.green,fontFamily:"monospace",background:"rgba(0,200,122,.12)",padding:"1px 5px",borderRadius:10}}>⏱ {dur}</span>}
                      {sel&&!dur&&<span style={{fontSize:9,color:C.amber,fontFamily:"monospace"}}>+ time?</span>}
                    </button>
                    {isPicking&&<DurPickerPopup name={sym}/>}
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:10,fontSize:9,color:C.dim,fontFamily:"monospace"}}>
              {allSymsInCat(activeCat).length} symptoms in this category · click to select · click again on duration badge to change
            </div>
          </>
        )}
      </div>
    </div>
  );

  const DurPickerPopup=({name})=>(
    <div style={{position:"absolute",zIndex:400,left:0,top:"calc(100% + 6px)",background:C.sb,border:`1.5px solid ${C.amber}`,borderRadius:10,padding:10,boxShadow:"0 8px 32px rgba(0,0,0,.6)",minWidth:260,zIndex:500}}>
      <div style={{fontSize:9,color:C.amber,fontFamily:"monospace",marginBottom:7}}>⏱ How long have you had <b>{name}</b>?</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
        {DURATION_OPTIONS.map(d=>(
          <button key={d} onClick={e=>{e.stopPropagation();setDur(name,d);}}
            style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${C.green}`,background:"rgba(0,200,122,.1)",color:C.green,fontSize:10,cursor:"pointer",fontWeight:600}}>
            {d}
          </button>
        ))}
        <button onClick={e=>{e.stopPropagation();setDurPicker(null);}}
          style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${C.border}`,background:C.s2,color:C.dim,fontSize:10,cursor:"pointer"}}>
          Skip
        </button>
      </div>
    </div>
  );

  /* ── SIDEBAR CONTENT ── */
  const SidebarContent=()=>(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {/* Header */}
      <div style={{padding:"14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:34,height:34,borderRadius:9,background:"linear-gradient(135deg,#1a5fd8,#2d8bff)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🩺</div>
            <div>
              <div style={{fontFamily:"monospace",fontWeight:700,fontSize:13,color:C.text}}>MedExplain AI</div>
              <div style={{fontSize:9,color:C.dim,fontFamily:"monospace"}}>Gemini · {totalSyms} symptoms</div>
            </div>
          </div>
          {isMobile&&<button onClick={()=>setSideOpen(false)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"4px 9px",cursor:"pointer",fontSize:14}}>✕</button>}
        </div>
        <span style={{background:"rgba(0,200,122,.12)",border:"1px solid rgba(0,200,122,.35)",color:C.green,borderRadius:20,padding:"2px 10px",fontSize:9,fontFamily:"monospace"}}>● AI Online</span>
      </div>

      {/* FastAPI Backend Status */}
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontSize:11,fontFamily:"monospace",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,200,122,.03)",flexShrink:0}}>
        <span style={{color:C.green,fontWeight:700}}>● Backend connected</span>
        <span style={{color:C.muted}}>Port 8000</span>
      </div>

      {/* Presets */}
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <div style={{fontSize:9,color:C.dim,fontFamily:"monospace",letterSpacing:".07em",textTransform:"uppercase",marginBottom:7}}>Quick Presets</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {Object.entries(PRESETS).map(([name,ss])=>(
            <button key={name} onClick={()=>applyPreset(ss)}
              style={{padding:"3px 9px",borderRadius:20,border:`1.5px solid ${C.border}`,background:C.s2,color:C.muted,fontSize:10,cursor:"pointer",fontWeight:600,transition:"all .15s"}}
              onMouseOver={e=>{e.currentTarget.style.borderColor=C.google;e.currentTarget.style.color=C.google;}}
              onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* ALL SYMPTOMS — tabbed, fully visible */}
      <div style={{flex:1,minHeight:0,display:"flex",flexDirection:"column"}}>
        <SymptomPanel inModal={false}/>
      </div>

      {/* Clear */}
      {symptoms.length>0&&(
        <div style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
          <button onClick={()=>{setSymptoms([]);setResult(null);setDurPicker(null);}}
            style={{width:"100%",padding:"8px",borderRadius:8,background:"rgba(255,77,106,.15)",border:"none",color:C.red,fontWeight:700,fontSize:12,cursor:"pointer"}}>
            🗑️ Clear All
          </button>
        </div>
      )}
    </div>
  );

  return(
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:"'Sora',system-ui,sans-serif",color:C.text,fontSize:13}}>

      {/* Desktop sidebar */}
      {!isMobile&&(
        <div style={{width:320,background:C.sb,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,height:"100vh",position:"sticky",top:0}}>
          <SidebarContent/>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile&&sideOpen&&(
        <>
          <div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:200}}/>
          <div style={{position:"fixed",top:0,left:0,width:"92%",maxWidth:360,height:"100%",background:C.sb,zIndex:201,display:"flex",flexDirection:"column",boxShadow:"6px 0 32px rgba(0,0,0,.6)"}}>
            <SidebarContent/>
          </div>
        </>
      )}

      {/* MAIN */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",minWidth:0}}>

        {/* NAV */}
        <div style={{background:"rgba(13,17,23,.97)",borderBottom:`1px solid ${C.border}`,padding:isMobile?"11px 14px":"11px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(8px)",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isMobile&&<button onClick={()=>setSideOpen(true)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:7,padding:"5px 10px",cursor:"pointer",fontSize:16,lineHeight:1}}>☰</button>}
            <span style={{fontSize:isMobile?14:16,fontWeight:700}}>🩺 MedExplain <em style={{color:C.blue}}>AI</em></span>
            <span style={{fontSize:8,fontFamily:"monospace",color:C.google,background:"rgba(66,133,244,.1)",border:"1px solid rgba(66,133,244,.3)",borderRadius:4,padding:"2px 6px"}}>Gemini</span>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {result&&<button onClick={()=>setDrawerOpen(true)} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(45,139,255,.12)",border:`1px solid ${C.blue}33`,color:"#7bb8ff",borderRadius:20,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>📊 Compare ({conds.length})</button>}
            <span style={{background:"rgba(0,200,122,.12)",border:"1px solid rgba(0,200,122,.35)",color:C.green,borderRadius:20,padding:"2px 9px",fontSize:9,fontFamily:"monospace"}}>● Live</span>
          </div>
        </div>

        {/* HERO */}
        <div style={{textAlign:"center",padding:isMobile?"18px 16px 10px":"24px 20px 12px"}}>
          <h1 style={{fontSize:isMobile?20:26,fontWeight:700,margin:"0 0 6px",color:C.text}}>Intelligent Differential Diagnosis</h1>
          <p style={{color:C.muted,fontSize:isMobile?11:12,margin:0,lineHeight:1.6}}>{isMobile?"Tap ☰ → select symptoms + durations → Analyze":"Select symptoms from the sidebar, set durations, then click Analyze"}</p>
        </div>

        {/* Mobile preset strip */}
        {isMobile&&(
          <div style={{padding:"0 14px 8px"}}>
            <div style={{overflowX:"auto",display:"flex",gap:5,paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
              {Object.entries(PRESETS).map(([name,ss])=>(
                <button key={name} onClick={()=>applyPreset(ss)} style={{flexShrink:0,padding:"5px 11px",borderRadius:20,border:`1.5px solid ${C.border}`,background:C.s2,color:C.muted,fontSize:10,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* INPUT */}
        <div style={{padding:isMobile?"0 14px 14px":"0 22px 16px",maxWidth:820,margin:"0 auto",width:"100%",boxSizing:"border-box",display:"flex",flexDirection:"column",gap:10}}>

          {/* Selected symptoms */}
          {symptoms.length>0&&(
            <div style={{background:C.sb,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:9,color:C.dim,fontFamily:"monospace",textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>
                ✅ Selected Symptoms & Durations
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {symptoms.map(({name,duration})=>(
                  <div key={name} style={{display:"inline-flex",alignItems:"center",background:"rgba(45,139,255,.12)",border:"1px solid rgba(45,139,255,.35)",borderRadius:6,overflow:"hidden"}}>
                    <span style={{padding:"4px 9px",fontSize:11,fontWeight:600,color:"#7bb8ff"}}>{name}</span>
                    {duration
                      ? <span style={{padding:"3px 8px",fontSize:9,color:C.green,background:"rgba(0,200,122,.12)",borderLeft:"1px solid rgba(45,139,255,.3)",fontFamily:"monospace"}}>⏱ {duration}</span>
                      : <button onClick={()=>setDurPicker(durPicker===name?null:name)} style={{padding:"3px 8px",fontSize:9,color:C.amber,background:"rgba(255,184,48,.08)",border:"none",borderLeft:"1px solid rgba(45,139,255,.3)",cursor:"pointer",fontFamily:"monospace"}}>+ time</button>
                    }
                    <button onClick={()=>toggleSym(name)} style={{padding:"3px 7px",background:"none",border:"none",borderLeft:"1px solid rgba(45,139,255,.3)",cursor:"pointer",color:"#7bb8ff",fontSize:14,lineHeight:1}}>×</button>
                  </div>
                ))}
              </div>
              {/* Quick duration setter */}
              {durPicker&&!getDur(durPicker)&&symptoms.some(s=>s.name===durPicker)&&(
                <div style={{marginTop:10,padding:"10px 12px",background:C.s2,borderRadius:8,border:`1px solid ${C.amber}55`}}>
                  <div style={{fontSize:9,color:C.amber,fontFamily:"monospace",marginBottom:7}}>⏱ Duration for <b>{durPicker}</b>:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {DURATION_OPTIONS.map(d=>(
                      <button key={d} onClick={()=>setDur(durPicker,d)} style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${C.green}`,background:"rgba(0,200,122,.1)",color:C.green,fontSize:10,cursor:"pointer",fontWeight:600}}>{d}</button>
                    ))}
                    <button onClick={()=>setDurPicker(null)} style={{padding:"4px 10px",borderRadius:20,border:`1.5px solid ${C.border}`,background:C.s2,color:C.dim,fontSize:10,cursor:"pointer"}}>Skip</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Additional notes: age, medical history, current medications, allergies…"
            style={{width:"100%",background:C.s2,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:12,outline:"none",boxSizing:"border-box",resize:"none",fontFamily:"inherit",lineHeight:1.6}}/>

          <button onClick={analyze} disabled={!symptoms.length||loading||!keySet}
            style={{width:"100%",padding:"13px",borderRadius:9,background:(!symptoms.length||loading||!keySet)?"#18222e":"linear-gradient(135deg,#2d8bff,#1a5fd8)",border:"none",color:(!symptoms.length||loading||!keySet)?C.dim:"#fff",fontWeight:700,fontSize:14,cursor:(!symptoms.length||loading||!keySet)?"not-allowed":"pointer"}}>
            {loading?"🔬 Analyzing with Gemini AI…":"🔬 Analyze Symptoms"}
          </button>

          {!keySet&&<div style={{color:C.google,fontSize:11,textAlign:"center",fontFamily:"monospace"}}>🔑 {isMobile?"Tap ☰ and enter Google AI Studio key":"Enter Google AI Studio key in sidebar to begin"}</div>}
          {error&&(
            <div style={{background:"rgba(255,77,106,.08)",border:"1px solid rgba(255,77,106,.3)",color:C.red,borderRadius:8,padding:"12px 14px",fontSize:11,lineHeight:1.7}}>
              {error}
              {error.includes("403")&&(
                <div style={{marginTop:8,color:C.amber,fontSize:10,fontFamily:"monospace"}}>
                  Fix: Go to console.cloud.google.com → APIs & Services → Enable "Generative Language API"
                </div>
              )}
            </div>
          )}
          <div style={{background:"rgba(255,184,48,.07)",border:"1px solid rgba(255,184,48,.22)",borderRadius:8,padding:"8px 12px",fontSize:10,color:C.amber,fontFamily:"monospace",lineHeight:1.5}}>
            ⚠️ Educational use only. Always consult a licensed physician.
          </div>
        </div>

        {/* RESULTS */}
        {result&&(
          <div ref={resultsRef} style={{padding:isMobile?"0 14px 30px":"0 22px 30px",maxWidth:820,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
            <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:14,overflowX:"auto"}}>
              {["diagnoses","shap","advice"].map(t=>(
                <button key={t} style={{padding:isMobile?"9px 12px":"9px 18px",fontSize:isMobile?11:12,fontWeight:600,cursor:"pointer",color:activeTab===t?C.blue:C.dim,border:"none",background:"none",borderBottom:`2px solid ${activeTab===t?C.blue:"transparent"}`,marginBottom:-1,whiteSpace:"nowrap"}} onClick={()=>setActiveTab(t)}>
                  {t==="diagnoses"?"📊 Diagnoses":t==="shap"?"📈 SHAP Impact":"💡 Advice & Flags"}
                </button>
              ))}
            </div>

            {result.differentials_note&&<div style={{fontSize:11,color:C.muted,marginBottom:12,padding:"9px 12px",background:C.sb,borderRadius:8,border:`1px solid ${C.border}`,lineHeight:1.6}}>🤖 {result.differentials_note}</div>}

            {activeTab==="diagnoses"&&conds.map((c,i)=>{
              const conf=c.confidence||0;
              const uc=urgencyColors[c.urgency]||C.muted;
              const cc=confColor(conf);
              return(
                <div key={i} style={{background:C.sb,border:`1.5px solid ${i===0?C.blue:C.border}`,borderRadius:11,padding:isMobile?12:16,marginBottom:11}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7,gap:8}}>
                    <div style={{minWidth:0}}>
                      <div style={{fontFamily:"monospace",fontSize:9,color:C.dim,marginBottom:3}}>#{i+1} DIFFERENTIAL</div>
                      <div style={{fontSize:isMobile?15:17,fontWeight:700,color:C.text,wordBreak:"break-word"}}>{c.name}</div>
                      <div style={{fontFamily:"monospace",fontSize:9,color:C.dim,marginTop:2}}>{c.icd} · {c.prevalence} · {c.typical_duration}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                      {i===0&&<span style={{fontFamily:"monospace",fontSize:8,color:C.blue,background:"rgba(45,139,255,.12)",border:"1px solid rgba(45,139,255,.3)",borderRadius:3,padding:"2px 6px"}}>⭐ TOP</span>}
                      <span style={{fontSize:13,fontWeight:700,color:cc}}>{confEmoji(c.confidence_label)} {Math.round(conf*100)}%</span>
                    </div>
                  </div>
                  <div style={{height:5,background:C.s3,borderRadius:3,marginBottom:10,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.round(conf*100)}%`,background:cc,borderRadius:3}}/>
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                    <span style={{fontSize:10,padding:"3px 9px",borderRadius:5,border:`1px solid ${uc}`,color:uc,background:`${uc}18`}}>🚦 {c.urgency}</span>
                    <span style={{fontSize:10,padding:"3px 9px",borderRadius:5,border:`1px solid ${C.border}`,color:"#7bb8ff"}}>👨‍⚕️ {c.specialist}</span>
                    {c.contagious&&<span style={{fontSize:10,padding:"3px 9px",borderRadius:5,border:"1px solid rgba(255,122,144,.4)",color:"#ff7a90"}}>🦠 Contagious</span>}
                  </div>
                  {c.key_features?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:9}}>{c.key_features.map((f,j)=><span key={j} style={{fontSize:10,padding:"3px 9px",borderRadius:20,background:C.s2,border:`1px solid ${C.border}`,color:C.muted}}>{f}</span>)}</div>}
                  {c.matched_symptoms?.length>0&&<div style={{fontSize:10,color:C.dim,marginBottom:9,lineHeight:1.7}}><span style={{fontFamily:"monospace"}}>MATCHED: </span><span style={{color:"#7bb8ff"}}>{c.matched_symptoms.join(", ")}</span></div>}
                  {c.duration_insight&&<div style={{background:"rgba(66,133,244,.08)",border:"1px solid rgba(66,133,244,.25)",borderRadius:8,padding:"9px 12px",fontSize:11,color:C.muted,marginBottom:9,lineHeight:1.6}}><span style={{color:C.google,fontWeight:700}}>⏱ Duration Insight: </span>{c.duration_insight}</div>}
                  {c.recommendation&&<div style={{background:"rgba(0,200,122,.07)",border:"1.5px solid rgba(0,200,122,.22)",borderRadius:8,padding:"10px 12px",fontSize:12,color:C.muted,lineHeight:1.6}}><span style={{color:C.green,fontWeight:700}}>💊 </span>{c.recommendation}</div>}
                  {c.red_flags_specific?.length>0&&<div style={{marginTop:8,background:"rgba(255,77,106,.07)",border:"1px solid rgba(255,77,106,.25)",borderRadius:7,padding:"8px 11px",fontSize:11,color:"#ff7a90",lineHeight:1.6}}>⚠️ {c.red_flags_specific.join(" · ")}</div>}
                </div>
              );
            })}

            {activeTab==="shap"&&(
              <div>
                <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:8,marginBottom:12,WebkitOverflowScrolling:"touch"}}>
                  {conds.map((c,i)=>(
                    <button key={i} onClick={()=>setShapIdx(i)} style={{flexShrink:0,padding:"5px 12px",borderRadius:20,border:`1.5px solid ${shapIdx===i?C.blue:C.border}`,background:shapIdx===i?"rgba(45,139,255,.15)":C.s2,color:shapIdx===i?"#7bb8ff":C.muted,fontSize:11,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
                      {c.name}
                    </button>
                  ))}
                </div>
                {conds[shapIdx]?.shap?.length>0&&(
                  <div style={{background:C.sb,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
                    <div style={{fontSize:9,color:C.dim,fontFamily:"monospace",textTransform:"uppercase",marginBottom:10}}>Feature Impact — {conds[shapIdx].name}</div>
                    {[...conds[shapIdx].shap].sort((a,b)=>b.value-a.value).map((sh,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:C.s2,border:`1px solid ${C.border}`,borderRadius:6,marginBottom:5}}>
                        <span style={{fontFamily:"monospace",fontSize:isMobile?9:11,color:C.muted,width:isMobile?100:160,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sh.symptom}</span>
                        <ShapBar val={sh.value}/>
                        <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,width:46,textAlign:"right",color:sh.value>=0?"#7bb8ff":"#ff7a90"}}>{sh.value>=0?"+":""}{sh.value.toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{display:"flex",gap:14,marginTop:10,fontSize:9,color:C.dim,fontFamily:"monospace"}}>
                      <span><span style={{display:"inline-block",width:10,height:10,background:C.blue,borderRadius:2,marginRight:4}}/>Supports</span>
                      <span><span style={{display:"inline-block",width:10,height:10,background:C.red,borderRadius:2,marginRight:4}}/>Against</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab==="advice"&&(
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
                <div style={{background:C.sb,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:10}}>🚨 Red Flags</div>
                  {result.red_flags?.map((f,i)=><div key={i} style={{background:"rgba(255,77,106,.08)",border:"1px solid rgba(255,77,106,.2)",borderRadius:6,padding:"8px 10px",fontSize:11,color:"#ff7a90",marginBottom:6,lineHeight:1.5}}>⚠️ {f}</div>)}
                  {!result.red_flags?.length&&<div style={{color:C.dim,fontSize:11}}>No red flags identified.</div>}
                </div>
                <div style={{background:C.sb,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:10}}>🌿 Lifestyle Advice</div>
                  {result.lifestyle_advice?.map((a,i)=><div key={i} style={{background:"rgba(0,200,122,.07)",border:"1px solid rgba(0,200,122,.2)",borderRadius:6,padding:"8px 10px",fontSize:11,color:C.muted,marginBottom:6,lineHeight:1.5}}>✅ {a}</div>)}
                </div>
                {result.disclaimer&&<div style={{gridColumn:"1/-1",fontSize:9,color:C.dim,fontFamily:"monospace",borderTop:`1px solid ${C.border}`,paddingTop:10,lineHeight:1.6}}>⚖️ {result.disclaimer}</div>}
              </div>
            )}
          </div>
        )}

        {!result&&!loading&&(
          <div style={{textAlign:"center",padding:"40px 20px",color:C.dim}}>
            <div style={{fontSize:44,marginBottom:12}}>🔬</div>
            <div style={{fontSize:isMobile?13:15,color:C.muted,marginBottom:6,fontWeight:600}}>Select symptoms to get started</div>
            <div style={{fontSize:11,lineHeight:1.8}}>{isMobile?"Tap ☰ to browse all symptoms by category":"Browse all symptoms in the sidebar by category tab"}<br/>Add durations, then click Analyze</div>
          </div>
        )}

        <div style={{textAlign:"center",padding:"12px",fontSize:9,color:C.dim,fontFamily:"monospace",borderTop:`1px solid ${C.border}`,marginTop:"auto"}}>
          MedExplain AI · Google Gemini · {totalSyms} symptoms · {Object.keys(PRESETS).length} presets · Educational only
        </div>
      </div>

      {/* COMPARISON DRAWER */}
      {drawerOpen&&(
        <>
          <div onClick={()=>setDrawerOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:198}}/>
          <div style={{position:"fixed",top:0,right:0,width:isMobile?"100%":500,height:"100%",background:C.sb,borderLeft:`1px solid ${C.border}`,zIndex:199,overflowY:"auto",padding:isMobile?16:20,boxShadow:"-10px 0 40px rgba(0,0,0,.6)",display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:C.text}}>📊 Side-by-Side Comparison</div>
                <div style={{fontSize:9,color:C.dim,fontFamily:"monospace",marginTop:2}}>{conds.length} conditions compared</div>
              </div>
              <button onClick={()=>setDrawerOpen(false)} style={{background:"none",border:`1px solid ${C.border}`,color:C.muted,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12}}>✕ Close</button>
            </div>
            <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:9,padding:14}}>
              <div style={{fontSize:9,color:C.dim,fontFamily:"monospace",textTransform:"uppercase",marginBottom:12}}>Confidence Overview</div>
              {conds.map((c,i)=>(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span style={{color:C.muted,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginRight:8}}>{c.name}</span>
                    <span style={{color:confColor(c.confidence||0),fontWeight:700,flexShrink:0}}>{Math.round((c.confidence||0)*100)}%</span>
                  </div>
                  <div style={{height:7,background:C.s3,borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.round((c.confidence||0)*100)}%`,background:confColor(c.confidence||0),borderRadius:4}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:9,padding:14,overflowX:"auto"}}>
              <div style={{fontSize:9,color:C.dim,fontFamily:"monospace",textTransform:"uppercase",marginBottom:10}}>Comparison Table</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:420}}>
                <thead><tr>{["Disease","ICD","Urgency","Prevalence","Contagious","Specialist"].map(h=>(
                  <th key={h} style={{padding:"6px 8px",textAlign:"left",fontSize:9,color:C.dim,fontFamily:"monospace",textTransform:"uppercase",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>
                ))}</tr></thead>
                <tbody>{conds.map((c,i)=>(
                  <tr key={i} style={{background:i%2===0?"transparent":"rgba(255,255,255,.02)"}}>
                    <td style={{padding:"7px 8px",color:C.text,fontWeight:600}}>{c.name}</td>
                    <td style={{padding:"7px 8px",fontFamily:"monospace",fontSize:9,color:C.dim}}>{c.icd}</td>
                    <td style={{padding:"7px 8px"}}><span style={{color:urgencyColors[c.urgency]||C.muted,fontWeight:700,fontSize:10}}>{c.urgency}</span></td>
                    <td style={{padding:"7px 8px",color:C.muted}}>{c.prevalence}</td>
                    <td style={{padding:"7px 8px",color:c.contagious?"#ff7a90":C.dim}}>{c.contagious?"🦠 Yes":"No"}</td>
                    <td style={{padding:"7px 8px",color:"#7bb8ff"}}>{c.specialist}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {conds.map((c,i)=>(
              <div key={i} style={{background:C.s2,border:`1px solid ${C.border}`,borderRadius:9,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,gap:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{c.name}</div>
                    <div style={{fontFamily:"monospace",fontSize:9,color:C.dim,marginTop:2}}>{c.icd} · {Math.round((c.confidence||0)*100)}%</div>
                  </div>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:4,border:`1px solid ${urgencyColors[c.urgency]||C.dim}`,color:urgencyColors[c.urgency]||C.dim,flexShrink:0,alignSelf:"flex-start"}}>{c.urgency}</span>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>{c.key_features?.map((f,j)=><span key={j} style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:C.sb,border:`1px solid ${C.border}`,color:C.muted}}>{f}</span>)}</div>
                {c.duration_insight&&<div style={{fontSize:10,color:C.google,marginBottom:6,fontStyle:"italic",lineHeight:1.5}}>⏱ {c.duration_insight}</div>}
                {c.recommendation&&<div style={{fontSize:11,color:C.muted,borderTop:`1px solid ${C.border}`,paddingTop:8,lineHeight:1.5}}>💊 {c.recommendation}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
