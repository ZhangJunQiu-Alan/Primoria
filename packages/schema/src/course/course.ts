import { z } from 'zod';
import { BlockSchema } from './blocks';
import { SCHEMA_URL, SCHEMA_VERSION } from './version';

// ─── Page ─────────────────────────────────────────────────────────────────────

export const PageSchema = z.object({
  page_id: z.string(),
  order: z.number(),
  blocks: z.array(BlockSchema),
});

export type Page = z.infer<typeof PageSchema>;

// ─── Lesson ───────────────────────────────────────────────────────────────────

export const LessonSchema = z.object({
  lesson_id: z.string(),
  title: z.string(),
  pages: z.array(PageSchema),
});

export type Lesson = z.infer<typeof LessonSchema>;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const CourseAuthorSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
});

export const CourseMetadataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  author: CourseAuthorSchema.optional(),
  tags: z.array(z.string()).optional(),
  difficulty_level: z
    .enum(['beginner', 'intermediate', 'advanced'])
    .optional(),
  estimated_minutes: z.number().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.string().optional(),
  thumbnail: z.string().optional(),
});

export type CourseMetadata = z.infer<typeof CourseMetadataSchema>;

// ─── Settings ─────────────────────────────────────────────────────────────────

export const CourseSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  primaryColor: z.string().optional(),
  fontFamily: z.string().optional(),
});

// ─── Course ───────────────────────────────────────────────────────────────────

export const CourseSchema = z.object({
  $schema: z.string().optional().default(SCHEMA_URL),
  schema_version: z.string().default(SCHEMA_VERSION),
  course_id: z.string(),
  metadata: CourseMetadataSchema,
  settings: CourseSettingsSchema.optional(),
  lessons: z.array(LessonSchema),
});

export type Course = z.infer<typeof CourseSchema>;

// ─── Partial course (editor draft — lessons may be incomplete) ────────────────

export type CourseDraft = Omit<Course, 'schema_version'> & {
  schema_version?: string;
  _isDraft: true;
};
