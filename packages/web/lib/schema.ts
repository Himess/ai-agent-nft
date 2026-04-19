import { z } from "zod";

// Identity (wallet + twitter) comes from the SIWE + X-OAuth session, not the
// form. The fields below are the narrative prompts — authored by the user.

export const LIMITS = {
  name: { min: 1, max: 120 },
  discovery: { min: 10, max: 500 },
  endurance: { min: 10, max: 1500 },
  recognition: { min: 10, max: 1500 },
  offering: { min: 10, max: 1500 },
  links: { min: 0, max: 500 },
} as const;

const bounded = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `Must be at least ${min} characters`)
    .max(max, `Must be at most ${max} characters`);

export const applicationSchema = z.object({
  name: bounded(LIMITS.name.min, LIMITS.name.max),
  discovery: bounded(LIMITS.discovery.min, LIMITS.discovery.max),
  endurance: bounded(LIMITS.endurance.min, LIMITS.endurance.max),
  recognition: bounded(LIMITS.recognition.min, LIMITS.recognition.max),
  offering: bounded(LIMITS.offering.min, LIMITS.offering.max),
  links: z
    .string()
    .trim()
    .max(LIMITS.links.max, `Must be at most ${LIMITS.links.max} characters`)
    .optional()
    .or(z.literal("")),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

export const QUESTIONS = [
  {
    id: "name",
    label: "Name or Alias",
    type: "input",
    placeholder: "How the order should know you.",
    min: LIMITS.name.min,
    max: LIMITS.name.max,
    required: true,
  },
  {
    id: "discovery",
    label: "How did you find SURVIVORS?",
    type: "textarea",
    placeholder: "A trail you followed. A signal you saw.",
    min: LIMITS.discovery.min,
    max: LIMITS.discovery.max,
    required: true,
  },
  {
    id: "endurance",
    label: "What kept you here after the collapse?",
    type: "textarea",
    placeholder: "Not why you arrived. Why you stayed.",
    min: LIMITS.endurance.min,
    max: LIMITS.endurance.max,
    required: true,
  },
  {
    id: "recognition",
    label: "Which of the Seven do you recognize yourself in, and why?",
    type: "textarea",
    placeholder: "Name one. Explain briefly.",
    min: LIMITS.recognition.min,
    max: LIMITS.recognition.max,
    required: true,
  },
  {
    id: "offering",
    label: "What do you carry that belongs in an order like this?",
    type: "textarea",
    placeholder: "Skill, presence, temperament. What you bring.",
    min: LIMITS.offering.min,
    max: LIMITS.offering.max,
    required: true,
  },
  {
    id: "links",
    label: "Links",
    type: "textarea",
    placeholder: "Portfolio, work, prior orders. One per line.",
    min: 0,
    max: LIMITS.links.max,
    required: false,
  },
] as const;

export type QuestionId = (typeof QUESTIONS)[number]["id"];
