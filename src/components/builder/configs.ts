export type BuilderExportFormat = 'txt' | 'md' | 'zip';

export const promptBuilderConfig = {
  id: 'prompt-builder',
  steps: [
    {id: 'role', titleKey: 'promptBuilder.columns.role'},
    {id: 'goal', titleKey: 'promptBuilder.columns.goal'},
    {id: 'context', titleKey: 'promptBuilder.columns.context'},
    {id: 'inputs', titleKey: 'promptBuilder.columns.inputs'},
    {id: 'constraints', titleKey: 'promptBuilder.columns.constraints'},
    {id: 'output-format', titleKey: 'promptBuilder.columns.output-format'},
    {id: 'examples', titleKey: 'promptBuilder.columns.examples'},
  ],
  exportFormats: ['txt', 'md', 'zip'] as BuilderExportFormat[],
  requiredForPublish: ['role', 'goal', 'output-format'],
};

export const skillBuilderConfig = {
  id: 'skill-builder',
  steps: [
    {id: 'step-pack-info', titleKey: 'skillBuilder.packTitle'},
    {id: 'step-skills', titleKey: 'nav.skillBuilder'},
    {id: 'step-editor', titleKey: 'skillBuilder.editor'},
  ],
  exportFormats: ['md', 'zip'] as BuilderExportFormat[],
};

export const agentBuilderConfig = {
  id: 'agent-builder',
  steps: [
    {id: 'step-identity', titleKey: 'agentBuilder.agentTitle'},
    {id: 'step-objective', titleKey: 'agentBuilder.objective'},
    {id: 'step-inputs', titleKey: 'agentBuilder.inputs'},
    {id: 'step-steps', titleKey: 'agentBuilder.steps'},
    {id: 'step-tools', titleKey: 'agentBuilder.tools'},
    {id: 'step-policies', titleKey: 'agentBuilder.policies'},
    {id: 'step-output', titleKey: 'agentBuilder.outputContract'},
    {id: 'step-skills', titleKey: 'agentBuilder.attachSkills'},
  ],
  exportFormats: ['txt', 'md', 'zip'] as BuilderExportFormat[],
};
