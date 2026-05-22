/**
 * API route: POST /api/jarvis/chat
 *
 * Proxy endpoint that forwards chat requests to the local Jarvis server.
 * If Jarvis is offline, falls back to Gemini for responses.
 * Logs interactions to Supabase.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { chatWithJarvis } from "@/lib/jarvis-client";
import { callGemini } from "@/lib/ai/gemini";
import { supabaseServer } from "@/lib/supabase";

interface ChatRequest {
  text: string;
  userId: string;
  deep?: boolean;
}

interface ChatResponse {
  success: boolean;
  reply: string;
  source: "jarvis" | "gemini";
  action?: string;
  target?: string;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | ErrorResponse>
) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, userId, deep } = req.body as ChatRequest;

    // Validate input
    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Try to chat with Jarvis first
    const jarvisResponse = await chatWithJarvis(text.trim(), deep);

    if (jarvisResponse) {
      // Jarvis is online and responded
      try {
        // Log interaction to Supabase (optional, non-blocking)
        const supabase = supabaseServer();
        await supabase.from("jarvis_interactions").insert([
          {
            user_id: userId,
            user_text: text,
            assistant_reply: jarvisResponse.reply,
            action: jarvisResponse.action,
            source: "jarvis",
          },
        ]);
      } catch (logError) {
        // Logging failed, but we still return the response
        console.warn("[Jarvis Chat] Failed to log interaction:", logError);
      }

      return res.status(200).json({
        success: true,
        reply: jarvisResponse.reply,
        source: "jarvis",
        action: jarvisResponse.action,
        target: jarvisResponse.target,
      });
    }

    // Jarvis is offline or didn't respond; fall back to Gemini
    console.warn("[Jarvis Chat] Jarvis offline, falling back to Gemini");

    try {
      const geminiReply = await callGemini(text.trim(), false);

      // Log interaction to Supabase
      const supabase = supabaseServer();
      await supabase.from("jarvis_interactions").insert([
        {
          user_id: userId,
          user_text: text,
          assistant_reply: geminiReply,
          action: null,
          source: "gemini",
        },
      ]);

      return res.status(200).json({
        success: true,
        reply: geminiReply,
        source: "gemini",
      });
    } catch (geminiError) {
      console.error("[Jarvis Chat] Gemini fallback failed:", geminiError);
      return res.status(503).json({
        error: "Jarvis is offline and Gemini fallback failed",
      });
    }
  } catch (error) {
    console.error("[Jarvis Chat] Unexpected error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
