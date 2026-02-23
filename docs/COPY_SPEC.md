# Copy Spec (ES por defecto)

## Objetivo
Unificar el copy de Prompt Studio para eliminar mezcla ES/EN cuando `lang=es`, mejorar claridad para usuarios no expertos y mantener velocidad para power users.

## Fuente única de verdad
- Diccionarios: `src/i18n/es.json` y `src/i18n/en.json`.
- Resolución de idioma por cookie: `src/i18n/request.ts`.
- Helpers: `src/i18n/helpers.ts` (`t`, `tKey`, `tPlural`).
- Regla operativa: ninguna cadena UI relevante debe quedar hardcodeada en componentes de páginas objetivo.

## Tono y voz
- Claro, directo y optimista.
- Enfoque "builder como juego/herramienta".
- CTAs en infinitivo: `Guardar`, `Publicar`, `Copiar`, `Exportar`.
- Frases cortas, una idea por frase.
- Términos técnicos permitidos (`Markdown`, `JSON`, `ZIP`) con microayuda de 1 línea.

## Glosario
- **prompt**: instrucción o plantilla para IA.
- **segmento**: bloque del prompt (Rol, Objetivo, etc.).
- **macro**: plantilla de estructura (RTF, TAO, STAR, etc.).
- **borrador**: draft guardado (local o nube).
- **publicar**: hacer visible en galería.
- **favorito**: guardado/like (concepto único).
- **exportar**: descargar en TXT, MD o ZIP.
- **clonar (fork)**: crear borrador desde un prompt público.

## Reglas de estilo
- Títulos con capitalización tipo oración.
- Botones con verbo corto.
- Tooltips y ayudas de 1 línea.
- Pluralización ICU correcta (`0 pasos`, `1 paso`, `2 pasos`; `0 herramientas`, etc.).
- Evitar anglicismos cuando hay alternativa clara (`Descargar`, no `Download`).
- `prompt` se mantiene como término de dominio.
- No usar “anti-alucinación” en UI final; usar `Verificación de consistencia`.

## Tabla de cadenas (pantalla + componente)

| Ruta | Componente | Cadenas clave (ES) |
|---|---|---|
| `/` | Hero | `Crea prompts, skills y agents como si fuera un juego`; `Arrastra segmentos, aplica macros y exporta en texto, Markdown o ZIP.` |
| `/` | CTAs | `Empezar en Builders`; `Ver galería` |
| `/` | Cards home | Prompt: `Construye prompts por segmentos y reordénalos a tu gusto.` Skill: `Crea skills reutilizables y empaquétalas en un ZIP.` Agent: `Define un agente con pasos, tools y contrato de salida.` |
| Global | Navbar | `Inicio`, `Builders`, `Estructuras`, `Galería`, `Idioma`, `Iniciar sesión`, `Mi cuenta`, `Cerrar sesión` |
| `/builders` | Hub | `Builders`; `Elige qué quieres construir hoy.`; CTA `Abrir` |
| `/structures` | Listado macros | `Estructuras`; `Plantillas para ordenar tus prompts.`; `Copiar plantilla`; `Copiar ejemplo`; tooltip: `Una macro reordena los segmentos del prompt.` |
| `/gallery` | Cabecera | `Galería`; `Explora prompts públicos y guarda tus favoritos.` |
| `/gallery` | Empty state | `Aún no hay prompts públicos`; `Publica el primero y ayúdanos a iniciar la biblioteca.`; CTAs `Crear un prompt` y `Ver estructuras` |
| `/gallery` | Cards | `Ver`; `Guardar en favoritos`; `Quitar de favoritos`; `Macro: {macro}`; tooltip sin login: `Inicia sesión para guardar en favoritos` |
| `/prompt-builder` | Header | `Prompt Builder`; `Construye por segmentos, reordena y exporta.` |
| `/prompt-builder` | Modo | `Modo Pro`; `Modo Juego`; tooltip: `Aprende arrastrando segmentos. Puedes volver cuando quieras.` |
| `/prompt-builder` | Stepper | `Segmentos`; estado `Completo` / `Pendiente` |
| `/prompt-builder` | Mínimos | `Mínimos para publicar: Rol, Objetivo y Formato.`; `Faltan: {items}.`; `Listo para publicar` |
| `/prompt-builder` | Acciones | `Guardar borrador`; `Publicar`; `Copiar`; `Exportar` |
| `/prompt-builder` | Export menu | `Texto (.txt)`; `Markdown (.md)`; `Bundle (.zip)`; tooltip: `Incluye prompt + metadata en archivos.` |
| `/prompt-builder` | Segmentos | Rol, Objetivo, Contexto, Inputs, Restricciones, Formato de salida, Ejemplos + placeholders y ayudas en `promptBuilder.placeholders.*` y `help.prompt.*` |
| `/prompt-builder` | Macro modal | `Aplicar macro`; `Esto reordena tus segmentos, sin borrar contenido.`; `Antes`; `Después`; botones `Aplicar` y `Cancelar` |
| `/prompt-builder` | Verificación | Label: `Verificación de consistencia`; tooltip: `Añade reglas para reducir errores e inventos.` |
| `/prompt-builder` | Quest mode | `Arma tu primer prompt`; `Arrastra estos segmentos al tablero.`; progreso `{done} de {total}`; final `¡Listo! Ya puedes continuar en Modo Pro.` |
| `/skill-builder` | Header | `Skill Builder`; `Crea skills reutilizables en Markdown.` |
| `/skill-builder` | Pack | `Mi pack de skills`; contador plural `skillsCount`; botones `Guardar borrador` y `Descargar pack (.zip)` |
| `/skill-builder` | Empty state | `Aún no tienes skills`; `Crea tu primera skill o usa una plantilla.`; CTAs `Nueva skill` y `Usar plantilla` |
| `/agent-builder` | Header | `Agent Builder`; `Define objetivos, pasos, tools y salida.` |
| `/agent-builder` | Contadores | `{n} pasos`; `{n} herramientas` |
| `/agent-builder` | Secciones | `Título del agente`, `Objetivo`, `Inputs`, `Plan / pasos`, `Herramientas`, `Políticas / restricciones`, `Contrato de salida`, `Adjuntar skills` |
| `/agent-builder` | Acciones | `Guardar borrador`; `Exportar bundle (.zip)`; `Copiar prompt`; `Copiar AGENTS.md`; `Exportar` |
| `/auth` + modal | Auth | `Inicia sesión para continuar`; `Necesitas una cuenta para publicar o guardar en favoritos.`; tabs `Iniciar sesión` / `Crear cuenta`; campos `Correo` / `Contraseña`; `Continuar`; `Cancelar`; `¿Olvidaste tu contraseña?` |

## Mensajes de sistema
- `actions.copied`: `Copiado al portapapeles ✅`.
- `actions.saved`: `Borrador guardado ✅`.
- `actions.exported`: `Exportación lista ✅`.
- `promptBuilder.published`: `Publicado en la galería 🎉`.
- `gallery.favoriteAdded`: `Guardado en favoritos ✅`.
- `gallery.favoriteRemoved`: `Quitado de favoritos ✅`.
- Error genérico no-auth: `common.genericError` → `Ocurrió un error. Intenta de nuevo.`
- Error auth: `auth.genericError` → `Revisa tus datos e intenta de nuevo.`
- Validación publicar: `promptBuilder.publishBlockedTitle` + `promptBuilder.publishBlockedText`.
- Validación exportar vacío: `promptBuilder.exportEmpty`.

## Implementación aplicada
- Migración de defaults hardcodeados a i18n:
  - `promptBuilder.antiHallucinationDefault`
  - `agentBuilder.defaultPolicies`
  - `auth.emailPlaceholder`
  - `auth.passwordPlaceholder`
- Tooltips añadidos/normalizados:
  - `promptBuilder.antiHallucinationTooltip`
  - `common.whatIsThis` en trigger de `StepHelp`
- Errores backend/validación normalizados para ES:
  - reemplazo de mensajes raw (`error.message` / mensajes Zod) por claves localizadas cuando aplica.

## Checklist QA de copy (ES)
Rutas a revisar:
- `/`
- `/builders`
- `/structures`
- `/gallery`
- `/prompt-builder`
- `/skill-builder`
- `/agent-builder`
- `/auth`

Validaciones:
- No mezcla ES/EN en texto UI cuando `NEXT_LOCALE=es`.
- Pluralización correcta en `pasos`, `herramientas`, `skills`, tiempo relativo.
- CTAs consistentes en infinitivo.
- Mensajes de validación claros y accionables.
- Toasts de copiar, guardar, exportar, publicar y favoritos.
- Tooltips visibles para términos técnicos.
