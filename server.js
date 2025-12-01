// server.js
import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// === Routers (tetap seperti punyamu) ===
import membersRouter from './src/routes/members.js';
import uploadsRouter from './src/routes/uploads.js';
import newsRouter from './src/routes/news.js';
import uploadsNewsRouter from './src/routes/uploadsNews.js';
import newsAdminRouter from './src/routes/newsAdmin.js';
import journalsRouter from './src/routes/journlas.js';
import uploadsJournalsRouter from './src/routes/uploadsJournals.js';
import journalsAdminRouter from './src/routes/journalsAdmin.js';
import collaborationsRouter from './src/routes/collaborations.js';
import { collabUploadRoute } from './src/routes/uploads.js';
import projectsRouter from './src/routes/projects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BUILD_DIR = path.join(__dirname, 'build');      // ⬅️ hasil build React
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

// --- middleware umum ---
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// --- upload routes (POST/PUT/DELETE) ---
app.use('/api/uploads', uploadsRouter);
app.use('/api/uploads', uploadsNewsRouter);
app.use('/api/uploads', uploadsJournalsRouter);

// --- static uploads (GET) ---
app.use('/api/uploads', express.static(UPLOADS_DIR));

// --- API routes utama (diprefix /api) ---
app.use('/api/members', membersRouter);
app.use('/api/news', newsRouter);
app.use('/api/admin/news', newsAdminRouter);
app.use('/api/journals', journalsRouter);
app.use('/api/admin/journals', journalsAdminRouter);
app.use('/api/collaborations', collaborationsRouter);
app.use('/api', projectsRouter);
collabUploadRoute(app); // biarkan kalau memang membutuhkan app instance

// --- health check ---
app.get('/health', (_, res) => res.json({ ok: true }));

// --- STATIC React build ---
app.use(express.static(BUILD_DIR));

// --- SPA fallback (HARUS terakhir, setelah semua /api/*) ---
app.get('*', (req, res) => {
  res.sendFile(path.join(BUILD_DIR, 'index.html'));
});

// --- error handler ---
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
  console.log('Serving /api/uploads from:', UPLOADS_DIR);
});