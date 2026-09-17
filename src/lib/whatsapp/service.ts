import { loanSchemes } from "../../../prisma/loan-schemes";
import { RemoteAiService } from "@/lib/ai-service/client";
import { MockAiService } from "@/lib/ai-service/mock";
import { matchSchemes } from "@/lib/matching";
import { transcribeAudio } from "@/lib/voice/whisper";
import type {
  WhatsAppBotReply,
  WhatsAppIncomingMessage,
  WhatsAppSimulationResponse,
  WhatsAppWebhookEntry,
} from "@/lib/whatsapp/types";

export function parseWhatsAppWebhook(body: any): WhatsAppIncomingMessage[] {
  const messages: WhatsAppIncomingMessage[] = [];
  const entries: WhatsAppWebhookEntry[] = body?.entry || [];

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const val = change.value;
      if (!val || val.messaging_product !== "whatsapp") continue;

      const contacts = val.contacts || [];
      const contactMap = new Map<string, string>();
      for (const c of contacts) {
        contactMap.set(c.wa_id, c.profile?.name || "Beneficiary");
      }

      for (const msg of val.messages || []) {
        const from = msg.from;
        const senderName = contactMap.get(from) || "Beneficiary";

        if (msg.type === "text" && msg.text?.body) {
          messages.push({
            from,
            senderName,
            messageId: msg.id,
            timestamp: msg.timestamp,
            type: "text",
            text: msg.text.body.trim(),
          });
        } else if (msg.type === "audio" || msg.type === "voice") {
          const audioObj = msg.audio || msg.voice;
          messages.push({
            from,
            senderName,
            messageId: msg.id,
            timestamp: msg.timestamp,
            type: "audio",
            mediaId: audioObj?.id,
            mimeType: audioObj?.mime_type || "audio/ogg",
            isVoice: true,
          });
        }
      }
    }
  }

  return messages;
}

export async function downloadWhatsAppMedia(mediaId: string, apiToken?: string): Promise<Buffer | null> {
  const token = apiToken || process.env.WHATSAPP_API_TOKEN;
  if (!token || !mediaId) return null;

  try {
    const metaUrlRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaUrlRes.ok) return null;

    const metaData = await metaUrlRes.json();
    if (!metaData.url) return null;

    const fileRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fileRes.ok) return null;

    const arrayBuf = await fileRes.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.error("[WhatsApp Media] Failed to download media:", err);
    return null;
  }
}

export async function processWhatsAppIntake(
  message: WhatsAppIncomingMessage,
  options?: {
    customAudioBuffer?: Buffer;
    fallbackLanguage?: string;
    baseUrl?: string;
  }
): Promise<WhatsAppSimulationResponse> {
  let transcript = message.text || "";
  let detectedLanguage = options?.fallbackLanguage || "auto";

  // 1. Process Voice Note if audio message
  if (message.type === "audio") {
    let audioBuffer = options?.customAudioBuffer;
    if (!audioBuffer && message.mediaId) {
      audioBuffer = (await downloadWhatsAppMedia(message.mediaId)) || undefined;
    }

    if (audioBuffer && audioBuffer.length > 0) {
      const sttResult = await transcribeAudio({
        audio: audioBuffer,
        mimeType: message.mimeType || "audio/ogg",
        language: detectedLanguage,
      });
      transcript = sttResult.transcript || "";
      detectedLanguage = sttResult.language || "en";
    } else {
      // Offline / fallback mock audio transcribe
      const mockResult = await transcribeAudio({
        audio: Buffer.from("mock-whatsapp-voice"),
        language: detectedLanguage === "auto" ? "kn" : detectedLanguage,
      });
      transcript = mockResult.transcript;
      detectedLanguage = mockResult.language;
    }
  }

  if (!transcript || transcript.trim().length === 0) {
    transcript = "ನಾನು ಮಹಿಳಾ ಟೈಲರ್, ಹೊಸ ಹೊಲಿಗೆ ಯಂತ್ರ ಖರೀದಿಸಲು ನನಗೆ ₹50,000 ಸಾಲ ಬೇಕಾಗಿದೆ.";
    detectedLanguage = "kn";
  }

  // 2. Extract Applicant Intent with AI
  let intent;
  try {
    const aiUrl = process.env.AI_SERVICE_URL || process.env.AIML_SERVICE_URL;
    if (process.env.AI_SERVICE_MODE === "remote" && aiUrl) {
      const remoteAi = new RemoteAiService({ baseUrl: aiUrl, timeoutMs: 15000 });
      intent = await remoteAi.extractApplicantIntent({
        transcript,
        language: detectedLanguage,
      });
    } else {
      const mockService = new MockAiService();
      intent = await mockService.extractApplicantIntent({
        transcript,
        language: detectedLanguage,
      });
    }
  } catch {
    const fallbackService = new MockAiService();
    intent = await fallbackService.extractApplicantIntent({
      transcript,
      language: detectedLanguage,
    });
  }

  // 3. Match against loan scheme catalogue
  const schemes: any[] = (loanSchemes || []) as any[];

  const applicant = {
    projectCategory: intent.project_category || "services",
    requestedAmount: intent.requested_amount || 50000,
    annualIncome: intent.annual_income || 180000,
    trade: intent.trade || "tailoring",
    gender: intent.suggested_gender === "FEMALE" ? ("FEMALE" as const) : ("MALE" as const),
    age: 32,
    applicantTags: intent.suggested_gender === "FEMALE" ? ["WOMEN_ENTREPRENEUR", "ARTISAN"] : ["ARTISAN"],
  };

  const matches = matchSchemes(applicant, schemes as any);
  const topMatch = matches[0]?.scheme;
  const topSchemeName = topMatch?.name || "Pradhan Mantri MUDRA Yojana (Shishu)";
  const requestedAmt = intent.requested_amount || 50000;

  // 4. Formulate Vernacular WhatsApp Reply
  const lang = (detectedLanguage || "en").toLowerCase();
  let replyMessage = "";

  const appBaseUrl = options?.baseUrl || process.env.NEXTAUTH_URL || "https://kaarva.gov.in";
  const confirmationUrl = `${appBaseUrl}/register?source=whatsapp&trade=${encodeURIComponent(intent.trade || "")}&amount=${requestedAmt}&category=${encodeURIComponent(intent.project_category || "")}&phone=${encodeURIComponent(message.from)}`;

  if (lang === "kn" || lang.includes("kannada")) {
    replyMessage = `🙏 *ನಮಸ್ಕಾರ ${message.senderName}!*

ನಿಮ್ಮ ಧ್ವನಿ ಸಂದೇಶವನ್ನು ಸ್ವೀಕರಿಸಲಾಗಿದೆ:
📝 _"${transcript}"_

✅ *ಅರ್ಹತೆಯ ಫಲಿತಾಂಶ:*
• *ಶಿಫಾರಸು ಮಾಡಿದ ಯೋಜನೆ:* ${topSchemeName}
• *ಅಂದಾಜು ಸಾಲದ ಮೊತ್ತ:* ₹${requestedAmt.toLocaleString("en-IN")}
• *ಬಡ್ಡಿ ರಿಯಾಯಿತಿ:* ಮಹಿಳಾ / ಕುಶಲಕರ್ಮಿ ಸಬ್ಸಿಡಿ ಲಭ್ಯವಿದೆ
• *ಹತ್ತಿರದ ಬೆಂಬಲಿತ ಬ್ಯಾಂಕ್:* State Bank of India & Canara Bank

📲 *ನಿಮ್ಮ ಅರ್ಜಿಯನ್ನು ಖಚಿತಪಡಿಸಲು ಮತ್ತು ಪೂರ್ಣಗೊಳಿಸಲು ಈ ಲಿಂಕ್ ಕ್ಲಿಕ್ ಮಾಡಿ:*
👉 ${confirmationUrl}

_ಗ್ರಾಮೀಣ ಸಹಾಯಕ್ಕಾಗಿ ಸಂಪರ್ಕಿಸಿ: ಕಾನ್ವರ್ ಗ್ರಾಮೀಣ ಸೇವೆ._`;
  } else if (lang === "hi" || lang.includes("hindi")) {
    replyMessage = `🙏 *नमस्ते ${message.senderName}!*

आपका वॉइस संदेश प्राप्त हुआ:
📝 _"${transcript}"_

✅ *पात्रता परिणाम:*
• *सर्वश्रेष्ठ योजना:* ${topSchemeName}
• *अनुमानित ऋण राशि:* ₹${requestedAmt.toLocaleString("en-IN")}
• *ब्याज छूट:* महिला / कारीगर सब्सिडी लागू
• *निकटतम सहायता बैंक:* State Bank of India & PNB

📲 *अपने आवेदन की पुष्टि और पूर्ण करने के लिए लिंक पर क्लिक करें:*
👉 ${confirmationUrl}

_ग्रामीण सहायता के लिए संपर्क: कारवां ग्रामीण सेवा._`;
  } else if (lang === "mr" || lang.includes("marathi")) {
    replyMessage = `🙏 *नमस्कार ${message.senderName}!*

तुमचा व्हॉइस मेसेज मिळाला आहे:
📝 _"${transcript}"_

✅ *पात्रता निकाल:*
• *शिफारस केलेली योजना:* ${topSchemeName}
• *कर्ज रक्कम:* ₹${requestedAmt.toLocaleString("en-IN")}
• *अनुदान:* महिला / कारागीर सवलत लागू

📲 *तुमचा अर्ज पूर्ण करण्यासाठी येथे क्लिक करा:*
👉 ${confirmationUrl}`;
  } else {
    replyMessage = `🙏 *Hello ${message.senderName}!*

We received your voice inquiry:
📝 _"${transcript}"_

✅ *Scheme Match Result:*
• *Recommended Scheme:* ${topSchemeName}
• *Estimated Loan Amount:* ₹${requestedAmt.toLocaleString("en-IN")}
• *Subsidies:* Interest concessions applicable for artisans & women entrepreneurs
• *Nearest Bank Support:* SBI & Regional Rural Banks

📲 *Click below to confirm your pre-sanctioned application:*
👉 ${confirmationUrl}

_Assisted by Kaarva Gramin Seva Helpdesk._`;
  }

  // 5. Send Live WhatsApp Outbound Message (if credentials present)
  if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && message.from) {
    await sendWhatsAppMessage({
      to: message.from,
      type: "text",
      body: replyMessage,
    }).catch((e) => console.warn("[WhatsApp Bot] Outbound message skipped/failed:", e));
  }

  return {
    success: true,
    transcript,
    language: detectedLanguage,
    trade: intent.trade || null,
    projectCategory: intent.project_category || null,
    requestedAmount: requestedAmt,
    topScheme: topSchemeName,
    replyMessage,
    confirmationUrl,
  };
}

export async function sendWhatsAppMessage(reply: WhatsAppBotReply): Promise<boolean> {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return false;

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: reply.to.replace(/\D/g, ""),
        type: "text",
        text: { body: reply.body },
      }),
    });

    return res.ok;
  } catch (err) {
    console.error("[WhatsApp Send] Error sending WhatsApp message:", err);
    return false;
  }
}
