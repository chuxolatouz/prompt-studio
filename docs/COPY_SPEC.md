# Copy Spec (ES por defecto)

## Objetivo
Unificar el copy de Prompt Studio para eliminar mezcla ES/EN cuando `lang=es`, mejorar claridad para usuarios no expertos y mantener eficiencia para power users.

## Fuente única de verdad
- Diccionarios:
  - `src/i18n/es.json` (default)
  - `src/i18n/en.json` (fallback)
- Resolución de idioma:
  - `src/i18n/request.ts`
- Helper i18n/pluralización:
  - `src/i18n/helpers.ts`

## Tono y voz
- Claro, directo, optimista.
- "Builder como juego/herramienta".
- CTAs con verbo en infinitivo: `Guardar`, `Publicar`, `Copiar`, `Exportar`.
- Frases cortas: 1 idea por frase.
- Términos técnicos permitidos para power users (`Markdown`, `JSON`, `ZIP`) con microayuda.

## Glosario
- **prompt**: instrucción o plantilla para IA.
- **segmento**: bloque del prompt (Rol, Objetivo, etc.).
- **macro**: plantilla de estructura (RTF, TAO, ...).
- **borrador**: draft guardado (local o nube).
- **publicar**: hacer visible en galería.
- **favorito**: guardado/like (concepto único).
- **exportar**: descargar en TXT, MD o ZIP.
- **clonar (fork)**: crear borrador desde un prompt público.

## Reglas de estilo
- Títulos en capitalización tipo oración.
- Botones con verbo corto.
- Tooltips y ayudas en 1 línea.
- Pluralización ICU correcta (`0/1/n`).
- Sin anglicismos innecesarios en ES.
- Evitar "anti-alucinación"; usar **verificación de consistencia** / **reducción de errores**.

## Tabla de cadenas por pantalla/componente

| Ruta | Componente | Claves i18n principales |
|---|---|---|
| `/` | Home | `landing.*`, `nav.*` |
| `/builders` | Builders Hub | `buildersHub.*`, `nav.*` |
| `/structures` | Structures | `structuresPage.*`, `structures.*`, `actions.copied` |
| `/gallery` | Gallery listado/filtros | `gallery.*`, `actions.*`, `common.loading` |
| `/p/[slug]` | Gallery detalle | `gallery.*`, `actions.copied`, `auth.required*` |
| `/prompt-builder` | Prompt Builder + Quest Mode | `promptBuilder.*`, `help.prompt.*`, `actions.*`, `filters.*`, `common.*` |
| `/skill-builder` | Skill Builder | `skillBuilder.*`, `help.skill.*`, `actions.*`, `visibility.*` |
| `/agent-builder` | Agent Builder | `agentBuilder.*`, `help.agent.*`, `actions.*` |
| `/auth` | Auth page | `auth.*`, `actions.cancel`, `common.loading` |
| Auth Gate Modal | publicar/favorito sin login | `auth.required*`, `auth.loginToContinue`, `auth.register`, `actions.cancel` |
| Header/Nav | global | `nav.*`, `auth.*`, `common.language` |
| Dashboard | cuenta | `dashboard.*`, `common.loading` |

## Mensajes de sistema (toasts/errores/confirmaciones)
- Copiar: `actions.copied` → "Copiado al portapapeles ✅"
- Guardar borrador: `actions.saved` / `skillBuilder.saved` / `agentBuilder.saved`
- Exportar: `actions.exported`
- Publicar: `promptBuilder.published`
- Favoritos: `gallery.favoriteAdded` / `gallery.favoriteRemoved`
- Errores genéricos auth: `auth.genericError`
- Validación publicar: `promptBuilder.publishBlockedTitle` + `promptBuilder.publishBlockedText`
- Validación exportar vacío: `promptBuilder.exportEmpty`

## Tooltips y microayuda clave
- Macro: `help.prompt.macro`, `structuresPage.macroTooltip`
- Modo juego: `promptBuilder.gameModeTooltip`
- Export: `promptBuilder.exportTooltip`
- Skill markdown: `help.skill.markdown`
- Agent tools: `help.agent.tools`

## Checklist QA de copy (ES)
Revisar rutas:
- `/`
- `/builders`
- `/structures`
- `/gallery`
- `/prompt-builder`
- `/skill-builder`
- `/agent-builder`
- `/auth`

Validar:
- No mezcla ES/EN en UI visible para `lang=es`.
- Pluralización correcta (`pasos`, `herramientas`, tiempos relativos).
- CTAs consistentes en infinitivo.
- Tooltips visibles y comprensibles.
- Empty states con CTA primario y secundario cuando aplica.
- Toasts de copiar/exportar/guardar/publicar/favoritos.
