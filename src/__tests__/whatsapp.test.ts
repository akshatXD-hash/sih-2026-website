import { describe, expect, it } from "vitest";

import { GET as handleWebhookGet, POST as handleWebhookPost } from "@/app/api/webhooks/whatsapp/route";
import { POST as handleSimulatePost } from "@/app/api/whatsapp/simulate/route";
import { parseWhatsAppWebhook, processWhatsAppIntake } from "@/lib/whatsapp/service";

describe("WhatsApp Grassroots Webhook & Service", () => {
  it("verifies Meta webhook handshake successfully with correct token", async () => {
    const request = new Request(
      "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=1158201236&hub.verify_token=kaarva_sih_2026_verify_token"
    );
    const response = await handleWebhookGet(request);

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toBe("1158201236");
  });

  it("rejects Meta webhook verification with invalid token", async () => {
    const request = new Request(
      "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=1158201236&hub.verify_token=wrong_token"
    );
    const response = await handleWebhookGet(request);

    expect(response.status).toBe(403);
  });

  it("parses inbound WhatsApp text and voice message payloads accurately", () => {
    const mockPayload = {
      entry: [
        {
          id: "WHATSAPP_ENTRY_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "919876543210",
                  phone_number_id: "10987654321",
                },
                contacts: [
                  {
                    profile: { name: "Savitri Devi" },
                    wa_id: "919845012345",
                  },
                ],
                messages: [
                  {
                    from: "919845012345",
                    id: "wamid.HBgL",
                    timestamp: "1726123456",
                    type: "audio",
                    audio: {
                      id: "media_voice_999",
                      mime_type: "audio/ogg; codecs=opus",
                      voice: true,
                    },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const messages = parseWhatsAppWebhook(mockPayload);
    expect(messages).toHaveLength(1);
    expect(messages[0].senderName).toBe("Savitri Devi");
    expect(messages[0].from).toBe("919845012345");
    expect(messages[0].type).toBe("audio");
    expect(messages[0].mediaId).toBe("media_voice_999");
  });

  it("processes inbound Kannada voice message and generates vernacular WhatsApp reply", async () => {
    const result = await processWhatsAppIntake(
      {
        from: "919845012345",
        senderName: "Savitri",
        messageId: "test_msg_1",
        timestamp: "1726123456",
        type: "audio",
      },
      {
        fallbackLanguage: "kn",
      }
    );

    expect(result.success).toBe(true);
    expect(result.language).toBe("kn");
    expect(result.trade).toBe("tailoring");
    expect(result.requestedAmount).toBe(50000);
    expect(result.replyMessage).toContain("ನಮಸ್ಕಾರ Savitri!");
    expect(result.replyMessage).toContain("MUDRA");
    expect(result.confirmationUrl).toContain("register?source=whatsapp");
  });

  it("simulates inbound Hindi Kirana shop voice note via simulation endpoint", async () => {
    const request = new Request("http://localhost:3000/api/whatsapp/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromPhone: "919448199012",
        senderName: "Anjali",
        messageType: "text",
        content: "मेरी छोटी किराना दुकान है, दुकान का सामान बढ़ाने के लिए ₹1,00,000 का लोन चाहिए।",
        language: "hi",
      }),
    });

    const response = await handleSimulatePost(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.trade).toBe("retail shop");
    expect(data.requestedAmount).toBe(100000);
    expect(data.replyMessage).toContain("नमस्ते Anjali!");
  });

  it("handles Twilio WhatsApp webhook request and returns valid TwiML response", async () => {
    const { POST: handleTwilioPost } = await import("@/app/api/webhooks/twilio-whatsapp/route");
    const formData = new FormData();
    formData.set("From", "whatsapp:+919845012345");
    formData.set("ProfileName", "Savitri");
    formData.set("Body", "ನಾನು ಮಹಿಳಾ ಟೈಲರ್, ₹50,000 ಸಾಲ ಬೇಕು");
    formData.set("NumMedia", "0");

    const request = new Request("http://localhost:3000/api/webhooks/twilio-whatsapp", {
      method: "POST",
      body: formData,
    });

    const response = await handleTwilioPost(request);
    expect(response.status).toBe(200);
    const xml = await response.text();
    expect(xml).toContain("<Response>");
    expect(xml).toContain("<Message>");
    expect(xml).toContain("MUDRA");
  });
});
