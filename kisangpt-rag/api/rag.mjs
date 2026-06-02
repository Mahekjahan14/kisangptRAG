
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STOP = new Set('a an the and or of in on for to with from by is are was were be been being as at into this that it its should can could would about before after use using under over where when how what why which'.split(' '));
function tokenize(text){ 
  return (text||'').toLowerCase()
    .replace(/[^a-z0-9\s-]/g,' ')
    .split(/\s+/)
    .map(w => w.replace(/(?:ing|ed|es|s|ly)$/, ''))
    .filter(w=>w.length>2&&!STOP.has(w)); 
}
function parseMeta(text){ const meta={}; const m=text.match(/^---([\s\S]*?)---/); if(m){ for(const line of m[1].split('\n')){ const idx=line.indexOf(':'); if(idx>0) meta[line.slice(0,idx).trim()]=line.slice(idx+1).trim(); }} return meta; }
function loadDocs(){ const dir=path.join(__dirname, '..', 'data', 'docs'); return fs.readdirSync(dir).filter(f=>f.endsWith('.md')).map(file=>{ const text=fs.readFileSync(path.join(dir,file),'utf8'); const meta=parseMeta(text); return {file, id:meta.id, title:meta.title, url:meta.source_url, publisher:meta.publisher, text:text.replace(/^---[\s\S]*?---/,'').trim()}; }); }

let docs = null;
let docTokens = null;
let df = null;
let N = 0;
let docVecs = null;

function initRAG() {
  if (docs) return;
  docs = loadDocs();
  docTokens = docs.map(d=>tokenize(`${d.title} ${d.text}`));
  df = {}; 
  for(const toks of docTokens){ 
    for(const t of new Set(toks)) df[t]=(df[t]||0)+1; 
  }
  N = docs.length;
  docVecs = docTokens.map(vector);
}

function vector(tokens){ const counts={}; for(const t of tokens) counts[t]=(counts[t]||0)+1; const v={}; for(const [t,c] of Object.entries(counts)){ const idf=Math.log((N+1)/((df[t]||0)+1))+1; v[t]=c*idf; } return v; }
function cosine(a,b){ let dot=0,na=0,nb=0; for(const v of Object.values(a)) na+=v*v; for(const v of Object.values(b)) nb+=v*v; for(const [k,v] of Object.entries(a)) if(b[k]) dot+=v*b[k]; return dot/(Math.sqrt(na)*Math.sqrt(nb)||1); }

export function retrieve(query,k=5){
  initRAG();
  const tokens = tokenize(query);
  const qv = vector(tokens);
  return docs.map((d,i) => {
    let score = cosine(qv, docVecs[i]);
    const titleText = d.title.toLowerCase();
    let titleMatch = 0;
    for (const t of tokens) {
      if (titleText.includes(t)) {
        titleMatch += 0.06;
      }
    }
    score += titleMatch;
    return {...d, score: Math.min(score, 1.0)};
  }).sort((a,b)=>b.score-a.score).slice(0,k);
}
export function answer(query){
  const hits = retrieve(query, 5);
  const topScore = hits[0] ? hits[0].score : 0;
  if (topScore < 0.18) {
    return {
      answer: "I could not find strong relevant information in the documents. Please ask with crop name, soil type, or location.",
      sources: hits
    };
  }
  const context = hits.filter(h => h.score > 0.02);
  if (!context.length) return {answer:"I could not find enough matching agriculture documents in the local corpus. Please add crop, season, location, symptoms or topic details.", sources:hits};
  const bullets=context.slice(0,3).map(h=>`- ${h.title}: ${h.text.split('\n').filter(Boolean).slice(0,2).join(' ')}`);
  const ans=`Based on the retrieved agriculture documents:\n\n${bullets.join('\n')}\n\nRecommended response: first confirm the farmer's crop, location, season, soil type and exact symptoms. Use preventive and integrated practices first. For pesticides, fertilizer dose, crop insurance or government scheme details, verify with the latest local agriculture office/KVK or product label before action.`;
  return {answer:ans, sources:hits};
}
