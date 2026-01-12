import type { UIMessage } from "ai";

const SESSIONS = new Map<string, UIMessage[]>();

export function getSession(sessionId: string): UIMessage[] {
  return SESSIONS.get(sessionId) ?? [];
}

export function setSession(sessionId: string, messages: UIMessage[]) {
  SESSIONS.set(sessionId, messages);
}

export function clearSession(sessionId: string) {
  SESSIONS.delete(sessionId);
}
