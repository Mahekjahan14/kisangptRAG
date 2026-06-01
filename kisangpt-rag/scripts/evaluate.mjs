import fs from 'fs';
import { retrieve, answer } from '../api/rag.mjs';
const qs=JSON.parse(fs.readFileSync('data/eval/questions.json','utf8'));
let hit1=0, hit3=0, mrr=0, quality=0;
const rows=[];
for(const q of qs){
 const hits=retrieve(q.question,5);
 const ids=hits.map(h=>h.id);
 const rank=ids.indexOf(q.expected_doc)+1;
 if(rank===1) hit1++; if(rank>0 && rank<=3) hit3++; if(rank>0) mrr+=1/rank;
 const ans=answer(q.question).answer.toLowerCase();
 const matched=q.answer_keywords.filter(k=>ans.includes(k.toLowerCase())).length;
 const score=matched/q.answer_keywords.length; quality+=score;
 rows.push({question:q.question, expected:q.expected_doc, top5:ids, rank:rank||null, keyword_quality:Number(score.toFixed(2))});
}
const report={total:qs.length, retrieval:{hit_at_1:hit1/qs.length, hit_at_3:hit3/qs.length, mrr:mrr/qs.length}, answer_quality:{keyword_coverage:quality/qs.length}, rows};
fs.writeFileSync('data/eval/report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
