import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// GET /api/projects - List projects with filters
router.get('/projects', async (req, res) => {
  try {
    const { 
      page = 1, 
      perPage = 12, 
      category = '', 
      status = '', 
      year = '', 
      q = '', 
      featured = '' 
    } = req.query;

    const p = Math.max(1, Number(page));
    const n = Math.min(100, Math.max(1, Number(perPage)));
    const offset = (p - 1) * n;

    let whereConditions = ['is_published = 1']; // MySQL boolean true = 1
    let params = [];

    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
    }

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }

    if (year) {
      whereConditions.push('year = ?');
      params.push(Number(year));
    }

    if (featured === 'true') {
      whereConditions.push('is_featured = 1');
    }

    if (q) {
      // Menggunakan LIKE %...% untuk MySQL (gantikan ILIKE Postgres)
      whereConditions.push('(title LIKE ? OR short_description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // 1. Get total count
    const [countResult] = await db.query(
      `SELECT COUNT(*) as count FROM projects ${whereClause}`, 
      params
    );
    const totalCount = countResult[0].count;

    // 2. Get projects
    // MySQL query params untuk LIMIT & OFFSET harus di akhir
    const query = `
      SELECT 
        id, slug, title, category, status, 
        thumbnail_url, short_description, 
        tags, demo_url, qr_code_url,
        project_date, year, is_featured,
        created_at, updated_at
      FROM projects
      ${whereClause}
      ORDER BY 
        is_featured DESC, 
        display_order ASC, 
        project_date DESC
      LIMIT ? OFFSET ?
    `;

    // Gabungkan params where dengan params limit/offset
    const [rows] = await db.query(query, [...params, n, offset]);

    res.json({
      data: rows,
      count: totalCount,
      page: p,
      perPage: n,
      totalPages: Math.ceil(totalCount / n)
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/featured
router.get('/projects/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    const n = Number(limit);

    const query = `
      SELECT id, slug, title, category, thumbnail_url, short_description, tags, demo_url
      FROM projects
      WHERE is_featured = 1 AND is_published = 1
      ORDER BY display_order ASC
      LIMIT ?
    `;

    const [rows] = await db.query(query, [n]);
    res.json({ data: rows });
  } catch (error) {
    console.error('Error fetching featured projects:', error);
    res.status(500).json({ error: 'Failed to fetch featured projects' });
  }
});

// GET /api/projects/categories
router.get('/projects/categories', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, name, slug, description, icon, color, display_order
      FROM project_categories
      ORDER BY display_order ASC
    `);
    res.json({ data: rows });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/projects/:slug - Get single project
router.get('/projects/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    // Query sederhana tanpa JSON AGG (karena MySQL versi lama mungkin bermasalah)
    // Kita ambil data project dulu
    const [rows] = await db.query(
      `SELECT * FROM projects WHERE slug = ? AND is_published = 1`, 
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = rows[0];

    // Opsional: Ambil team members jika tabelnya terpisah
    const [members] = await db.query(
      `SELECT member_slug, role FROM project_members WHERE project_id = ?`,
      [project.id]
    );
    
    project.team_members = members;

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// ========== ADMIN ROUTES ==========

// GET /api/admin/projects
router.get('/admin/projects', async (req, res) => {
  try {
    const { page = 1, perPage = 20, q = '' } = req.query;
    const p = Math.max(1, Number(page));
    const n = Math.min(100, Math.max(1, Number(perPage)));
    const offset = (p - 1) * n;

    let whereConditions = [];
    let params = [];

    if (q) {
      whereConditions.push('(title LIKE ? OR short_description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const [countRes] = await db.query(`SELECT COUNT(*) as count FROM projects ${whereClause}`, params);
    const totalCount = countRes[0].count;

    const [rows] = await db.query(`
      SELECT 
        id, slug, title, category, status, 
        thumbnail_url, short_description, 
        is_featured, is_published, display_order,
        project_date, created_at, updated_at
      FROM projects
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, n, offset]);

    res.json({
      data: rows,
      count: totalCount,
      page: p,
      perPage: n
    });
  } catch (error) {
    console.error('Error fetching admin projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/admin/projects
router.post('/admin/projects', async (req, res) => {
  try {
    const {
      slug, title, category, status, thumbnail_url, banner_url, qr_code_url,
      short_description, full_description, demo_url, repo_url, paper_url, video_url,
      metadata, gallery, features, tags, content_blocks,
      project_date, year, is_featured, is_published, display_order
    } = req.body;

    const query = `
      INSERT INTO projects (
        slug, title, category, status, thumbnail_url, banner_url, qr_code_url,
        short_description, full_description, demo_url, repo_url, paper_url, video_url,
        metadata, gallery, features, tags, content_blocks,
        project_date, year, is_featured, is_published, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Convert object/array to JSON string for MySQL
    const values = [
      slug, title, category || null, status || 'ongoing',
      thumbnail_url || null, banner_url || null, qr_code_url || null,
      short_description || null, full_description || null,
      demo_url || null, repo_url || null, paper_url || null, video_url || null,
      JSON.stringify(metadata || {}), JSON.stringify(gallery || []),
      JSON.stringify(features || []), JSON.stringify(tags || []),
      JSON.stringify(content_blocks || []),
      project_date || null, year || null,
      is_featured ? 1 : 0, is_published !== false ? 1 : 0, display_order || 0
    ];

    const [result] = await db.query(query, values);
    
    // Fetch ulang data yang baru diinsert (MySQL tidak support RETURNING *)
    const [newRow] = await db.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    
    res.status(201).json(newRow[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PATCH /api/admin/projects/:slug
router.patch('/admin/projects/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const updates = req.body;
    
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      // Skip id dan slug jika tidak perlu diupdate
      if (key === 'id' || key === 'slug') return; 

      fields.push(`${key} = ?`);
      
      // Handle JSON fields
      if (['metadata', 'gallery', 'features', 'tags', 'content_blocks'].includes(key)) {
        values.push(JSON.stringify(updates[key]));
      } else if (typeof updates[key] === 'boolean') {
         values.push(updates[key] ? 1 : 0);
      } else {
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) return res.json({ message: "No updates" });

    values.push(slug);

    const query = `UPDATE projects SET ${fields.join(', ')} WHERE slug = ?`;
    
    await db.query(query, values);

    // Fetch updated data
    const [updatedRow] = await db.query('SELECT * FROM projects WHERE slug = ?', [slug]);

    if (updatedRow.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(updatedRow[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/admin/projects/:slug
router.delete('/admin/projects/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const [result] = await db.query('DELETE FROM projects WHERE slug = ?', [slug]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;