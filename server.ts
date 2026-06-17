import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  app.post('/api/gemini/generateContent', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'API Key missing on server' });
      }
      const ai = new GoogleGenAI({ apiKey });
      const params = req.body;
      
      const response = await ai.models.generateContent(params);
      
      res.json({
        text: response.text,
        candidates: response.candidates,
        usageMetadata: response.usageMetadata
      });
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      res.status(error.status || 500).json({ error: error.message, status: error.status });
    }
  });

  app.post('/api/gemini/generateSpeech', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'API Key missing on server' });
      }
      const ai = new GoogleGenAI({ apiKey });
      const params = req.body;
      
      const response = await ai.models.generateContent(params);
      
      res.json({
        text: response.text,
        candidates: response.candidates,
        usageMetadata: response.usageMetadata
      });
    } catch (error: any) {
      console.error("Gemini Proxy TTS Error:", error);
      res.status(error.status || 500).json({ error: error.message, status: error.status });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
