import express from "express";
import { db } from "../db.js";
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { q = "", position = "", faculty = "", program = "", page = 1, perPage = 6 } = req.query;
    const p = Number(page) || 1, n = Number(perPage) || 6, off = (p - 1) * n;

    const cond = [], vals = [];
    if (q) { cond.push("(name LIKE ? OR email LIKE ?)"); vals.push(`%${q}%`, `%${q}%`); }
    if (position) { cond.push("position = ?"); vals.push(position); }
    if (faculty)  { cond.push("faculty = ?");  vals.push(faculty); }
    if (program)  { cond.push("program = ?");  vals.push(program); }

    const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
    const [rows]  = await db.query(`SELECT * FROM members ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...vals, n, off]);
    const [count] = await db.query(`SELECT COUNT(*) as c FROM members ${where}`, vals);

    res.json({ data: rows, count: count[0].c, page: p, perPage: n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [[m]] = await db.query("SELECT * FROM members WHERE slug = ?", [slug]);
    if (!m) return res.status(404).json({ error: "Not found" });

    const [spec] = await db.query(`
      SELECT s.name FROM member_specialists ms
      JOIN specialists s ON s.id = ms.spec_id WHERE ms.member_id = ?`, [m.id]);

    const [skills] = await db.query(`SELECT skill_name FROM skills WHERE member_id = ?`, [m.id]);
    const [exps]   = await db.query(`SELECT id, role, org, period, bullets FROM experiences WHERE member_id = ?`, [m.id]);
    const [edus]   = await db.query(`SELECT id, degree, org, year, note FROM educations WHERE member_id = ?`, [m.id]);
    const [certs]  = await db.query(`SELECT id, cert_name FROM certifications WHERE member_id = ?`, [m.id]);
    const [soc]    = await db.query(`SELECT id, type, url FROM socials WHERE member_id = ?`, [m.id]);

    // parse bullets (JSON string) jika ada
    exps.forEach(e => { if (typeof e.bullets === "string") { try { e.bullets = JSON.parse(e.bullets); } catch {} } });

    res.json({
      ...m,
      member_specialists: spec.map(s => ({ spec: { name: s.name } })),
      skills: skills.map(s => ({ skill_name: s.skill_name })),
      experiences: exps,
      educations: edus,
      certifications: certs,
      socials: soc
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// CREATE
router.post('/', async (req, res) => {
  try {
    const {
      slug, name, title, position, faculty, program, email, avatar_url, bio,
      specialists = [], skills = [], experiences = [], educations = [], certifications = [], socials = []
    } = req.body;

    if (!slug || !name) return res.status(400).json({ error: 'slug & name required' });

    // insert member
    const [r] = await db.query(
      `INSERT INTO members (slug, name, title, position, faculty, program, email, avatar_url, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, name, title, position, faculty, program, email, avatar_url, bio]
    );
    const memberId = r.insertId;

    // specialists: upsert by name → relasi
    for (const nm of specialists) {
      if (!nm) continue;
      await db.query(`INSERT IGNORE INTO specialists (name) VALUES (?)`, [nm]);
      const [[sp]] = await db.query(`SELECT id FROM specialists WHERE name=?`, [nm]);
      if (sp) await db.query(`INSERT IGNORE INTO member_specialists (member_id, spec_id) VALUES (?, ?)`, [memberId, sp.id]);
    }

    // skills
    for (const s of skills) {
      if (!s) continue;
      await db.query(`INSERT IGNORE INTO skills (member_id, skill_name) VALUES (?, ?)`, [memberId, s]);
    }

    // experiences
    for (const e of experiences) {
      await db.query(
        `INSERT INTO experiences (member_id, role, org, period, bullets) VALUES (?, ?, ?, ?, ?)`,
        [memberId, e.role || null, e.org || null, e.period || null, e.bullets ? JSON.stringify(e.bullets) : null]
      );
    }

    // educations
    for (const ed of educations) {
      await db.query(
        `INSERT INTO educations (member_id, degree, org, year, note) VALUES (?, ?, ?, ?, ?)`,
        [memberId, ed.degree || null, ed.org || null, ed.year || null, ed.note || null]
      );
    }

    // certifications
    for (const c of certifications) {
      await db.query(`INSERT INTO certifications (member_id, cert_name) VALUES (?, ?)`, [memberId, c || null]);
    }

    // socials
    for (const s of socials) {
      await db.query(`INSERT INTO socials (member_id, type, url) VALUES (?, ?, ?)`, [memberId, s.type || null, s.url || null]);
    }

    res.status(201).json({ id: memberId, slug });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// UPDATE (by slug)
router.patch('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      name, title, position, faculty, program, email, avatar_url, bio,
      specialists, skills, experiences, educations, certifications, socials
    } = req.body;

    const [[m]] = await db.query(`SELECT id FROM members WHERE slug=?`, [slug]);
    if (!m) return res.status(404).json({ error: 'Not found' });

    await db.query(
      `UPDATE members SET name=?, title=?, position=?, faculty=?, program=?, email=?, avatar_url=?, bio=? WHERE id=?`,
      [name, title, position, faculty, program, email, avatar_url, bio, m.id]
    );

    // Jika field relasi dikirim, refresh isinya (sederhana)
    if (Array.isArray(specialists)) {
      await db.query(`DELETE FROM member_specialists WHERE member_id=?`, [m.id]);
      for (const nm of specialists) {
        if (!nm) continue;
        await db.query(`INSERT IGNORE INTO specialists (name) VALUES (?)`, [nm]);
        const [[sp]] = await db.query(`SELECT id FROM specialists WHERE name=?`, [nm]);
        if (sp) await db.query(`INSERT IGNORE INTO member_specialists (member_id, spec_id) VALUES (?, ?)`, [m.id, sp.id]);
      }
    }
    if (Array.isArray(skills)) {
      await db.query(`DELETE FROM skills WHERE member_id=?`, [m.id]);
      for (const s of skills) await db.query(`INSERT IGNORE INTO skills (member_id, skill_name) VALUES (?, ?)`, [m.id, s]);
    }
    if (Array.isArray(experiences)) {
      await db.query(`DELETE FROM experiences WHERE member_id=?`, [m.id]);
      for (const e of experiences) {
        await db.query(
          `INSERT INTO experiences (member_id, role, org, period, bullets) VALUES (?, ?, ?, ?, ?)`,
          [m.id, e.role || null, e.org || null, e.period || null, e.bullets ? JSON.stringify(e.bullets) : null]
        );
      }
    }
    if (Array.isArray(educations)) {
      await db.query(`DELETE FROM educations WHERE member_id=?`, [m.id]);
      for (const ed of educations) {
        await db.query(
          `INSERT INTO educations (member_id, degree, org, year, note) VALUES (?, ?, ?, ?, ?)`,
          [m.id, ed.degree || null, ed.org || null, ed.year || null, ed.note || null]
        );
      }
    }
    if (Array.isArray(certifications)) {
      await db.query(`DELETE FROM certifications WHERE member_id=?`, [m.id]);
      for (const c of certifications) await db.query(`INSERT INTO certifications (member_id, cert_name) VALUES (?, ?)`, [m.id, c || null]);
    }
    if (Array.isArray(socials)) {
      await db.query(`DELETE FROM socials WHERE member_id=?`, [m.id]);
      for (const s of socials) await db.query(`INSERT INTO socials (member_id, type, url) VALUES (?, ?, ?)`, [m.id, s.type || null, s.url || null]);
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE
router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [[m]] = await db.query(`SELECT id FROM members WHERE slug=?`, [slug]);
    if (!m) return res.status(404).json({ error: 'Not found' });
    await db.query(`DELETE FROM members WHERE id=?`, [m.id]); // FK CASCADE akan menghapus turunan
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
