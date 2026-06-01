import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Custom plugin to host serverless functions locally
function apiPlugin() {
  return {
    name: 'api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');
        
        if (url.pathname === '/api/chat' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { message } = JSON.parse(body || '{}');
              const { answer } = await import('./api/rag.mjs');
              res.setHeader('Content-Type', 'application/json');
              if (!message) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'message is required' }));
                return;
              }
              const response = answer(message);
              res.end(JSON.stringify(response));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        if (url.pathname === '/api/sources' && req.method === 'GET') {
          try {
            const manifestPath = path.join(process.cwd(), 'data', 'manifest.json');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ count: manifest.length, documents: manifest }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  server: {
    port: 3000,
    host: '0.0.0.0'
  }
});
