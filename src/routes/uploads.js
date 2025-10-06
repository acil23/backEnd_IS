// routes/uploads.js
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

const router = express.Router();
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const slug = (req.body.slug || 'member').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${slug}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/i.test(file.mimetype)) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

router.post('/avatar', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const url = `/uploads/avatars/${req.file.filename}`;
  res.status(201).json({ path: url, url });   // frontend simpan ini ke avatar_url
});

export default router;
