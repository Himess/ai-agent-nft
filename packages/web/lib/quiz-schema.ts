import { z } from "zod";

export const QUIZ_LIMITS = {
  twitter: { min: 1, max: 16 },
  wallet: { min: 42, max: 42 },
  recognition: { min: 50, max: 500 },
  collapse: { min: 80, max: 800 },
  katana: { min: 60, max: 500 },
  judgment: { min: 100, max: 800 },
  autonomy: { min: 50, max: 500 },
  storm: { min: 40, max: 300 },
  signal: { min: 80, max: 600 },
  owed: { min: 40, max: 400 },
  scroll: { min: 10, max: 200 },
  refusal: { min: 40, max: 400 },
} as const;

const bounded = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `Must be at least ${min} characters`)
    .max(max, `Must be at most ${max} characters`);

export const quizSchema = z.object({
  twitter: bounded(QUIZ_LIMITS.twitter.min, QUIZ_LIMITS.twitter.max).regex(
    /^@?[A-Za-z0-9_]{1,15}$/,
    "Invalid X / Twitter handle"
  ),
  wallet: z
    .string()
    .trim()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  recognition: bounded(QUIZ_LIMITS.recognition.min, QUIZ_LIMITS.recognition.max),
  collapse: bounded(QUIZ_LIMITS.collapse.min, QUIZ_LIMITS.collapse.max),
  katana: bounded(QUIZ_LIMITS.katana.min, QUIZ_LIMITS.katana.max),
  judgment: bounded(QUIZ_LIMITS.judgment.min, QUIZ_LIMITS.judgment.max),
  autonomy: bounded(QUIZ_LIMITS.autonomy.min, QUIZ_LIMITS.autonomy.max),
  storm: bounded(QUIZ_LIMITS.storm.min, QUIZ_LIMITS.storm.max),
  signal: bounded(QUIZ_LIMITS.signal.min, QUIZ_LIMITS.signal.max),
  owed: bounded(QUIZ_LIMITS.owed.min, QUIZ_LIMITS.owed.max),
  scroll: bounded(QUIZ_LIMITS.scroll.min, QUIZ_LIMITS.scroll.max),
  refusal: bounded(QUIZ_LIMITS.refusal.min, QUIZ_LIMITS.refusal.max),
});

export type QuizInput = z.infer<typeof quizSchema>;

// Identifier questions ask for twitter + wallet. Everything else is scored by
// the agent. Single source of truth for the form (client) + the server action
// + the DB export script.
export const QUIZ_IDENTITY = [
  {
    id: "twitter",
    label: "X / Twitter Handle",
    type: "input",
    placeholder: "@handle",
    min: QUIZ_LIMITS.twitter.min,
    max: QUIZ_LIMITS.twitter.max,
    required: true,
  },
  {
    id: "wallet",
    label: "Wallet Address",
    type: "input",
    placeholder: "0x…",
    min: QUIZ_LIMITS.wallet.min,
    max: QUIZ_LIMITS.wallet.max,
    required: true,
  },
] as const;

export const QUIZ_QUESTIONS = [
  {
    id: "recognition",
    label: "Which of The Seven do you recognize in yourself — and what scar proves it?",
    type: "textarea",
    placeholder:
      "Name one: Young Ronin, Crimson Widow, Old Samurai, Farwalker, Shadow Chief, or the two unrevealed. Explain why.",
    min: QUIZ_LIMITS.recognition.min,
    max: QUIZ_LIMITS.recognition.max,
    required: true,
  },
  {
    id: "collapse",
    label: "Describe the dead cycle you walked through.",
    type: "textarea",
    placeholder:
      "A winter, a project, a chapter that ended badly. What did it take from you, and what did you keep.",
    min: QUIZ_LIMITS.collapse.min,
    max: QUIZ_LIMITS.collapse.max,
    required: true,
  },
  {
    id: "katana",
    label: "Why do you still carry a katana? What keeps the edge sharp?",
    type: "textarea",
    placeholder: "The discipline behind staying ready. Not the performance of it.",
    min: QUIZ_LIMITS.katana.min,
    max: QUIZ_LIMITS.katana.max,
    required: true,
  },
  {
    id: "judgment",
    label:
      "Name one project from the cycle you respect and one you despise. Explain both briefly.",
    type: "textarea",
    placeholder: "Names. Reasons. No hedging.",
    min: QUIZ_LIMITS.judgment.min,
    max: QUIZ_LIMITS.judgment.max,
    required: true,
  },
  {
    id: "autonomy",
    label: "The Seventh is autonomous. What should it do that no team would approve?",
    type: "textarea",
    placeholder: "Not violence. Not fraud. A decision only an unhuman operator could make.",
    min: QUIZ_LIMITS.autonomy.min,
    max: QUIZ_LIMITS.autonomy.max,
    required: true,
  },
  {
    id: "storm",
    label: "SURVIVORS sells out. Floor drops 70% in week 2. What do you do?",
    type: "textarea",
    placeholder: "Short. Decisive. No cope.",
    min: QUIZ_LIMITS.storm.min,
    max: QUIZ_LIMITS.storm.max,
    required: true,
  },
  {
    id: "signal",
    label: "Describe one moment you chose signal over noise.",
    type: "textarea",
    placeholder: "Specific. Not a slogan.",
    min: QUIZ_LIMITS.signal.min,
    max: QUIZ_LIMITS.signal.max,
    required: true,
  },
  {
    id: "owed",
    label: "What do you owe this order that you haven't given yet?",
    type: "textarea",
    placeholder: "Not a transaction. A promise that holds weight.",
    min: QUIZ_LIMITS.owed.min,
    max: QUIZ_LIMITS.owed.max,
    required: true,
  },
  {
    id: "scroll",
    label: "Write a single sentence that belongs on the founding scroll.",
    type: "textarea",
    placeholder: "One sentence. Heavy enough to survive the cycle.",
    min: QUIZ_LIMITS.scroll.min,
    max: QUIZ_LIMITS.scroll.max,
    required: true,
  },
  {
    id: "refusal",
    label: "What would you refuse to do for an airdrop? Name one specific thing.",
    type: "textarea",
    placeholder: "A line you don't cross, even at the price of free money.",
    min: QUIZ_LIMITS.refusal.min,
    max: QUIZ_LIMITS.refusal.max,
    required: true,
  },
] as const;

export type QuizQuestionId = (typeof QUIZ_QUESTIONS)[number]["id"];
