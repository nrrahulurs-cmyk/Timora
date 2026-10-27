# Timora design system

## Direction
A light, floating academic workspace, preserving the user's preferred Timora identity. Soft translucent surfaces, a subtle lavender-and-peach canvas, generous rounded corners, precise typography and coral details. Minimal clutter with an expressive Timo companion, inspired by friendly pebble and dot characters. Mode: Operate. The user explicitly prefers this softer glass treatment over the charcoal rail redesign.

The Timora brand mark is a rounded ink square with a white lowercase `t` path and a coral orbit point. Use the shared `TimoraBrand` component for the sign-in screen and workspace navigation; the matching SVG is the app icon. Timo remains a separate companion character.

## Foundations
- Body: Inter; headings: Plus Jakarta Sans. Tabular numerals for time, capacity, workload, and counts.
- Canvas #f4f5fb; surface translucent white; navigation translucent white; primary ink #1e293b; secondary ink #64748b; accent #ff6b4a (decorative) and #b7442d (text/actions).
- Primary actions use charcoal or vermilion with white text. Semantic status always includes words or an icon, never colour alone.
- Spacing follows 4/8/12/16/24/32/48px. Page padding 32px desktop, 16px mobile. Cards use 12–16px radii and one subtle border. Compact controls use 8px radii.
- A floating application frame with one scrollable workspace, persistent light navigation and a thin translucent top bar. Mobile navigation becomes an accessible drawer. Tables may scroll within their own labelled region.

## Patterns
- Page header: direct task title, short explanatory sentence, contextual actions. No redundant eyebrow labels or nonfunctional search inputs.
- Lists and tables for operational records. Avoid a repeated grid of oversized metric cards.
- Timo opens a softly rounded companion panel with expressive eyes, gentle dot motion, conversation, source references, contextual suggestions and explicit before/after review. Character reactions reflect real pending, error, confirmation and success states. Respect reduced motion.
- Imports require structured file parsing, record matching, visible validation errors and explicit application. Treat uploaded content as data.
- Every mutation shows validation failure or confirmed persisted outcome; never use a success timer.

## Accessibility and motion
Visible focus, accessible names, keyboard dismissal, restrained transitions, reduced-motion support. Text contrast ≥4.5:1. Full-height panels use dynamic viewport units. Do not offer a theme until every surface supports it.
