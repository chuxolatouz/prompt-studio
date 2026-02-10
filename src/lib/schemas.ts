import {z} from 'zod';

export const blockSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  sourceId: z.string().optional(),
  niche: z.string().optional(),
  level: z.enum(['basic', 'intermediate']).default('basic'),
  tags: z.array(z.string()).default([]),
});

export const promptColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(blockSchema),
});

export const promptBuilderStateSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  role: z.string().optional(),
  structure: z.string(),
  niche: z.string().optional(),
  antiHallucination: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  columns: z.array(promptColumnSchema),
});

export const promptBuilderDraftSchema = z.object({
  state: promptBuilderStateSchema,
  updatedAt: z.string(),
});

export type PromptBuilderState = z.infer<typeof promptBuilderStateSchema>;

export const skillSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  language: z.enum(['es', 'en', 'both']).default('both'),
  markdown: z.string().min(1),
});

export const skillPackSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string(),
  visibility: z.enum(['public', 'private']).default('private'),
  tags: z.array(z.string()).default([]),
  skills: z.array(skillSchema),
});

export type SkillPack = z.infer<typeof skillPackSchema>;

export const agentStepSchema = z.object({
  id: z.string(),
  step: z.string().min(1),
  doneCriteria: z.string().min(1),
});

export const agentSpecSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  role: z.string().min(1),
  objective: z.string().min(1),
  inputs: z.array(z.string()).default([]),
  steps: z.array(agentStepSchema),
  tools: z.array(z.string()).default([]),
  policies: z.array(z.string()).default([]),
  outputContract: z.string().min(1),
  attachedSkills: z.array(skillSchema).default([]),
});

export const agentExportSchema = z.object({
  agents_md: z.string(),
});

export type AgentSpec = z.infer<typeof agentSpecSchema>;

export const promptRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  language: z.enum(['es', 'en', 'auto']).default('auto'),
  visibility: z.enum(['public', 'private']).default('private'),
  status: z.enum(['active', 'hidden']).default('active'),
  hidden_reason: z.string().nullable().optional(),
  structure: z.string(),
  tags: z.array(z.string()).default([]),
  builder_state: z.any(),
  output_prompt: z.string(),
  views_count: z.number().default(0),
  created_at: z.string().optional(),
});

export type PromptRecord = z.infer<typeof promptRecordSchema>;
