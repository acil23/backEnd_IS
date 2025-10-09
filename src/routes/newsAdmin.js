// src/routes/newsAdmin.js
import express from "express";
import { db } from "../db.js";
const router = express.Router();

// CREATE berita baru
router.post("/", async (req, res) => {
  try {
    const { title, excerpt, content, category, image_url, published_at } = req.body;
    if (!title || !content) return res.status(400).json({ error: "Judul dan konten wajib diisi" });

    // generate slug otomatis
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await db.query(
      `INSERT INTO news (slug, title, excerpt, content, image_url, category, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [slug, title, excerpt, content, image_url, category || "Berita", published_at || new Date()]
    );
    res.json({ message: "Berita berhasil ditambahkan", slug });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// UPDATE berita
router.patch("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, excerpt, content, category, image_url, published_at } = req.body;
    const [[found]] = await db.query("SELECT id FROM news WHERE slug = ?", [slug]);
    if (!found) return res.status(404).json({ error: "Berita tidak ditemukan" });

    await db.query(
      `UPDATE news SET title=?, excerpt=?, content=?, image_url=?, category=?, published_at=?
       WHERE slug=?`,
      [title, excerpt, content, image_url, category, published_at, slug]
    );
    res.json({ message: "Berita berhasil diperbarui" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE berita
router.delete("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [[found]] = await db.query("SELECT id FROM news WHERE slug = ?", [slug]);
    if (!found) return res.status(404).json({ error: "Berita tidak ditemukan" });
    await db.query("DELETE FROM news WHERE slug = ?", [slug]);
    res.json({ message: "Berita dihapus" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
