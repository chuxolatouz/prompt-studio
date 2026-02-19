#!/usr/bin/env tsx

import {createClient} from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ghostEmail = process.env.GHOST_EMAIL || 'ghost@prompteero.app';
const ghostPassword = process.env.GHOST_PASSWORD || 'GhostPrompt_2026!';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {autoRefreshToken: false, persistSession: false},
});

const prompts = [
  {
    title: 'Ghost: Plan de contenido semanal para marca personal',
    slug: 'ghost-plan-contenido-semanal',
    structure: 'CARE',
    tags: ['marketing', 'social-media', 'ghost'],
    output_prompt: `# Rol
Actúa como estratega de contenido.

# Objetivo
Diseña un plan semanal simple para no expertos.

# Formato
Tabla con: día, formato, tema, CTA y KPI.`,
  },
  {
    title: 'Ghost: Prompt QA para revisión UI rápida',
    slug: 'ghost-qa-ui-rapida',
    structure: 'RTF',
    tags: ['qa', 'frontend', 'ghost'],
    output_prompt: `# Rol
Senior Frontend QA.

# Tarea
Revisa contraste, spacing, estados vacíos y errores visuales.

# Formato
Checklist con severidad P1-P3 y recomendación accionable.`,
  },
  {
    title: 'Ghost: Brief para landing de producto SaaS',
    slug: 'ghost-brief-landing-saas',
    structure: 'CO-STAR',
    tags: ['saas', 'copywriting', 'ghost'],
    output_prompt: `# Contexto
Lanzamiento de herramienta SaaS B2B.

# Objective
Generar copy claro y persuasivo.

# Response
Hero, 3 beneficios, prueba social y CTA.`,
  },
  {
    title: 'Ghost: SOP de soporte al cliente con IA',
    slug: 'ghost-sop-soporte-ia',
    structure: 'TAO',
    tags: ['support', 'operations', 'ghost'],
    output_prompt: `# Task
Crear SOP para agentes de soporte.

# Action
Definir flujo de triage, escalado y cierre.

# Output
Playbook operativo en pasos numerados.`,
  },
  {
    title: 'Ghost: Plantilla de investigación competitiva',
    slug: 'ghost-investigacion-competitiva',
    structure: 'STAR',
    tags: ['research', 'strategy', 'ghost'],
    output_prompt: `# Situation
Necesitamos comparar 5 competidores.

# Task
Identificar brechas de posicionamiento.

# Result
Matriz final con oportunidades prioritarias.`,
  },
];

function withSuffix(baseSlug: string, index: number) {
  return `${baseSlug}-${index + 1}`;
}

async function ensureGhostUser() {
  const {data: usersResult, error: usersError} = await supabase.auth.admin.listUsers();
  if (usersError) throw usersError;

  const existing = usersResult.users.find((user) => user.email?.toLowerCase() === ghostEmail.toLowerCase());
  if (existing) return existing;

  const {data, error} = await supabase.auth.admin.createUser({
    email: ghostEmail,
    password: ghostPassword,
    email_confirm: true,
    user_metadata: {display_name: 'ghost'},
  });

  if (error) throw error;
  if (!data.user) throw new Error('Could not create ghost user');
  return data.user;
}

async function upsertProfile(userId: string) {
  const {error} = await supabase.from('users_profile').upsert({id: userId, display_name: 'ghost'}, {onConflict: 'id'});
  if (error) throw error;
}

async function seedPrompts(userId: string) {
  for (let index = 0; index < prompts.length; index += 1) {
    const item = prompts[index];
    const slug = withSuffix(item.slug, index);
    const payload = {
      owner_id: userId,
      title: item.title,
      slug,
      language: 'auto',
      visibility: 'public',
      status: 'active',
      hidden_reason: null,
      structure: item.structure,
      tags: item.tags,
      builder_state: {
        source: 'ghost-seed',
        version: 1,
      },
      output_prompt: item.output_prompt,
    };

    const {error} = await supabase.from('prompts').upsert(payload, {onConflict: 'slug'});
    if (error) throw error;
    console.log(`seeded: ${slug}`);
  }
}

async function main() {
  console.log('Seeding public gallery prompts for ghost...');
  const ghost = await ensureGhostUser();
  await upsertProfile(ghost.id);
  await seedPrompts(ghost.id);
  console.log('Done. Ghost gallery prompts are ready.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
