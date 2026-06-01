# KisanRAG — Domain-Specific RAG Chatbot

Domain: Indian agriculture advisory for crops, soil, irrigation, pest management, post-harvest, market linkage and RAG evaluation.

## Source corpus
This project includes 52 markdown documents in `data/docs`. Each file contains metadata: title, topic, publisher, year and original source URL. The corpus is derived as concise educational notes from public references including ICAR, MANAGE, TNAU, FAO, CGIAR and Government of India publications.

## Run locally
```bash
npm install
npm run dev
```

## Evaluate retrieval and answer quality
```bash
npm run eval
```
This writes `data/eval/report.json` with Hit@1, Hit@3, MRR and keyword coverage.

## Deploy on Vercel
1. Push this folder to GitHub.
2. Import repo in Vercel.
3. Framework: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. No API key is required because this demo uses local TF-IDF retrieval and extractive answer synthesis.

## API
- `POST /api/chat` body: `{ "message": "What is IPM?" }`
- `GET /api/sources`

## Notes
For a production RAG system, replace the local TF-IDF retriever with embeddings + vector DB and connect an LLM. Keep citations and evaluation.
