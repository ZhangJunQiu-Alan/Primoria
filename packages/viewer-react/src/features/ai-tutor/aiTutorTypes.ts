import type { ViewerCopy } from '@/shared/theme/copy';
import type { TutorMessage } from '@/shared/api/geminiClient';
import type { TutorToolModal } from '@/features/ai-tutor/toolTypes';

export type TutorToolKind = TutorToolModal['kind'];
export type AiTutorCopyLike = Pick<ViewerCopy, 'aiTutor' | 'common'>;
export type ToolExecutionStatus = 'idle' | 'loading' | 'success' | 'error';
export type TutorStatusTone = 'info' | 'success' | 'error';
export type TutorConversationContext = {
  source: 'home-companion' | 'manual';
  courseTitle: string | null;
};
export type TutorToolRuntime = {
  status: ToolExecutionStatus;
  modal: TutorToolModal | null;
  updatedAt: number | null;
  errorMessage: string | null;
};
export type TutorStatusNotice = {
  tone: TutorStatusTone;
  text: string;
};
export type StoredTutorArtifact = {
  modal: TutorToolModal;
  updatedAt: number;
};
export type StoredAiTutorSession = {
  version: 3;
  messages: TutorMessage[];
  artifacts: StoredTutorArtifact[];
  context: TutorConversationContext | null;
};
export type ActiveToolConfig =
  | {
      kind: TutorToolKind;
    }
  | null;
export type PendingTutorUpload = {
  id: string;
  filename: string;
  mimeType: string;
};
export type TutorSidebarSection = 'workspace' | 'materials' | 'notebook';
