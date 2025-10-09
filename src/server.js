// server.js
import 'dotenv/config';
import path from 'node:path';
import express from 'express';
import cors from 'cors';

import membersRouter from './routes/members.js';
import uploadsRouter from './routes/uploads.js';
import newsRouter from "./routes/news.js";
import uploadsNewsRouter from "./routes/uploadsNews.js";
import newsAdminRouter from "./routes/newsAdmin.js";
import journlasRouter from "./routes/journlas.js";
import uploadsJournalsRouter from "./routes/uploadsJournals.js";
import journalsAdminRouter from "./routes/journalsAdmin.js";

const app = express();
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ⬇️ PENTING: router upload HARUS sebelum static
app.use('/uploads', uploadsRouter);

// Static hanya untuk GET file yang sudah ada
app.use('/uploads', express.static(UPLOADS_DIR));

app.use('/members', membersRouter);
app.use("/news", newsRouter);
app.use("/uploads", uploadsNewsRouter);
app.use("/admin/news", newsAdminRouter);
app.use("/journals", journlasRouter);
app.use("/uploads", uploadsJournalsRouter);
app.use("/admin/journals", journalsAdminRouter);

app.use("/uploads", express.static(UPLOADS_DIR));


app.get('/health', (_, res) => res.json({ ok: true }));
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running http://localhost:${PORT}`);
  console.log('Serving /uploads from:', UPLOADS_DIR);
});
