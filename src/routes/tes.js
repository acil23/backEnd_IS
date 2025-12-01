// src/routes/projects.js
import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// --- HELPER: Handle JSON Fields ---
// MySQL sering mengembalikan JSON sebagai string, kita perlu parse saat READ (GET)
// dan stringify saat WRITE (POST/PATCH).
const parseProjectJSON = (project) => {
  if (!project) return null;
  const jsonFields = ['metadata', 'gallery', 'features', 'tags', 'content_blocks'];
  jsonFields.forEach(field => {
    if (project[field] && typeof project[field] === 'string') {
      try {
        project[field] = JSON.parse(project[field]);
      } catch (e) {
        project[field] = []; // Fallback jika error parsing
      }
    }
  });
  return project;
};

// ==========================================
// PUBLIC ROUTES (Sesuai apiProjects.js)
// ==========================================

// 1. GET Categories
// PENTING: Taruh SEBELUM route '/projects/:slug' agar tidak dianggap sebagai slug
router.get('/projects/categories', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM project_categories ORDER BY display_order ASC`);
    res.json({ data: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. GET Featured Projects
router.get('/projects/featured', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 6;
    // Ambil project yang featured dan published
    const [rows] = await db.query(
      `SELECT * FROM projects WHERE is_featured = 1 AND is_published = 1 ORDER BY display_order ASC LIMIT ?`, 
      [limit]
    );
    const parsedRows = rows.map(parseProjectJSON);
    res.json({ data: parsedRows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. GET All Projects (Public - Filtered)
router.get('/projects', async (req, res) => {
  try {
    const { page = 1, perPage = 12, category = '', status = '', year = '', q = '', featured = '' } = req.query;
    const offset = (Number(page) - 1) * Number(perPage);
    const limit = Number(perPage);

    const conditions = ['is_published = 1']; // Public hanya lihat yang published
    const values = [];

    if (q) {
      conditions.push('(title LIKE ? OR short_description LIKE ?)');
      values.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
      conditions.push('category = ?');
      values.push(category);
    }
    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }
    if (year) {
      conditions.push('year = ?');
      values.push(year);
    }
    if (featured === 'true') {
      conditions.push('is_featured = 1');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Query Data
    const [rows] = await db.query(
      `SELECT * FROM projects ${whereClause} ORDER BY is_featured DESC, display_order ASC, project_date DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );
    
    // Query Count
    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM projects ${whereClause}`, values);
    
    const parsedRows = rows.map(parseProjectJSON);

    res.json({
      data: parsedRows,
      count: countRes[0].total,
      totalPages: Math.ceil(countRes[0].total / limit),
      page: Number(page)
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 4. GET Single Project by Slug
router.get('/projects/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await db.query(`SELECT * FROM projects WHERE slug = ?`, [slug]);

    if (!rows.length) return res.status(404).json({ error: 'Project not found' });

    res.json(parseProjectJSON(rows[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================
// ADMIN ROUTES (Sesuai apiProjects.js)
// ==========================================

// 5. GET Admin List (No is_published filter)
router.get('/admin/projects', async (req, res) => {
  try {
    const { page = 1, perPage = 20, q = '' } = req.query;
    const offset = (Number(page) - 1) * Number(perPage);
    const limit = Number(perPage);

    const conditions = [];
    const values = [];

    if (q) {
      conditions.push('(title LIKE ? OR short_description LIKE ?)');
      values.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.query(
      `SELECT * FROM projects ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );
    
    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM projects ${whereClause}`, values);

    // Kirim data mentah (string JSON) atau diparse, admin list React Anda handle parsed, jadi kita parse:
    const parsedRows = rows.map(parseProjectJSON);

    res.json({
      data: parsedRows,
      count: countRes[0].total
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 6. CREATE Project (Admin)
router.post('/admin/projects', async (req, res) => {
  try {
    const d = req.body;
    
    // Persiapkan data, stringify field JSON
    const payload = {
      ...d,
      metadata: JSON.stringify(d.metadata || {}),
      gallery: JSON.stringify(d.gallery || []),
      features: JSON.stringify(d.features || []),
      tags: JSON.stringify(d.tags || []),
      content_blocks: JSON.stringify(d.content_blocks || [])
    };

    const sql = `
      INSERT INTO projects (
        slug, title, category, status, 
        thumbnail_url, banner_url, qr_code_url,
        short_description, full_description,
        demo_url, repo_url, paper_url, video_url,
        metadata, gallery, features, tags, content_blocks,
        project_date, year, is_featured, is_published, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      payload.slug, payload.title, payload.category, payload.status,
      payload.thumbnail_url, payload.banner_url, payload.qr_code_url,
      payload.short_description, payload.full_description,
      payload.demo_url, payload.repo_url, payload.paper_url, payload.video_url,
      payload.metadata, payload.gallery, payload.features, payload.tags, payload.content_blocks,
      payload.project_date, payload.year, payload.is_featured, payload.is_published, payload.display_order
    ];

    await db.query(sql, values);
    res.status(201).json({ message: 'Project created successfully', slug: payload.slug });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 7. UPDATE Project (Admin)
router.patch('/admin/projects/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const d = req.body;

    // Field yang diizinkan update
    const allowed = [
      'title', 'category', 'status', 
      'thumbnail_url', 'banner_url', 'qr_code_url',
      'short_description', 'full_description',
      'demo_url', 'repo_url', 'paper_url', 'video_url',
      'project_date', 'year', 'is_featured', 'is_published', 'display_order'
    ];
    const jsonCols = ['metadata', 'gallery', 'features', 'tags', 'content_blocks'];

    const fields = [];
    const values = [];

    // Proses kolom biasa
    allowed.forEach(col => {
      if (d[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(d[col]);
      }
    });

    // Proses kolom JSON
    jsonCols.forEach(col => {
      if (d[col] !== undefined) {
        fields.push(`${col} = ?`);
        values.push(JSON.stringify(d[col]));
      }
    });

    if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

    values.push(slug);
    const [resDb] = await db.query(`UPDATE projects SET ${fields.join(', ')} WHERE slug = ?`, values);

    if (resDb.affectedRows === 0) return res.status(404).json({ error: 'Project not found' });

    res.json({ message: 'Updated successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 8. DELETE Project (Admin)
router.delete('/admin/projects/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [resDb] = await db.query(`DELETE FROM projects WHERE slug = ?`, [slug]);
    
    if (resDb.affectedRows === 0) return res.status(404).json({ error: 'Project not found' });

    res.json({ message: 'Deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;