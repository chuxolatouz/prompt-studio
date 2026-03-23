import {z} from 'zod';

export const blockSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  sourceId: z.string().optional(),
  niche: z.string().optional(),
  level: z.enum(['basic', 'intermediate', 'advanced']).default('basic'),
  tags: z.array(z.string()).default([]),
});

export const promptColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(blockSchema),
});

export const promptBuilderStateSchema = z.object({
  version: z.number().int().default(2),
  title: z.string(),
  role: z.string().optional(),
  structure: z.string(),
  niche: z.string().optional(),
  antiHallucination: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  columns: z.array(promptColumnSchema),
  segmentOrder: z.array(z.string()).default(['role', 'goal', 'context', 'inputs', 'constraints', 'output-format', 'examples']),
  macro: z.string().optional(),
  onboardingCompleted: z.boolean().default(false),
  preferredMode: z.enum(['pro', 'quest']).default('pro'),
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

export const localizedTextSchema = z.object({
  es: z.string().default(''),
  en: z.string().default(''),
});

export const promptCatalogLevelSchema = z.enum(['basic', 'intermediate', 'advanced']);

export const promptStructureRecordSchema = z.object({
  id: z.string(),
  label: z.string(),
  localizedLabel: localizedTextSchema,
  whatIs: z.string(),
  localizedWhatIs: localizedTextSchema,
  whenToUse: z.array(z.string()).default([]),
  localizedWhenToUse: z.object({
    es: z.array(z.string()).default([]),
    en: z.array(z.string()).default([]),
  }),
  template: z.string(),
  localizedTemplate: localizedTextSchema,
  example: z.string(),
  localizedExample: localizedTextSchema,
  sections: z.array(z.string()).default([]),
  columnOrder: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type PromptStructureRecord = z.infer<typeof promptStructureRecordSchema>;

export const promptRoleRecordSchema = z.object({
  id: z.string(),
  label: z.string(),
  localizedLabel: localizedTextSchema,
  icon: z.string().default('Sparkles'),
  description: z.string().default(''),
  localizedDescription: localizedTextSchema,
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type PromptRoleRecord = z.infer<typeof promptRoleRecordSchema>;

export const promptPaletteBlockRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  localizedTitle: localizedTextSchema,
  content: z.string(),
  localizedContent: localizedTextSchema,
  niche: z.string(),
  structure: z.string(),
  targetColumn: z.string(),
  level: promptCatalogLevelSchema.default('basic'),
  tags: z.array(z.string()).default([]),
  image: z.string().default(''),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type PromptPaletteBlockRecord = z.infer<typeof promptPaletteBlockRecordSchema>;

export const suggestionCategorySchema = z.enum(['structure', 'role', 'palette', 'general']);
export const suggestionStatusSchema = z.enum(['open', 'in_review', 'implemented', 'rejected']);
export const linkedEntityTypeSchema = z.enum(['structure', 'role', 'palette_block']);

export const userSuggestionRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  category: suggestionCategorySchema,
  status: suggestionStatusSchema,
  linkedEntityType: linkedEntityTypeSchema.nullable().optional(),
  linkedEntityId: z.string().nullable().optional(),
  createdBy: z.string().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type SuggestionCategory = z.infer<typeof suggestionCategorySchema>;
export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>;
export type LinkedEntityType = z.infer<typeof linkedEntityTypeSchema>;
export type UserSuggestionRecord = z.infer<typeof userSuggestionRecordSchema>;
