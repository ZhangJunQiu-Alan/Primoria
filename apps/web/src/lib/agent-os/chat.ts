export type {
  AttachmentKind,
  AttachmentMetadata,
  ChatAttachment,
  ChatMessage,
  ChatRole,
  MessageContentPart,
  TutorAgentLabel,
  TutorProviderSettings,
} from "@primoria/contracts/chat";

export type {
  TutorAgentResponse,
  TutorStreamEvent,
} from "@primoria/contracts/stream";

export {
  ACCEPTED_ATTACHMENT_INPUT,
  ACCEPTED_ATTACHMENT_TYPES,
  AttachmentSchema,
  AttachmentsSchema,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_COUNT,
  MAX_TOTAL_ATTACHMENT_BYTES,
  applyAttachmentsToLatestUserMessage,
  attachmentMetadata,
  buildAttachmentContext,
  buildCourseUserContent,
  modelSupportsVision,
  processAttachments,
  type ProcessedAttachment,
} from "../ai/attachments";

export {
  normalizeCopilotMessagesWithAttachments,
} from "../ai/copilot-attachments";
