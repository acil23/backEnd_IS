import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

const router = express.Router();
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

const ensure = (p) => fs.mkdirSync(p, { recursive: true });
const dirPdf = path.join(UPLOADS_DIR, "journals", "pdf");
const dirThumb = path.join(UPLOADS_DIR, "journals", "thumbs");
ensure(dirPdf); ensure(dirThumb);

function mkStorage(folder, allowExt) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, folder),
    filename: (req, file, cb) => {
      const base = path.basename(file.originalname, path.extname(file.originalname));
      const ext = path.extname(file.originalname).toLowerCase();
      const safe = base.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
      cb(null, `${safe}-${Date.now()}${ext}`);
    },
  });
}

const uploadPdf = multer({
  storage: mkStorage(dirPdf),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") return cb(new Error("Hanya PDF"));
    cb(null, true);
  },
});

const uploadThumb = multer({
  storage: mkStorage(dirThumb),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype))
      return cb(new Error("Hanya gambar"));
    cb(null, true);
  },
});

router.post("/journals/pdf", uploadPdf.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.status(201).json({ url: `/uploads/journals/pdf/${req.file.filename}` });
});

router.post("/journals/thumb", uploadThumb.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  res.status(201).json({ url: `/uploads/journals/thumbs/${req.file.filename}` });
});

export default router;
