import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import membersRouter from './routes/members.js'; // ⬅️ relatif & ada .js

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/members', membersRouter);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Back-end IS Lab running on http://localhost:${PORT}`));
    