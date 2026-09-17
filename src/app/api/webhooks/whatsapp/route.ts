import { NextResponse } from "next/server";

import { parseWhatsAppWebhook, processWhatsAppIntake } from "@/lib/whatsapp/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "kaarva_sih_2026_verify_token";

  if (mode === "subscribe" && token === expectedToken && challenge) {
    console.log("[WhatsApp Webhook] Verification handshake successful.");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden: Token mismatch" }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const messages = parseWhatsAppWebhook(body);

    if (messages.length === 0) {
      return NextResponse.json({ status: "ignored_no_messages" }, { status: 200 });
    }

    const results = [];
    for (const msg of messages) {
      try {
        const result = await processWhatsAppIntake(msg);
        results.push(result);
      } catch (err) {
        console.error(`[WhatsApp Webhook] Failed processing msg ${msg.messageId}:`, err);
      }
    }

    return NextResponse.json({
      status: "processed",
      processedCount: results.length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal webhook error";
    console.error("[WhatsApp Webhook] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
