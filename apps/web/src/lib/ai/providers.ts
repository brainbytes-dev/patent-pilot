export type AiProvider = "anthropic" | "openai" | "gemini";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export async function callAi(
  messages: AiMessage[],
  options: { maxTokens?: number; json?: boolean } = {}
): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? "anthropic") as AiProvider;
  const dryRun = process.env.AI_DRY_RUN === "true";

  if (dryRun) {
    console.log(`[AI DRY_RUN] provider=${provider} messages=${messages.length}`);
    return options.json
      ? JSON.stringify({ score: 75, reason: "Dry-run: relevant fuer den Bereich." })
      : "Dry-run: Patent Briefing Inhalt.";
  }

  if (provider === "anthropic") return callAnthropic(messages, options);
  if (provider === "openai") return callOpenAi(messages, options);
  if (provider === "gemini") return callGemini(messages, options);
  throw new Error(`Unknown AI provider: ${provider}`);
}

async function callAnthropic(
  messages: AiMessage[],
  options: { maxTokens?: number }
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: options.maxTokens ?? 1024,
    messages,
  });
  const block = res.content[0];
  return block.type === "text" ? block.text : "";
}

async function callOpenAi(
  messages: AiMessage[],
  options: { maxTokens?: number }
): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: options.maxTokens ?? 1024,
    messages,
  });
  return res.choices[0]?.message?.content ?? "";
}

async function callGemini(
  messages: AiMessage[],
  options: { maxTokens?: number }
): Promise<string> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const res = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: options.maxTokens ?? 1024 },
  });
  return res.response.text();
}
