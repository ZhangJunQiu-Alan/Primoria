export type ChatRole = "user" | "assistant" | "system";

export type MessageContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

export type ChatMessage = {
  role: Exclude<ChatRole, "system">;
  content: string | MessageContentPart[];
};

export type AttachmentKind = "image" | "document";

export type AttachmentMetadata = {
  id: string;
  name: string;
  type: AttachmentKind;
  mimeType: string;
  size: number;
};

export type ChatAttachment = AttachmentMetadata & {
  base64Text: string;
};

export type TutorProviderSettings = {
  provider?: "openai-compatible" | "anthropic-compatible";
  baseUrl?: string;
  apiKey?: string;
  model?: string;
};

export type TutorAgentLabel =
  | "Tutor team"
  | "Concept agent"
  | "Visualization agent"
  | "Practice agent"
  | "Code agent"
  | "Course agent";
