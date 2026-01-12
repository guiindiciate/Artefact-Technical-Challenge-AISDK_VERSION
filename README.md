Artefact VERCEL-AI-SDK Version

---

## Artefact Assistant | Data & AI to Drive Impact

An intelligent AI assistant that automatically decides when to use external tools (calculator, FX, crypto) or respond using its own knowledge. The assistant supports tool routing, multi-tool chaining, optional conversational memory, and a streaming chat UI using the Vercel AI SDK.

---

## Project Structure

```text
artefact-ai-sdk-version/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts        # Chat API (ToolLoopAgent + streaming)
│   │   │   └── reset/
│   │   │       └── route.ts        # Memory reset API
│   │   └── page.tsx                # Chat UI
│   └── lib/
│       ├── memory.ts               # In-memory session store
│       ├── system.ts               # System prompt and tool policy
│       └── tools.server.ts         # Tools (calculator, FX, crypto)
├── public/                         # Static assets
├── package.json

```

---

## How to Run

1) Install dependencies:

```bash
npm install
```

2) Create `.env.local` with your OpenAI key:

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxx
```

3) Start the development server:

```bash
npm run dev
```

4) Open `http://localhost:3000`.

---

## Architecture

```
User -> UI (useChat) -> /api/chat -> ToolLoopAgent -> Tools -> Final Answer
                           |
                           -> Memory (session_id)
```

---

## Core Components

### Tools (`src/lib/tools.server.ts`)

Deterministic tools used for accuracy and traceability:
- `calculator`: arithmetic evaluation
- `fx_convert`: fiat conversion using a public FX API
- `crypto_convert`: crypto pricing via CoinGecko

### Chat API (`src/app/api/chat/route.ts`)

- Converts UI messages to model messages
- Runs a ToolLoopAgent with tool calling enabled
- Streams responses to the UI
- Returns only the final numeric result when tools are used
- Stores conversation history in memory

### UI (`src/app/page.tsx`)

- Uses `@ai-sdk/react` to send and receive streaming messages
- Maintains a session id in local storage
- Shows only the final assistant response (no intermediate tool outputs)

---

## How It Works

1) The user sends a message from the UI.
2) The server converts UI messages into model messages.
3) The ToolLoopAgent decides whether tools are required.
4) Tools are executed and the model completes the answer.
5) The server returns only the final result to the UI.
6) The conversation history is stored by `session_id`.

---

## Implementation Logic

- Built on the Vercel AI SDK with ToolLoopAgent for multi-step tool calling.
- Kept tool logic deterministic for accurate math and conversion results.
- Streamed responses to provide a responsive chat experience.
- Implemented lightweight, in-memory conversational memory per session.
- Ensured the final user response is concise and free of intermediate tool data.

---

## Examples

```
>>> User: "What does Artefact do in a few words?"
Artefact Assistant: "Artefact leverages data and AI to drive impactful business decisions and strategies."

>>> User: "What is 128 times 46?"
Artefact Assistant: "128 times 46 is 5888."

>>> User: "How much is 1 USD in BRL?"
Artefact Assistant: "1 USD is 5.38 BRL."

>>> User: "Using the current BTC price in BRL and the USD/BRL exchange rate, what is the price of 0.1 BTC in USD?"
Artefact Assistant: "The price of 0.1 BTC in USD is approximately 9149.20 USD."
```

---

## Technologies

- Vercel AI SDK
- OpenAI GPT-4o-mini
- Next.js (React)
- TypeScript
- Node.js 18+
- Zod (Validation Library)

---

## References

- https://ai-sdk.dev/docs
- https://nextjs.org/docs
- https://platform.openai.com/docs
