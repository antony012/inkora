export type WhatsAppInboundText = {
  kind: "text";
  from: string;
  messageId: string;
  timestamp: string;
  contactName: string;
  body: string;
};

export type WhatsAppInboundImage = {
  kind: "image";
  from: string;
  messageId: string;
  timestamp: string;
  contactName: string;
  caption?: string;
  mediaId: string;
};

export type WhatsAppInboundMessage = WhatsAppInboundText | WhatsAppInboundImage;

export type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messaging_product?: string;
        metadata?: { phone_number_id?: string; display_phone_number?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body?: string };
          image?: { id?: string; caption?: string };
        }>;
        statuses?: Array<{ id: string; status: string }>;
      };
    }>;
  }>;
};

export type EvolutionWebhookPayload = {
  event?: string;
  instance?: string;
  data?: unknown;
};
