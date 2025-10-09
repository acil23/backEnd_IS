import express from "express";
import { db } from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { page = 1, perPage = 9, q = "", year = "", type = "" } = req.query;
    const p = Math.max(1, Number(page) || 1);
    const n = Math.min(50, Math.max(1, Number(perPage) || 9));
    const off = (p - 1) * n;

    const cond = [], vals = [];
    if (q) {
      cond.push("(title LIKE ? OR abstract LIKE ? OR authors_text LIKE ?)");
      vals.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (year) {
      cond.push("year = ?");
      vals.push(Number(year));
    }
    if (type) {
      cond.push("type = ?");
      vals.push(type);
    }
    const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";

    const [rows] = await db.query(
      `SELECT id, slug, title, authors_text AS authors, venue, year, type, doi, pdf_url, thumb_url
       FROM journals
       ${where}
       ORDER BY year DESC, id DESC
       LIMIT ? OFFSET ?`,
      [...vals, n, off]
    );
    const [cnt] = await db.query(`SELECT COUNT(*) c FROM journals ${where}`, vals);

    res.json({ data: rows, count: cnt[0].c, page: p, perPage: n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [[it]] = await db.query(
      `SELECT id, slug, title, authors_text AS authors, authors_json, venue, year, type, doi, 
              pdf_url, thumb_url, abstract, keywords_json
       FROM journals WHERE slug=?`, [slug]
    );
    if (!it) return res.status(404).json({ error: "Not found" });

    // parse optional json fields
    try { if (it.authors_json) it.authors_json = JSON.parse(it.authors_json); } catch {}
    try { if (it.keywords_json) it.keywords_json = JSON.parse(it.keywords_json); } catch {}

    res.json(it);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
