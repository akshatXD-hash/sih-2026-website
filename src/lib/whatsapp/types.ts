export interface WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: "whatsapp";
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: "text" | "audio" | "voice" | "image" | "document" | "interactive";
        text?: {
          body: string;
        };
        audio?: {
          id: string;
          mime_type: string;
          voice?: boolean;
        };
        voice?: {
          id: string;
          mime_type: string;
        };
        image?: {
          id: string;
          mime_type: string;
          caption?: string;
        };
      }>;
      statuses?: Array<{
        id: string;
        status: "sent" | "delivered" | "read" | "failed";
        timestamp: string;
        recipient_id: string;
      }>;
    };
    field: string;
  }>;
}

export interface WhatsAppIncomingMessage {
  from: string;
  senderName: string;
  messageId: string;
  timestamp: string;
  type: "text" | "audio" | "image" | "other";
  text?: string;
  mediaId?: string;
  mimeType?: string;
  isVoice?: boolean;
}

export interface WhatsAppBotReply {
  to: string;
  type: "text" | "interactive";
  body: string;
  suggestedActionUrl?: string;
  matchedSchemeName?: string;
  matchedLoanAmount?: number;
  detectedLanguage?: string;
}

export interface WhatsAppSimulationRequest {
  fromPhone: string;
  senderName: string;
  messageType: "text" | "audio";
  content: string; // text message string or sample audio identifier
  language?: string;
}

export interface WhatsAppSimulationResponse {
  success: boolean;
  transcript: string;
  language: string;
  trade?: string | null;
  projectCategory?: string | null;
  requestedAmount?: number | null;
  topScheme?: string | null;
  replyMessage: string;
  confirmationUrl: string;
}
