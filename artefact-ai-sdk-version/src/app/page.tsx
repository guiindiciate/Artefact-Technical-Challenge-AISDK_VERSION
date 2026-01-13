"use client";

import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart, type UIMessage } from "ai";
import page from "./page.module.css";

function newSessionId() {
  return (crypto as any).randomUUID ? (crypto as any).randomUUID() : String(Date.now());
}

type MessagePart = NonNullable<UIMessage["parts"]>[number];

function isToolPart(part: MessagePart): part is ToolUIPart {
  return typeof part.type === "string" && part.type.startsWith("tool-");
}

function ToolBadge({ tool }: { tool?: string }) {
  const t = tool || "llm";
  return (
    <span
      style={{
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid #ddd",
        marginLeft: 8,
      }}
    >
    </span>
  );
}

function renderMessageParts(message: UIMessage) {
  if (!message.parts) return null;

  return message.parts.map((part, index) => {
    if (part.type === "text") {
      return (
        <div key={`${message.id}-text-${index}`} style={{ whiteSpace: "pre-wrap" }}>
          {part.text}
        </div>
      );
    }

    return null;
  });
}

export default function Page() {
  const [sessionId, setSessionId] = useState("");
  const [lastTool, setLastTool] = useState<string>("llm");
  const [lastTrace, setLastTrace] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("session_id");
    const sid = saved || newSessionId();
    localStorage.setItem("session_id", sid);
    setSessionId(sid);
  }, []);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { session_id: sessionId } }),
    [sessionId]
  );
  const { messages, setMessages, sendMessage, status } = useChat({
    transport,
    onData: (dataPart) => {
      if (dataPart.type !== "data-tool") return;
      const payload = dataPart.data as { tool_used?: string; trace_id?: string };
      if (payload.tool_used) setLastTool(payload.tool_used);
      if (payload.trace_id) setLastTrace(payload.trace_id);
    },
  });
  const isLoading = status === "submitted" || status === "streaming";
  const [input, setInput] = useState("");

  async function send() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  async function clear() {
    await fetch("/api/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
    setMessages([]);
    setLastTool("llm");
    setLastTrace("");
  }
return (
  <main className={page.container}>
    <div className={page.chatbox}>
      {/* TOP BAR */}
      <div className={page.topBar}>
        <div className={page.topBarHeader}>
          <h1 className={page.title}>
            <img src="/artefact-logo.png" alt="Artefact logo" style={{ height: 28 }} />
            Assistant | Data & AI to drive impact
          </h1>

          <a
            href="https://www.artefact.com/"
            target="_blank"
            rel="noreferrer"
            className={page.aboutBtn}
          >
            About Artefact →
          </a>
        </div>

        <div className={page.actions}>
          <button
            onClick={clear}
            disabled={isLoading}
            className={page.clearBtn}
          >
            Clear conversation
          </button>

          <span className={page.session}>Session: {sessionId}</span>
          <ToolBadge tool={lastTool} />

          {lastTrace && <span className={page.trace}>trace: {lastTrace}</span>}
        </div>
      </div>

      {/* MESSAGES */}
      <div className={page.messages}>
        {messages.map((m) => (
          <div key={m.id} className={page.message}>
            <div className={page.role}>
              {m.role === "user" ? "You" : "Artefact Assistant"}
            </div>
            <div>{renderMessageParts(m)}</div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className={page.empty}>
            Try: “What is 128 times 46?”, “Convert 1 USD to BRL”, “How much is 0.1 BTC in BRL?”
          </div>
        )}

        {isLoading && (
          <div className={page.typing}>
            Artefact Assistant is typing…
          </div>
        )}
      </div>

      {/* INPUT */}
      <div className={page.inputArea}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..."
          className={page.input}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />

        <button
          onClick={send}
          disabled={!input.trim() || isLoading}
          className={page.sendBtn}
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  </main>
);


}
