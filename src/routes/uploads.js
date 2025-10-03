import express from 'express';
import multer from 'multer';
import { supabase } from '../supabase.js';
import path from 'node:path';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const BUCKET = process.env.STORAGE_BUCKET || 'avatars';

router.post('/avatar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { originalname, mimetype, buffer } = req.file;
    const { slug } = req.body; // opsional, untuk penamaan

    // Validasi mime
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(mimetype)) {
      return res.status(400).json({ error: 'Only image files are allowed' });
    }

    // nama file: members/<slug>-<timestamp>.<ext>
    const ext = path.extname(originalname) || '.jpg';
    const safeSlug = (slug || 'member').toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const objectPath = `members/${safeSlug}-${Date.now()}${ext}`;

    // upload ke storage
    const { error: upErr } = await supabase
      .storage.from(BUCKET)
      .upload(objectPath, buffer, { contentType: mimetype, upsert: true });

    if (upErr) throw upErr;

    // ambil public URL
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
    return res.status(201).json({ path: objectPath, url: pub.publicUrl });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

export default router;
