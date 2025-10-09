// src/routes/uploadsNews.js
import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

const router = express.Router();
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

// buat folder uploads/news kalau belum ada
const dir = path.join(UPLOADS_DIR, "news");
fs.mkdirSync(dir, { recursive: true });

// konfigurasi multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    const base = path.basename(file.originalname, path.extname(file.originalname));
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = base.replace(/[^a-z0-9_-]/gi, "-");
    cb(null, `${safe}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5 MB
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) {
      return cb(new Error("File harus berupa gambar (jpg/png/webp/gif)."));
    }
    cb(null, true);
  },
});

router.post("/news", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Tidak ada file" });
    const url = `/uploads/news/${req.file.filename}`;
    res.status(201).json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
