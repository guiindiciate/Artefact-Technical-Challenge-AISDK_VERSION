import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type FinishReason,
  ToolLoopAgent,
  type UIMessage,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "@/src/lib/system";
import { TOOLS } from "@/src/lib/tools.server";
import { getSession, setSession } from "@/src/lib/memory";

type Req = {
  session_id?: string;
  messages?: UIMessage[];
  message?: string;
};

function makeTraceId() {
  return crypto.randomUUID();
}

function textMsg(role: UIMessage["role"], text: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role,
    parts: [{ type: "text", text }],
  };
}

export async function POST(req: Request) {
  const body = (await req.json()) as Req;
  const sessionId = body.session_id || "default";
  const traceId = makeTraceId();

  let uiMessages = body.messages;
  if (!uiMessages || uiMessages.length === 0) {
    const history = getSession(sessionId);
    uiMessages = body.message ? [...history, textMsg("user", body.message)] : history;
  }

  // Convert UI -> Model messages for agent
  const modelMessages = await convertToModelMessages(uiMessages);

  let finishReason: FinishReason | undefined;
  let tool_used = "llm";
  const calledTools: string[] = [];
  let finalToolOutput: string | undefined;

  const agent = new ToolLoopAgent({
    model: openai("gpt-4o-mini"),
    tools: TOOLS,
    instructions: SYSTEM_PROMPT,
    temperature: 0,
    onStepFinish: (step) => {
      const stepTools = step.toolCalls?.map((call) => call.toolName).filter(Boolean) ?? [];
      calledTools.push(...stepTools);
    },
  });

  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      const result = await agent.stream({ messages: modelMessages });

      writer.merge(result.toUIMessageStream({ sendFinish: false }));

      const toolResults = await result.toolResults;
      const outputs = toolResults.map((tr) => tr.output).filter((output) => output != null);
      for (let i = outputs.length - 1; i >= 0; i -= 1) {
        const output = outputs[i];
        if (typeof output === "number" && Number.isFinite(output)) {
          finalToolOutput = String(output);
          break;
        }
        if (typeof output === "string" && output.trim().length > 0 && !Number.isNaN(Number(output))) {
          finalToolOutput = String(Number(output));
          break;
        }
      }

      const text = await result.text;
      const finalText = finalToolOutput ?? text;
      const newHistory: UIMessage[] = [...uiMessages, textMsg("assistant", finalText)];
      setSession(sessionId, newHistory);

      tool_used = calledTools.length ? calledTools[calledTools.length - 1] : "llm";
      writer.write({ type: "data-tool", data: { tool_used, trace_id: traceId } });
      writer.write({ type: "finish", finishReason });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
