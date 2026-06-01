import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function handler(req,res){
  try {
    const manifestPath = path.join(__dirname, '..', 'data', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    res.status(200).json({count:manifest.length, documents:manifest});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
}
