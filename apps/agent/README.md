# Primoria Agent

LangGraph TS agent for the Primoria AI Tutor.

## Local dev

```sh
pnpm install
cp ../../apps/web/.env.local ./.env   # share OpenAI provider settings
pnpm dev                              # runs `langgraphjs dev`, serving graph at http://localhost:2024
```

The Next.js app (`@primoria/web`) talks to this agent via CopilotKit's
`LangGraphHttpAgent` pointed at `http://localhost:2024`.
