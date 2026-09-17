import { processWhatsAppIntake } from "@/lib/whatsapp/service";
import type { WhatsAppIncomingMessage } from "@/lib/whatsapp/types";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const from = (formData.get("From")?.toString() || "").replace("whatsapp:", "");
    const bodyText = formData.get("Body")?.toString()?.trim() || "";
    const profileName = formData.get("ProfileName")?.toString() || "Beneficiary";
    const numMedia = parseInt(formData.get("NumMedia")?.toString() || "0", 10);
    const mediaUrl0 = formData.get("MediaUrl0")?.toString() || "";
    const mediaType0 = formData.get("MediaContentType0")?.toString() || "";

    const isAudio = numMedia > 0 && (mediaType0.includes("audio") || mediaType0.includes("ogg") || mediaType0.includes("opus") || mediaType0.includes("mp4"));

    let customAudioBuffer: Buffer | undefined;
    if (isAudio && mediaUrl0) {
      try {
        const audioRes = await fetch(mediaUrl0);
        if (audioRes.ok) {
          const arrayBuf = await audioRes.arrayBuffer();
          customAudioBuffer = Buffer.from(arrayBuf);
        }
      } catch (e) {
        console.error("[Twilio WhatsApp] Error downloading audio media:", e);
      }
    }

    const incoming: WhatsAppIncomingMessage = {
      from: from || "919876543210",
      senderName: profileName,
      messageId: `twilio_${Date.now()}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: isAudio ? "audio" : "text",
      text: isAudio ? undefined : bodyText,
      mimeType: mediaType0 || "audio/ogg",
      isVoice: isAudio,
    };

    const host = request.headers.get("host") || "kaarva.gov.in";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const result = await processWhatsAppIntake(incoming, {
      customAudioBuffer,
      fallbackLanguage: "auto",
      baseUrl,
    });

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || "whatsapp:+17372508034";

    // If Twilio credentials are configured in env, send directly via REST API as well
    if (twilioAccountSid && twilioAuthToken && from) {
      try {
        const fullTo = from.startsWith("+") ? `whatsapp:${from}` : `whatsapp:+${from}`;
        const basicAuth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: fullTo,
            Body: result.replyMessage,
          }),
        });
      } catch (restErr) {
        console.error("[Twilio REST API fallback error]", restErr);
      }
    }

    // Return TwiML XML Response to Twilio
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>${escapeXml(result.replyMessage)}</Body>
  </Message>
</Response>`;

    return new Response(twiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[Twilio WhatsApp Webhook Error]", error);
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>🙏 Namaste! We received your message. Please send your trade (e.g. Tailoring, Carpentry) and loan amount, and we will match your government loan scheme.</Body>
  </Message>
</Response>`;

    return new Response(fallbackTwiml, {
      status: 200,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }
}
