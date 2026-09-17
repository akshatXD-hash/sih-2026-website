import { NextResponse } from "next/server";

import { processWhatsAppIntake } from "@/lib/whatsapp/service";
import type { WhatsAppIncomingMessage } from "@/lib/whatsapp/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fromPhone, senderName, messageType, content, language } = body;

    const incoming: WhatsAppIncomingMessage = {
      from: fromPhone || "919876543210",
      senderName: senderName || "Savitri Bai",
      messageId: `sim_${Date.now()}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: messageType === "audio" ? "audio" : "text",
      text: messageType === "text" ? content : undefined,
      isVoice: messageType === "audio",
    };

    const origin = request.headers.get("origin") || request.headers.get("host") || "http://localhost:3000";
    const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;

    const result = await processWhatsAppIntake(incoming, {
      fallbackLanguage: language || "auto",
      baseUrl,
    });

    return NextResponse.json({
      sender: incoming.senderName,
      fromPhone: incoming.from,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to simulate WhatsApp message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
