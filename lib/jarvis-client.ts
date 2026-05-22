/**
 * Jarvis Client — HTTP client for communicating with Jarvis API server.
 *
 * Provides methods to:
 * - Chat with Jarvis brain
 * - Remember/forget facts
 * - Query memory
 * - Execute actions
 * - Check if Jarvis is online
 */

const JARVIS_URL = process.env.NEXT_PUBLIC_JARVIS_URL || "http://localhost:8000";
const DEFAULT_TIMEOUT = 8000; // 8 seconds

export interface ChatRequest {
  text: string;
  deep?: boolean;
}

export interface ChatResponse {
  reply: string;
  action?: string;
  target?: string;
  extra?: string;
}

export interface MemoryEntry {
  value: string;
  timestamp: number;
  source?: "jarvis" | "os";
}

export interface MemoryDump {
  persistent: Record<string, MemoryEntry>;
  ephemeral: Array<{
    user: string;
    assistant: string;
    timestamp: number;
  }>;
}

export interface JarvisStatus {
  online: boolean;
  brain: string;
  router: string;
  memory: string;
}

/**
 * Fetch with timeout.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Chat with Jarvis.
 * Sends text and optionally requests deep reasoning.
 */
export async function chatWithJarvis(
  text: string,
  deep: boolean = false
): Promise<ChatResponse | null> {
  if (!text || !text.trim()) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(`${JARVIS_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), deep }),
    });

    if (!response.ok) {
      throw new Error(`Jarvis API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[Jarvis Chat] Error:", error);
    return null;
  }
}

/**
 * Add or update a persistent memory fact.
 */
export async function jarvisRemember(key: string, value: string): Promise<boolean> {
  if (!key || !value) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(`${JARVIS_URL}/remember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });

    return response.ok;
  } catch (error) {
    console.error("[Jarvis Remember] Error:", error);
    return false;
  }
}

/**
 * Delete a persistent memory fact by key.
 */
export async function jarvisForget(key: string): Promise<boolean> {
  if (!key) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(`${JARVIS_URL}/forget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });

    return response.ok;
  } catch (error) {
    console.error("[Jarvis Forget] Error:", error);
    return false;
  }
}

/**
 * Query a persistent memory fact by key.
 */
export async function jarvisRecall(key: string): Promise<string | null> {
  if (!key) {
    return null;
  }

  try {
    const response = await fetchWithTimeout(`${JARVIS_URL}/recall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.value || null;
  } catch (error) {
    console.error("[Jarvis Recall] Error:", error);
    return null;
  }
}

/**
 * Get the full memory dump (persistent + ephemeral).
 */
export async function getJarvisMemory(): Promise<MemoryDump | null> {
  try {
    const response = await fetchWithTimeout(`${JARVIS_URL}/memory`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[Jarvis Memory] Error:", error);
    return null;
  }
}

/**
 * Execute an action on Jarvis.
 */
export async function executeJarvisAction(
  action: string,
  target?: string,
  extra?: string
): Promise<boolean> {
  if (!action) {
    return false;
  }

  try {
    const response = await fetchWithTimeout(`${JARVIS_URL}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, target: target || "", extra: extra || "" }),
    });

    return response.ok;
  } catch (error) {
    console.error("[Jarvis Action] Error:", error);
    return false;
  }
}

/**
 * Check if Jarvis is online and ready.
 */
export async function checkJarvisStatus(): Promise<JarvisStatus | null> {
  try {
    const response = await fetchWithTimeout(`${JARVIS_URL}/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      return { online: false, brain: "", router: "", memory: "" };
    }

    return await response.json();
  } catch (error) {
    console.error("[Jarvis Status] Error:", error);
    return null;
  }
}

/**
 * Quick health check — returns true if Jarvis is reachable.
 */
export async function isJarvisOnline(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${JARVIS_URL}/health`,
      { method: "GET" },
      3000 // Faster timeout for health check
    );
    return response.ok;
  } catch {
    return false;
  }
}
