import express from "express";
import { db } from "../db.js";

const router = express.Router();

const slugify = (s) => (s || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

router.post("/", async (req, res) => {
  try {
    const { title, authors, venue, year, type, doi, pdf_url, thumb_url, abstract, keywords } = req.body;
    if (!title) return res.status(400).json({ error: "Judul wajib diisi" });

    const slug = slugify(`${title}-${year || ""}`);
    const authors_text = Array.isArray(authors) ? authors.join(", ") : (authors || "");
    const authors_json = Array.isArray(authors) ? JSON.stringify(authors) : null;
    const keywords_json = Array.isArray(keywords) ? JSON.stringify(keywords) : null;

    await db.query(
      `INSERT INTO journals 
        (slug, title, authors_text, authors_json, venue, year, type, doi, pdf_url, thumb_url, abstract, keywords_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, title, authors_text, authors_json, venue, year, type || 'Journal', doi, pdf_url, thumb_url, abstract, keywords_json]
    );
    res.json({ message: "Jurnal ditambahkan", slug });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, authors, venue, year, type, doi, pdf_url, thumb_url, abstract, keywords } = req.body;

    const [[old]] = await db.query(`SELECT id FROM journals WHERE slug=?`, [slug]);
    if (!old) return res.status(404).json({ error: "Not found" });

    const authors_text = Array.isArray(authors) ? authors.join(", ") : (authors || "");
    const authors_json = Array.isArray(authors) ? JSON.stringify(authors) : null;
    const keywords_json = Array.isArray(keywords) ? JSON.stringify(keywords) : null;

    await db.query(
      `UPDATE journals SET title=?, authors_text=?, authors_json=?, venue=?, year=?, type=?, doi=?, 
                            pdf_url=?, thumb_url=?, abstract=?, keywords_json=?
       WHERE slug=?`,
      [title, authors_text, authors_json, venue, year, type, doi, pdf_url, thumb_url, abstract, keywords_json, slug]
    );
    res.json({ message: "Jurnal diperbarui" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [[old]] = await db.query(`SELECT id FROM journals WHERE slug=?`, [slug]);
    if (!old) return res.status(404).json({ error: "Not found" });
    await db.query(`DELETE FROM journals WHERE slug=?`, [slug]);
    res.json({ message: "Jurnal dihapus" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
