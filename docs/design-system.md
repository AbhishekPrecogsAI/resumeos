# Design system

## Direction

Developer-focused and document-centred. The memorable element is the resume page itself,
shown with redline version annotations. Everything around it stays quiet: neutral cool
surfaces, hairline rules, one ultramarine accent.

## Tokens (`client/src/styles/index.css`)

Components use semantic names only (`bg-surface`, `text-muted`, `border-rule`, `bg-accent`…).
Values are CSS variables set on `:root` (light) and `.dark`, exposed to Tailwind through
`@theme inline` so scoped overrides work. `.theme-light` forces light tokens on "paper"
surfaces (resume previews) inside dark mode.

| Token           | Light     | Dark      | Use                                                      |
| --------------- | --------- | --------- | -------------------------------------------------------- |
| canvas          | `#fbfbfc` | `#12161c` | Page background                                          |
| surface         | `#ffffff` | `#1a1f27` | Raised panels, inputs                                    |
| sunken          | `#f1f3f6` | `#0e1116` | Recessed bands, hover fills                              |
| ink             | `#1b2430` | `#e7eaf0` | Primary text                                             |
| muted           | `#4a5565` | `#a3acba` | Secondary text                                           |
| faint           | `#5c6676` | `#8691a1` | Captions; still ≥ 4.5:1 on all fills                     |
| rule            | `#dde1e7` | `#2c333e` | Decorative borders and dividers                          |
| rule-strong     | `#858e9b` | `#69727f` | Control borders; ≥ 3:1 against backgrounds (WCAG 1.4.11) |
| accent          | `#2e3fb8` | `#9aa6ff` | Primary actions, focus ring                              |
| added / removed | green/red | green/red | Diffs; always paired with an icon/label                  |
| warn / danger   | amber/red | amber/red | Findings severity, destructive actions                   |

Theme preference (`light`, `dark`, `system`) is stored in `localStorage` under
`resumeos:theme` and applied before first paint by an inline script in `index.html`.

## Type

IBM Plex Sans for UI and IBM Plex Mono only for rule IDs and diff-like content, both
self-hosted via Fontsource. Resume templates use Source Serif 4 (Latin, Latin Extended,
Vietnamese), embedded as `@font-face` so the preview and PDF export render the same glyphs.

## Components (`client/src/components/ui`)

- `Button`, `ButtonLink`: primary, secondary, ghost, danger, link; `loading` sets `aria-busy`.
- `TextField`, `TextArea`, `SelectField`, `Checkbox`: label, hint and error wired with
  `aria-describedby` and `aria-invalid`.
- `Dialog`: native `<dialog>` (focus containment, Escape, inert background); restores focus.
- `ToastProvider` / `useToast`: polite live region for success/info, assertive for errors.
- `LoadingState`, `EmptyState`, `ErrorState`, `AccessDeniedState`, `Skeleton`, `Badge`.
- `TemplatePreview`: renders shared template HTML in a sandboxed iframe (no scripts), scaled.

## Rules

- Contrast is tested in `client/tests/contrast.test.js`: every text pairing ≥ 4.5:1 and control
  borders ≥ 3:1, in both themes.
- No colour-only meaning: diffs and severities always carry a text label or icon.
- Visible `:focus-visible` outline everywhere; skip link is the first tab stop.
- Motion is limited to state changes and is disabled under `prefers-reduced-motion`.
- Never `dangerouslySetInnerHTML` (enforced by ESLint `react/no-danger`).
- Sample content is always labelled as sample.
