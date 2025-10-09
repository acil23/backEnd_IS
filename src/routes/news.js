import express from "express";
import { db } from "../db.js";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { page = 1, perPage = 6, q = "", category = "" } = req.query;
    const p = Math.max(1, Number(page));
    const n = Math.min(24, Math.max(1, Number(perPage)));
    const off = (p - 1) * n;

    const cond = [], vals = [];
    if (q) {
      // gunakan LIKE; jika FULLTEXT tersedia, bisa diganti MATCH() AGAINST()
      cond.push("(title LIKE ? OR excerpt LIKE ?)");
      vals.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
      cond.push("category = ?");
      vals.push(category);
    }
    const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";

    const [rows]  = await db.query(
      `SELECT id, slug, title, excerpt, image_url AS image, category, published_at AS date
       FROM news
       ${where}
       ORDER BY published_at DESC, id DESC
       LIMIT ? OFFSET ?`, [...vals, n, off]
    );
    const [cnt]   = await db.query(`SELECT COUNT(*) c FROM news ${where}`, vals);

    res.json({ data: rows, count: cnt[0].c, page: p, perPage: n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [[row]] = await db.query(
      `SELECT id, slug, title, excerpt, content, image_url AS image, category, published_at AS date
       FROM news WHERE slug = ?`, [slug]
    );
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
