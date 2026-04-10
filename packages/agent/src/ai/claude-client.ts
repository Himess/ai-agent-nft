import Anthropic from "@anthropic-ai/sdk";
import { getConfig } from "../config.js";
import { getLogger } from "../utils/logger.js";

export type TaskType =
  | "tweet"
  | "dm"
  | "reply"
  | "collab_eval"
  | "wl_decision"
  | "spam_detect"
  | "reputation_summary";

// Sonnet for creative/strategic tasks, Haiku for routine
const MODEL_MAP: Record<TaskType, string> = {
  tweet: "claude-sonnet-4-6",
  dm: "claude-sonnet-4-6",
  reply: "claude-sonnet-4-6",
  collab_eval: "claude-sonnet-4-6",
  wl_decision: "claude-haiku-4-5-20251001",
  spam_detect: "claude-haiku-4-5-20251001",
  reputation_summary: "claude-haiku-4-5-20251001",
};

const MAX_TOKENS_MAP: Record<TaskType, number> = {
  tweet: 300,
  dm: 500,
  reply: 400,
  collab_eval: 800,
  wl_decision: 400,
  spam_detect: 200,
  reputation_summary: 300,
};

export interface ClaudeResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: getConfig().ANTHROPIC_API_KEY });
  }
  return _client;
}

/**
 * Send a prompt to Claude with automatic model selection based on task type.
 */
export async function ask(
  task: TaskType,
  systemPrompt: string,
  userMessage: string
): Promise<ClaudeResponse> {
  const log = getLogger();
  const model = MODEL_MAP[task];
  const maxTokens = MAX_TOKENS_MAP[task];

  log.debug({ task, model }, "Claude request");

  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  const result: ClaudeResponse = {
    content,
    model: response.model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };

  log.debug(
    { task, inputTokens: result.inputTokens, outputTokens: result.outputTokens },
    "Claude response"
  );

  return result;
}

/**
 * Ask Claude for a JSON-structured response.
 */
export async function askJSON<T>(
  task: TaskType,
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const response = await ask(
    task,
    systemPrompt + "\n\nRespond ONLY with valid JSON. No markdown, no explanation.",
    userMessage
  );

  // Strip potential markdown code fences
  let cleaned = response.content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(cleaned) as T;
}

/**
 * Get the model that would be used for a given task type.
 */
export function getModelForTask(task: TaskType): string {
  return MODEL_MAP[task];
}
