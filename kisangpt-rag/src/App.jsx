import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Send, Sprout, BookOpen, BarChart3, HelpCircle, Award, Compass, 
  Mic, MicOff, Settings, Calendar, Sliders, ArrowRight, CheckCircle2,
  Database, Info, AlertTriangle, RefreshCw, Search
} from 'lucide-react';
import './style.css';

function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'matrix', 'calendar'
  const [message, setMessage] = useState('What crops are suitable for red soil?');
  const [chat, setChat] = useState([]);
  const [sources, setSources] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  
  // Custom workstation states
  const [selectedSoil, setSelectedSoil] = useState('red');
  const [selectedTimelineCrop, setSelectedTimelineCrop] = useState('cotton');
  const [inspectIndex, setInspectIndex] = useState(null);
  const [libSearchQuery, setLibSearchQuery] = useState('');

  const chatContainerRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    fetch('/api/sources')
      .then((r) => r.json())
      .then(setSources)
      .catch((err) => console.error("Error loading sources:", err));

    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // Indian English, supports local accents

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
      };

      rec.onerror = (e) => {
        console.error("Speech Recognition Error:", e.error);
        setSpeechError(e.error === 'not-allowed' ? 'Mic access denied.' : 'Voice input failed.');
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat, loading]);

  async function ask(queryText) {
    const q = typeof queryText === 'string' ? queryText : message;
    if (!q.trim()) return;

    setActiveTab('chat');
    setChat((c) => [...c, { role: 'user', text: q }]);
    if (typeof queryText !== 'string') {
      setMessage('');
    }
    setLoading(true);

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const data = await r.json();
      if (data.error) {
        setChat((c) => [...c, { role: 'bot', text: `Server Error: ${data.error}`, query: q }]);
      } else {
        setChat((c) => [...c, { role: 'bot', text: data.answer, sources: data.sources, query: q }]);
      }
    } catch (err) {
      setChat((c) => [
        ...c,
        { role: 'bot', text: "Error connecting to local RAG service. Please verify server status.", query: q },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or MS Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const getScoreClass = (score) => {
    if (score >= 0.4) return 'card-score';
    if (score >= 0.18) return 'card-score mid';
    return 'card-score low';
  };

  const getConfidenceLevel = (score) => {
    if (score >= 0.4) return { text: 'High Confidence', class: 'confidence-high' };
    if (score >= 0.18) return { text: 'Medium Confidence', class: 'confidence-mid' };
    return { text: 'Blocked / Low Relevance', class: 'confidence-low' };
  };

  // Helper to extract keywords from query
  const getQueryKeywords = (query) => {
    if (!query) return [];
    const stopWords = new Set('a an the and or of in on for to with from by is are was were be been being as at into this that it its should can could would about before after use using under over where when how what why which'.split(' '));
    return query.toLowerCase()
      .replace(/[^a-z0-9\s-]/g,' ')
      .split(/\s+/)
      .map(w => w.replace(/(?:ing|ed|es|s|ly)$/, ''))
      .filter(w => w.length > 2 && !stopWords.has(w));
  };

  // Static matrix & timeline data
  const soilData = {
    red: {
      title: "Red Soil Profile",
      ph: "6.0 - 7.0 (Slightly Acidic)",
      density: "Light textured, sandy-clay loam",
      retention: "Low water-holding capacity, highly permeable",
      crops: ["Groundnut", "Pigeon Pea (Redgram)", "Finger Millet (Ragi)", "Castor", "Cowpea", "Chillies"],
      enrichment: "Incorporate Farmyard Manure (FYM) or green leaf compost to build organic matter. Correct phosphorus deficiencies using Single Super Phosphate (SSP) and supplement zinc.",
      tip: "Apply thick mulching and prioritize drip irrigation to cope with dry spells and rapid moisture evaporation."
    },
    black: {
      title: "Black Soil (Regur) Profile",
      ph: "7.2 - 8.5 (Neutral to Alkaline)",
      density: "Fine-textured, rich clay loam",
      retention: "High water-retention, contracts/cracks when dry",
      crops: ["Cotton", "Soybeans", "Wheat", "Rabi Jowar", "Bengal Gram (Chickpea)", "Sugarcane"],
      enrichment: "Ensure strict drainage to avoid water stagnation. Apply gypsum to improve soil aeration, and feed nitrogen and phosphorus based on testing.",
      tip: "Utilize deep cracks to conserve post-monsoon subsoil moisture for Rabi wheat and gram."
    },
    alluvial: {
      title: "Alluvial Soil Profile",
      ph: "6.5 - 7.8 (Highly Fertile)",
      density: "Varying loam structures (Khadar/Bhangar)",
      retention: "Moderate to high retention, ideal aeration",
      crops: ["Rice", "Wheat", "Sugarcane", "Jute", "Mustard", "Lentil Pulses"],
      enrichment: "Maintain nutrient balance using NPK fertilizers in split doses. Rotate crops with leguminous pulses to sustain natural nitrogen fixing.",
      tip: "Ideal for high-water demanding crops like paddy under systematic flooding and tubewell irrigation."
    },
    laterite: {
      title: "Laterite Soil Profile",
      ph: "4.5 - 5.5 (Acidic)",
      density: "Leached iron-aluminum gravelly soil",
      retention: "Low water retention, low organic carbon",
      crops: ["Cashew", "Tea", "Coffee", "Rubber", "Coconut"],
      enrichment: "Apply agricultural lime or dolomite to correct heavy acidity. Feed heavily with organic manures and chemical potassium.",
      tip: "Adopt terraced orchard farming and contour bunding to prevent heavy rain erosion."
    },
    sandy: {
      title: "Sandy / Desert Soil Profile",
      ph: "7.6 - 8.4 (Alkaline)",
      density: "Coarse sand, highly porous",
      retention: "Extremely low moisture holding, highly permeable",
      crops: ["Pearl Millet (Bajra)", "Guar (Cluster Bean)", "Moth Bean", "Watermelon"],
      enrichment: "Regular addition of bio-compost and green manure. Utilize biofertilizers like Azotobacter to stimulate early root structure.",
      tip: "Deploy strictly closed sprinkler systems to minimize critical evaporation losses."
    }
  };

  const cropTimelineData = {
    cotton: [
      { month: "May - June", phase: "Sowing & Germination", desc: "Sow Bt Cotton with first pre-monsoon shower. Space seeds 90x60 cm. Check germination rate within 7 days." },
      { month: "July", phase: "Thinning & Weeding", desc: "Perform thinning to retain single healthy shoots. Implement first mechanical hand-weeding before crop-weed competition hits." },
      { month: "August - September", phase: "Squaring & Flowering", desc: "Monitor squaring and yellow flowers. Install pheromone traps (5/acre) to monitor pink bollworm arrival thresholds." },
      { month: "October - November", phase: "Boll Development", desc: "Provide life-saving irrigation. Spray NSKE 5% or neem oil to discourage early bollworm entry into developed bolls." },
      { month: "December - January", phase: "Harvest / picking", desc: "Carry out clean cotton pickings in sunny weather. Keep dry fibers away from soil. Chop residue to break bollworm cycle." }
    ],
    rice: [
      { month: "June", phase: "Nursery Preparation", desc: "TREAT seed with Carbendazim. Raise wet nursery. Keep nursery weed-free. Maintain thin layer of water." },
      { month: "July", phase: "Line Transplanting", desc: "Transplant 25-30 days healthy seedlings. Practice line transplanting (20x15 cm) for easy weeding and pest scouting." },
      { month: "August", phase: "Vegetative / Tillering", desc: "Apply first nitrogen split. Maintain 2-5 cm standing water. Use leaf color charts (LCC) to verify nitrogen doses." },
      { month: "September - October", phase: "Panicle Initiation & Flowering", desc: "Scout fields for blast (sheath lesions) and brown planthopper (BPH). Keep fields saturated but avoid heavy waterlogging." },
      { month: "November", phase: "Harvest & Safe Drying", desc: "Drain water 10 days before harvest. Cut stalks close to ground. Dry grains to below 14% moisture before storage." }
    ],
    wheat: [
      { month: "November", phase: "Land Prep & Sowing", desc: "Prepare fine seedbed. Treat seeds with Trichoderma. Sow using seed drill at 4-5 cm depth for uniform germination." },
      { month: "December", phase: "Crown Root Initiation (CRI)", desc: "CRITICAL 21-day stage. Deliver first light irrigation. Delaying this stage triggers severe, irreversible yield losses." },
      { month: "January - February", phase: "Flowering & Tillering", desc: "Apply second split of urea. Maintain adequate moisture during jointing and head emergence phases." },
      { month: "March", phase: "Milking / Grain Filling", desc: "Deliver final irrigation. Hot dry winds (terminal heat) pose risk; irrigation mitigates soil/canopy temperatures." },
      { month: "April", phase: "Harvest & Threshing", desc: "Thresh harvested crop under clear blue skies. Ensure grain moisture is around 12% for safe warehousing." }
    ]
  };

  const filteredLibrary = (sources && Array.isArray(sources.documents)) ? sources.documents.filter(d => 
    d.title.toLowerCase().includes(libSearchQuery.toLowerCase()) ||
    d.publisher.toLowerCase().includes(libSearchQuery.toLowerCase()) ||
    d.id.toLowerCase().includes(libSearchQuery.toLowerCase())
  ) : [];

  return (
    <div className="app">
      <aside>
        <h1>
          <Sprout size={32} /> KisanRAG
        </h1>
        <p className="description">
          Advanced agricultural RAG workstation. Uses TF-IDF retrieval, local text synthesis, and robust confidence checks.
        </p>

        {/* Tab Controls */}
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <Compass size={16} /> Advisory Chat
          </button>
          <button 
            className={`nav-tab ${activeTab === 'matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('matrix')}
          >
            <Sliders size={16} /> Soil-Crop Matrix
          </button>
          <button 
            className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <Calendar size={16} /> Crop Calendar
          </button>
          <button 
            className={`nav-tab ${activeTab === 'library' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <Database size={16} /> Library Explorer
          </button>
        </div>

        {/* Library Mini Search (Sidebar) */}
        {activeTab !== 'library' && (
          <div className="sidebar-search">
            <h3>Quick Documents</h3>
            <div className="stat">
              <BookOpen size={16} /> {sources?.count || 58} documents loaded
            </div>
            <div className="sample-container" style={{ maxHeight: '150px' }}>
              {['What are rainy season crops?', 'What is IPM?', 'What crops are suitable for red soil?'].map((q, idx) => (
                <button key={idx} className="sample" onClick={() => ask(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="sidebar-search">
            <h3>Library Stats</h3>
            <div className="stat" style={{ display: 'block', padding: '10px' }}>
              <div style={{ fontSize: '11px', opacity: 0.6 }}>CORPUS VERSION</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>ICAR-FAO-TNAU 2026</div>
            </div>
          </div>
        )}
      </aside>

      <main>
        {/* Top Header Widget */}
        <section className="hero">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2>KisanRAG Workstation</h2>
              <p>
                Local semantic retrieval engine mapping Indian cropping timelines, regional soil suitabilities, and integrated pest advisories.
              </p>
            </div>
            <div className="rag-status-badge">
              <CheckCircle2 size={14} /> Local RAG Active
            </div>
          </div>
        </section>

        {/* TAB CONTENT: ADVISORY CHAT */}
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: 'calc(100vh - 220px)' }}>
            <div className="chat-container" ref={chatContainerRef} style={{ flex: 1 }}>
              {chat.length === 0 ? (
                <div className="msg bot" style={{ maxWidth: '100%', margin: '40px auto 0 auto', textAlign: 'center' }}>
                  <Compass size={48} style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
                  <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', marginBottom: '8px' }}>
                    Interactive Advisory Chat
                  </h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', maxWidth: '500px', margin: '0 auto' }}>
                    Enter crop name, location, season, or soil symptoms. Out-of-domain queries are blocked automatically by our 0.18 top-score confidence analyzer.
                  </p>
                  
                  <div className="sample-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '24px', textAlign: 'left' }}>
                    <div className="sample-card" onClick={() => ask('What crops are suitable for red soil?')}>
                      <h4>🌱 Soil Suitability</h4>
                      <p>What crops are suitable for red soil?</p>
                    </div>
                    <div className="sample-card" onClick={() => ask('What are rainy season crops?')}>
                      <h4>🌧️ Cropping Seasons</h4>
                      <p>What are rainy season crops?</p>
                    </div>
                    <div className="sample-card" onClick={() => ask('How to manage pink bollworm in cotton?')}>
                      <h4>🐛 IPM & Pest Control</h4>
                      <p>How to manage pink bollworm in cotton?</p>
                    </div>
                    <div className="sample-card" onClick={() => ask('What are critical irrigation stages in wheat?')}>
                      <h4>💧 Irrigation timelines</h4>
                      <p>What are critical irrigation stages in wheat?</p>
                    </div>
                  </div>
                </div>
              ) : (
                chat.map((m, i) => {
                  const topScore = m.sources && m.sources[0] ? m.sources[0].score : 0;
                  const confidence = getConfidenceLevel(topScore);
                  return (
                    <div key={i} className={'msg ' + m.role}>
                      <pre>{m.text}</pre>
                      
                      {/* RAG sources indicator */}
                      {m.sources && m.sources.filter(s => s.score > 0.01).length > 0 && (
                        <div>
                          <div className="cards-header-bar">
                            <div className="cards-title">
                              <BookOpen size={14} /> RAG Citations
                            </div>
                            <button 
                              className="inspect-toggle-btn"
                              onClick={() => setInspectIndex(inspectIndex === i ? null : i)}
                            >
                              <Settings size={12} /> {inspectIndex === i ? "Hide Diagnostic" : "Inspect RAG"}
                            </button>
                          </div>

                          {/* Dynamic RAG Inspection Diagnostics panel */}
                          {inspectIndex === i && (
                            <div className="diagnostics-panel">
                              <h4>RAG Developer Diagnostics</h4>
                              <div className="diag-grid">
                                <div className="diag-card">
                                  <span className="diag-lbl">Confidence Status</span>
                                  <span className={`diag-val ${confidence.class}`}>{confidence.text}</span>
                                  <div className="gauge-track">
                                    <div className="gauge-fill" style={{ width: `${Math.min(topScore * 100, 100)}%`, backgroundColor: topScore >= 0.4 ? 'var(--color-primary)' : topScore >= 0.18 ? 'var(--color-accent)' : '#ef4444' }}></div>
                                  </div>
                                  <span className="diag-lbl" style={{ marginTop: '4px' }}>Top Score: {topScore.toFixed(4)}</span>
                                </div>
                                <div className="diag-card">
                                  <span className="diag-lbl">Matched Query Tokens</span>
                                  <div className="token-badges">
                                    {getQueryKeywords(m.query).map((tok, tIdx) => (
                                      <span key={tIdx} className="token-badge">{tok}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div style={{ marginTop: '14px' }}>
                                <span className="diag-lbl" style={{ marginBottom: '6px', display: 'block' }}>Top Document Distribution (Scores)</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {m.sources.slice(0, 4).map((s, sIdx) => (
                                    <div key={sIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span className="diag-lbl" style={{ width: '60px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{s.id}</span>
                                      <div className="chart-bar-track">
                                        <div className="chart-bar-fill" style={{ width: `${s.score * 100}%` }}></div>
                                      </div>
                                      <span className="diag-lbl" style={{ width: '45px', textAlign: 'right' }}>{s.score.toFixed(3)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Citations list */}
                          <div className="cards">
                            {m.sources.slice(0, 3).map((s, idx) => (
                              <a key={idx} className="card" href={s.url} target="_blank" rel="noopener noreferrer">
                                <div>
                                  <b>{s.title}</b>
                                  <span className="card-topic">
                                    File: {s.file.split('/').pop()}
                                  </span>
                                </div>
                                <div className="card-meta">
                                  <span className="card-pub">{s.publisher} · {s.year}</span>
                                  <span className={getScoreClass(s.score)}>
                                    score {s.score.toFixed(3)}
                                  </span>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              
              {loading && (
                <div className="msg bot bot-thinking">
                  Retrieving matching agriculture records...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="input-panel" style={{ paddingBottom: '10px' }}>
              {speechError && (
                <div className="speech-error-indicator">
                  <AlertTriangle size={12} /> {speechError}
                </div>
              )}
              <div className="input-container">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && ask()}
                  placeholder="Ask a crop advisory, soil chemistry, or calendar timeline question..."
                />
                
                {/* Microphone integration */}
                <button 
                  className={`mic-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleListening}
                  title="Speak in English/Telugu/Hindi"
                  style={{ background: 'transparent', padding: '0 8px', boxShadow: 'none', border: 0, color: isListening ? '#ef4444' : 'var(--color-text-muted)' }}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <button onClick={ask}>
                  <Send size={16} /> Ask Advisor
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: SOIL & CROP SUITABILITY MATRIX */}
        {activeTab === 'matrix' && (
          <div className="tab-pane-content" style={{ animation: 'slideUp 0.4s ease' }}>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '20px' }}>
              {Object.keys(soilData).map((soil) => (
                <button
                  key={soil}
                  className={`soil-select-btn ${selectedSoil === soil ? 'active' : ''}`}
                  onClick={() => setSelectedSoil(soil)}
                >
                  🌱 {soil.charAt(0).toUpperCase() + soil.slice(1)} Soil
                </button>
              ))}
            </div>

            <div className="matrix-profile-card">
              <div className="matrix-profile-header">
                <h3>{soilData[selectedSoil].title}</h3>
                <span className="matrix-profile-badge">Active Suitability Matrix</span>
              </div>
              
              <div className="matrix-profile-grid">
                <div className="matrix-cell">
                  <span className="matrix-cell-lbl">Optimal pH Range</span>
                  <span className="matrix-cell-val">{soilData[selectedSoil].ph}</span>
                </div>
                <div className="matrix-cell">
                  <span className="matrix-cell-lbl">Soil Density & Texture</span>
                  <span className="matrix-cell-val">{soilData[selectedSoil].density}</span>
                </div>
                <div className="matrix-cell">
                  <span className="matrix-cell-lbl">Moisture Retention</span>
                  <span className="matrix-cell-val">{soilData[selectedSoil].retention}</span>
                </div>
              </div>

              <div className="matrix-desc-block">
                <h4>Recommended Suitable Crops</h4>
                <div className="matrix-crops-badge-list">
                  {soilData[selectedSoil].crops.map((crop, idx) => (
                    <button 
                      key={idx} 
                      className="matrix-crop-badge"
                      onClick={() => {
                        setMessage(`What crops are suitable in ${selectedSoil} soil?`);
                        ask(`What crops are suitable in ${selectedSoil} soil?`);
                      }}
                      title="Click to query this crop in RAG"
                    >
                      {crop} <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="matrix-desc-block">
                <h4>Soil Chemistry & Organic Fertilization Enrichment</h4>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', lineHeight: '1.6' }}>
                  {soilData[selectedSoil].enrichment}
                </p>
              </div>

              <div className="matrix-desc-block warning-block">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Info size={18} style={{ color: 'var(--color-primary)', marginTop: '2px' }} />
                  <div>
                    <h4>Agronomic Operations Advisory</h4>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                      {soilData[selectedSoil].tip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: CROP CALENDAR TIMELINE */}
        {activeTab === 'calendar' && (
          <div className="tab-pane-content" style={{ animation: 'slideUp 0.4s ease' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {['cotton', 'rice', 'wheat'].map((c) => (
                <button
                  key={c}
                  className={`soil-select-btn ${selectedTimelineCrop === c ? 'active' : ''}`}
                  onClick={() => setSelectedTimelineCrop(c)}
                  style={{ textTransform: 'capitalize' }}
                >
                  🌾 {c} Calendar
                </button>
              ))}
            </div>

            <div className="timeline-container">
              <h3 style={{ marginBottom: '18px', fontFamily: 'Outfit, sans-serif', fontSize: '20px', color: 'var(--color-emerald)' }}>
                {selectedTimelineCrop.toUpperCase()} Agronomic Operations Roadmap
              </h3>
              
              <div className="timeline-track">
                {cropTimelineData[selectedTimelineCrop].map((item, idx) => (
                  <div key={idx} className="timeline-step">
                    <div className="timeline-node">
                      <div className="timeline-node-dot"></div>
                    </div>
                    <div className="timeline-content-card">
                      <div className="timeline-meta-bar">
                        <span className="timeline-month">{item.month}</span>
                        <span className="timeline-phase">{item.phase}</span>
                      </div>
                      <p className="timeline-desc">{item.desc}</p>
                      <button 
                        className="timeline-query-btn"
                        onClick={() => ask(`How to manage ${selectedTimelineCrop} during ${item.phase.split(' & ')[0]} in ${item.month.split(' - ')[0]}?`)}
                      >
                        Ask RAG Advisor about this stage <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: LIBRARY EXPLORER */}
        {activeTab === 'library' && (
          <div className="tab-pane-content" style={{ animation: 'slideUp 0.4s ease' }}>
            <div className="search-bar-wrapper">
              <Search size={18} style={{ color: 'var(--color-text-muted)' }} />
              <input
                value={libSearchQuery}
                onChange={(e) => setLibSearchQuery(e.target.value)}
                placeholder="Search indexed corpus by title, code (e.g. DOC-012), year, or publisher..."
                className="library-search-input"
              />
              {libSearchQuery && (
                <button onClick={() => setLibSearchQuery('')} style={{ background: 'transparent', border: 0, color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '13px' }}>
                  Clear
                </button>
              )}
            </div>

            <div className="library-results-grid">
              {filteredLibrary.length === 0 ? (
                <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '40px' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>No matching documents found in index.</p>
                </div>
              ) : (
                filteredLibrary.map((doc, idx) => (
                  <div key={idx} className="library-doc-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span className="lib-doc-id">{doc.id}</span>
                      <span className="lib-doc-pub">{doc.publisher} · {doc.year}</span>
                    </div>
                    <h4>{doc.title}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      Topic: {doc.topic}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                      <button 
                        className="lib-query-action-btn"
                        onClick={() => ask(`Give me an advisory summary of ${doc.title}`)}
                      >
                        Query Advisor
                      </button>
                      <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="lib-source-action-btn">
                        Source Reference
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
