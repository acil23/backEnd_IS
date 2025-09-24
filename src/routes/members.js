import express from 'express';
import { supabase } from '../supabase.js';
import { parsePagination } from '../../utils/pagination.js';
import { createMemberSchema, updateMemberSchema } from '../../validators/members.js';

const router = express.Router();

/* GET /members */
router.get('/', async (req, res) => {
  try {
    const { from, to } = parsePagination(req.query, { perPage: 6 });
    const { position, faculty, program, search } = req.query;

    let q = supabase
      .from('members')
      .select(`
        id, slug, name, title, position, faculty, program, email, avatar_url,
        member_specialists ( spec:specialists ( name ) ),
        skills ( skill_name )
      `, { count: 'exact' })
      .order('position', { ascending: false })
      .order('name', { ascending: true })
      .range(from, to);

    if (position) q = q.eq('position', position);
    if (faculty)  q = q.eq('faculty', faculty);
    if (program)  q = q.eq('program', program);
    if (search)   q = q.ilike('name', `%${search}%`);

    const { data, count, error } = await q;
    if (error) throw error;
    res.json({ data, count, page: Math.floor(from / (to - from + 1)) + 1, perPage: to - from + 1 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /members/:slug */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { data, error } = await supabase
      .from('members')
      .select(`
        id, slug, name, title, position, faculty, program, email, avatar_url, bio, created_at,
        member_specialists ( spec:specialists ( name ) ),
        skills ( skill_name ),
        certifications ( cert_name ),
        experiences ( role, org, period, bullets ),
        educations ( degree, org, year, note ),
        socials ( type, url )
      `)
      .eq('slug', slug)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /members */
router.post('/', async (req, res) => {
  try {
    const payload = createMemberSchema.parse(req.body);

    const { data: member, error: e1 } = await supabase
      .from('members')
      .insert([{
        slug: payload.slug,
        name: payload.name,
        title: payload.title,
        position: payload.position || 'Anggota',
        faculty: payload.faculty,
        program: payload.program,
        email: payload.email,
        avatar_url: payload.avatar_url,
        bio: payload.bio,
      }])
      .select('id, slug')
      .single();
    if (e1) throw e1;

    const memberId = member.id;

    if (payload.specialists?.length) {
      await supabase.from('specialists')
        .upsert(payload.specialists.map(name => ({ name })), { onConflict: 'name' });

      const { data: specRows } = await supabase
        .from('specialists').select('id,name').in('name', payload.specialists);

      const links = (specRows || []).map(s => ({ member_id: memberId, spec_id: s.id }));
      if (links.length) await supabase.from('member_specialists').upsert(links, { onConflict: 'member_id, spec_id' });
    }

    if (payload.skills?.length) {
      await supabase.from('skills').insert(payload.skills.map(skill_name => ({ member_id: memberId, skill_name })));
    }
    if (payload.certifications?.length) {
      await supabase.from('certifications').insert(payload.certifications.map(cert_name => ({ member_id: memberId, cert_name })));
    }
    if (payload.experiences?.length) {
      await supabase.from('experiences').insert(payload.experiences.map(e => ({ member_id: memberId, ...e })));
    }
    if (payload.educations?.length) {
      await supabase.from('educations').insert(payload.educations.map(ed => ({ member_id: memberId, ...ed })));
    }
    if (payload.socials?.length) {
      await supabase.from('socials').insert(payload.socials.map(s => ({ member_id: memberId, ...s })));
    }

    res.status(201).json({ message: 'Created', slug: member.slug });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* PATCH /members/:slug */
router.patch('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const payload = updateMemberSchema.parse(req.body);
    const { data: m, error: e0 } = await supabase.from('members').select('id, slug').eq('slug', slug).single();
    if (e0) throw e0;
    if (!m) return res.status(404).json({ error: 'Not found' });

    const basic = { ...payload };
    delete basic.specialists; delete basic.skills; delete basic.certifications;
    delete basic.experiences; delete basic.educations; delete basic.socials;

    if (Object.keys(basic).length) {
      const { error: e1 } = await supabase.from('members').update(basic).eq('id', m.id);
      if (e1) throw e1;
    }

    if (payload.specialists) {
      await supabase.from('member_specialists').delete().eq('member_id', m.id);
      if (payload.specialists.length) {
        await supabase.from('specialists').upsert(payload.specialists.map(name => ({ name })), { onConflict: 'name' });
        const { data: specRows } = await supabase.from('specialists').select('id,name').in('name', payload.specialists);
        const links = (specRows || []).map(s => ({ member_id: m.id, spec_id: s.id }));
        if (links.length) await supabase.from('member_specialists').insert(links);
      }
    }
    if (payload.skills) {
      await supabase.from('skills').delete().eq('member_id', m.id);
      if (payload.skills.length) await supabase.from('skills').insert(payload.skills.map(skill_name => ({ member_id: m.id, skill_name })));
    }
    if (payload.certifications) {
      await supabase.from('certifications').delete().eq('member_id', m.id);
      if (payload.certifications.length) await supabase.from('certifications').insert(payload.certifications.map(cert_name => ({ member_id: m.id, cert_name })));
    }
    if (payload.experiences) {
      await supabase.from('experiences').delete().eq('member_id', m.id);
      if (payload.experiences.length) await supabase.from('experiences').insert(payload.experiences.map(e => ({ member_id: m.id, ...e })));
    }
    if (payload.educations) {
      await supabase.from('educations').delete().eq('member_id', m.id);
      if (payload.educations.length) await supabase.from('educations').insert(payload.educations.map(ed => ({ member_id: m.id, ...ed })));
    }
    if (payload.socials) {
      await supabase.from('socials').delete().eq('member_id', m.id);
      if (payload.socials.length) await supabase.from('socials').insert(payload.socials.map(s => ({ member_id: m.id, ...s })));
    }

    res.json({ message: 'Updated', slug: m.slug });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/* DELETE /members/:slug */
router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { data: m } = await supabase.from('members').select('id').eq('slug', slug).single();
    if (!m) return res.status(404).json({ error: 'Not found' });
    const { error } = await supabase.from('members').delete().eq('id', m.id);
    if (error) throw error;
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
