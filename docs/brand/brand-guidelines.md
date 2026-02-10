# prompteero Brand Guidelines v1.0

## Brand Essence
prompteero converts ideas into clear, actionable prompts.
Personality: direct, useful, didactic, friendly "For Dummies" style.
Promise: "Te lo dejo listo para usar".

## Logo System
Available versions in this repo:
- `prompteero-logo-primary.png` (full lockup)
- `prompteero-icon.png` (icon only)
- `prompteero-logo-mono-dark.png`
- `prompteero-logo-mono-light.png`

Usage rules:
- Clear space: at least 1x the equivalent "P" cap-height around the logo.
- Minimum digital sizes:
  - Full logo: `>= 140px` width
  - Icon: `>= 24px` (ideal `32px`)
- Do not stretch, rotate, recolor, add heavy shadows, or rearrange mark elements.

## Color Palette
| Token | Hex | Usage |
|---|---|---|
| prompteero Blue | `#1660A1` | Primary CTAs, links, focus color |
| prompteero Orange | `#EA7018` | Accent badges, highlights, emphasis |
| Dark | `#3A3A3A` | Main body text |
| Mid | `#474746` | Secondary text |
| Light | `#E6E6E6` | Borders and subtle backgrounds |
| White | `#FFFFFF` | Surfaces and cards |

## Typography
Recommended:
- Primary UI/Text: Inter (400/500/600)
- Headlines: Sora or Montserrat (600/700)
Fallback stack:
`system-ui, Segoe UI, Roboto, Helvetica, Arial`

## "For Dummies" Visual Direction
- Rounded simple icons with low detail
- Light cards, subtle shadows, clear spacing
- Short copy with steps/examples
- Avoid dense interfaces and jargon-heavy wording

## Asset Naming and Location
All brand assets live in:
- `/Users/MacBook/Develop/propmpt-studio/public/brand`

Files:
- `prompteero-logo-primary.png`
- `prompteero-icon.png`
- `prompteero-logo-mono-dark.png`
- `prompteero-logo-mono-light.png`
- `favicon-16.png`
- `favicon-32.png`
- `apple-touch-icon.png`
- `android-chrome-192.png`
- `android-chrome-512.png`

## Publishing Checklist
- [ ] Logo appears correctly in header and landing
- [ ] Small screens use icon-only if needed
- [ ] Primary actions use prompteero Blue
- [ ] Orange only used as accent
- [ ] Text uses dark/mid neutrals
- [ ] Brand assets paths are stable
- [ ] Favicons and manifest icons are wired

## CSS Tokens
```css
:root{
  --prompteero-blue: #1660A1;
  --prompteero-orange: #EA7018;
  --prompteero-dark: #3A3A3A;
  --prompteero-mid: #474746;
  --prompteero-light: #E6E6E6;
  --prompteero-white: #FFFFFF;
}
```
