import { z } from 'zod';

export const memberBase = z.object({
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/).optional(),  // slug opsional saat update
  name: z.string().min(3),
  title: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  faculty: z.string().optional().nullable(),
  program: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  bio: z.string().optional().nullable(),
});

const stringArray = z.array(z.string()).optional().default([]);

export const experienceSchema = z.object({
  role: z.string(),
  org: z.string().optional().default(''),
  period: z.string().optional().default(''),
  bullets: z.array(z.string()).optional().default([]),
});

export const educationSchema = z.object({
  degree: z.string(),
  org: z.string(),
  year: z.string().optional().default(''),
  note: z.string().optional().default(''),
});

export const socialSchema = z.object({
  type: z.enum(['twitter', 'linkedin', 'scholar', 'github', 'website', 'orcid', 'scopus', 'sinta']),
  url: z.string(),
});

export const createMemberSchema = memberBase.extend({
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),  // wajib saat create
  specialists: stringArray, // nama spesialisasi, e.g. ['Data Mining','AI']
  skills: stringArray,
  certifications: stringArray,
  experiences: z.array(experienceSchema).optional().default([]),
  educations: z.array(educationSchema).optional().default([]),
  socials: z.array(socialSchema).optional().default([]),
});

export const updateMemberSchema = memberBase.extend({
  // untuk update, setiap field opsional
  specialists: stringArray.nullable().optional(),
  skills: stringArray.nullable().optional(),
  certifications: stringArray.nullable().optional(),
  experiences: z.array(experienceSchema).nullable().optional(),
  educations: z.array(educationSchema).nullable().optional(),
  socials: z.array(socialSchema).nullable().optional(),
});
