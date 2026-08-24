import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { gamesRouter } from './features/games/games_router.ts';
import { translationsRouter } from './features/translations/translations_router.ts';
import { glossaryRouter } from './features/glossary/glossary_router.ts';
import { geminiRouter } from './features/gemini/gemini_router.ts';
import { settingsRouter } from './features/settings/settings_router.ts';
import { authRouter } from './features/auth/auth_router.ts';
import { authMiddleware } from './features/auth/auth_middleware.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middlewares
app.use(cors());
// Increased limit for large game translation JSON imports
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(authMiddleware);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/games', gamesRouter);
app.use('/api', translationsRouter);
app.use('/api', glossaryRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static build if dist/client exists (production mode)
const clientDistPath = path.resolve('dist/client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`=========================================`);
  console.log(`🎮 Local Game Translator Server Running!`);
  console.log(`📡 Host Interface: ${HOST}:${PORT}`);
  console.log(`🌐 Web UI: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`=========================================`);
});
