import type { LucideIcon } from 'lucide-react';
import type { CourseRow } from '@/queries/courses';

export type DashboardTab = 'home' | 'course' | 'data';
export type StatusFilter = 'all' | 'draft' | 'published';
export type SortMode = 'updated' | 'title' | 'lessons' | 'student' | 'comments';
export type DifficultyLevel = CourseRow['difficulty_level'];
export type PriceTier = CourseRow['price_tier'];

export interface NoticeState {
  tone: 'success' | 'error' | 'info';
  text: string;
}

export interface CourseFormState {
  title: string;
  description: string;
  thumbnailUrl: string;
  difficultyLevel: DifficultyLevel;
  estimatedHours: string;
  priceTier: PriceTier;
  price: string;
}

export interface CourseFormPayload {
  title: string;
  description?: string;
  thumbnailUrl?: string;
  difficultyLevel: DifficultyLevel;
  estimatedMinutes?: number | null;
  priceTier: PriceTier;
  price?: number;
}

export type AICourseDraftPace = 'quick' | 'balanced' | 'deep';

export interface AICourseDraftFormState {
  topic: string;
  audience: string;
  outcome: string;
  pace: AICourseDraftPace;
}

export interface AICourseDraftPreview {
  title: string;
  summary: string;
  lessonTitles: string[];
  coachNote: string;
}

export interface DashboardTabConfig {
  value: DashboardTab;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export interface ChartSeries {
  name: string;
  values: number[];
  color: string;
  fillColor?: string;
}
