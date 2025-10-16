// routes/uploads.js
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';

const router = express.Router();
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };


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

// === UPLOAD LOGO KOLABORASI ===
const collabDir = path.join(process.cwd(), "uploads", "collab");
ensureDir(collabDir);

const collabStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, collabDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".png");
    cb(null, `collab-${Date.now()}${ext}`);
  },
});
const uploadCollabLogo = multer({ storage: collabStorage });

export function collabUploadRoute(app) {
  app.post("/uploads/collab/logo", uploadCollabLogo.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const rel = `/uploads/collab/${req.file.filename}`;
    res.json({ url: rel, filename: req.file.filename });
  });
}

export default router;
