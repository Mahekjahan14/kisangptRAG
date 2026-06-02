import { answer } from './rag.mjs';
export default function handler(req,res){
  try {
    if(req.method!=='POST') return res.status(405).json({error:'Use POST'});
    const {message}=req.body||{};
    if(!message) return res.status(400).json({error:'message is required'});
    return res.status(200).json(answer(message));
  } catch (err) {
    return res.status(500).json({error: err.message});
  }
}
