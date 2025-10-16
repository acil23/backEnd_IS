import express from "express";
import {db} from "../db.js";

const router = express.Router();

// GET /collaborations  (public, untuk home)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id,name,organization,type,country,logo_url,description,link,created_at FROM collaborations ORDER BY created_at DESC"
    );
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/collaborations  (admin list with pagination + q)
router.get("/admin", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const perPage = parseInt(req.query.perPage || "10", 10);
    const q = (req.query.q || "").trim();

    const where = [];
    const args = [];
    if (q) {
      where.push("(name LIKE ? OR organization LIKE ?)");
      args.push(`%${q}%`, `%${q}%`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [[{ cnt }]] = await db.query(`SELECT COUNT(*) AS cnt FROM collaborations ${whereSql}`, args);
    const offset = (page - 1) * perPage;

    const [rows] = await db.query(
      `SELECT id,name,organization,type,country,logo_url,description,link,created_at
       FROM collaborations ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...args, perPage, offset]
    );

    res.json({ data: rows, count: cnt, page, perPage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/collaborations/:id
router.get("/admin/:id", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM collaborations WHERE id=?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/collaborations
router.post("/admin", async (req, res) => {
  try {
    const { name, organization, type, country, logo_url, description, link } = req.body;
    if (!name) return res.status(400).json({ error: "Nama wajib diisi" });

    const [r] = await db.query(
      "INSERT INTO collaborations (name,organization,type,country,logo_url,description,link) VALUES (?,?,?,?,?,?,?)",
      [name, organization || null, type || "other", country || null, logo_url || null, description || null, link || null]
    );
    res.json({ id: r.insertId, message: "Kolaborasi ditambahkan" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/collaborations/:id
router.put("/admin/:id", async (req, res) => {
  try {
    const { name, organization, type, country, logo_url, description, link } = req.body;
    const [r] = await db.query(
      `UPDATE collaborations SET
         name=?, organization=?, type=?, country=?, logo_url=?, description=?, link=?
       WHERE id=?`,
      [name, organization || null, type || "other", country || null, logo_url || null, description || null, link || null, req.params.id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Kolaborasi diperbarui" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/collaborations/:id
router.delete("/admin/:id", async (req, res) => {
  try {
    const [r] = await db.query("DELETE FROM collaborations WHERE id=?", [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Kolaborasi dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
