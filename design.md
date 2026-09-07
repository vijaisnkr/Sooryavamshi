# Mobile Design Specification: Sooryavamshi Solar Projects

This document details the mobile design architecture, responsive layout rules, UI components, touch interaction specifications, and visual design tokens for the mobile version of **Sooryavamshi Solar Projects LLP**.

---

## 📱 1. Mobile Design Philosophy & Core Principles

1. **Mobile-First Ergonomics**: Every component is designed to be fully navigable with one hand, prioritizing touch targets of at least **44px × 44px**.
2. **High-Conversion Frictionless UX**: Key actions (Solar Calculator, Direct Call, KSEB Grid Feasibility, Free Site Audit) remain easily accessible regardless of scroll position.
3. **Preventing iOS Input Auto-Zoom**: All text inputs use a minimum `font-size: 16px` (`1rem`) to prevent iOS Safari from automatically zooming into the page during input focus.
4. **Zero Horizontal Overflow**: `max-width: 100vw; overflow-x: hidden;` is strictly enforced across `html`, `body`, and all containers to ensure a smooth scrolling experience.
5. **Performance & Lightweight Assets**: Pure Vanilla CSS3 and ES6 JavaScript with zero heavy framework overhead, ensuring sub-second load times on mobile 4G/5G networks across India.

---

## 📐 2. Responsive Breakpoint Matrix

| Breakpoint | Target Devices | Key Layout Adaptations |
| :--- | :--- | :--- |
| **`> 1240px`** | Full Desktop | Full 7-link nav menu, multi-column grids, inline floating cards. |
| **`992px – 1240px`** | Compact Desktops / iPad Pro | Grid columns scale down; Process grid converts to 4-column layout. |
| **`768px – 992px`** | Tablets / iPads | Desktop nav hides & **Mobile Drawer Toggle** activates; 1-column hero & calculator. |
| **`< 768px`** | Mobile Phones & Small Tablets | **Sticky Bottom CTA Bar** activates; container padding set to `16px`; 1-column card grids. |
| **`< 480px`** | Small Mobile Phones | Hero headline scales to `1.75rem`; CTA buttons stack vertically; trust badges form 1-column. |

---

## 🎨 3. Design System & Visual Tokens

### Color Tokens
- **Primary Navy**: `#073B6B` (Headers, structural badges, brand identity)
- **Energy Navy**: `#0B2D53` (Dark section backgrounds, footer)
- **Solar Gold Accent**: `#F58220` & `#FDBA2D` (Primary CTAs, highlighted text, capacity badges)
- **Electric Green**: `#22C55E` / `#008000` (Savings values, live indicator, positive metrics)
- **Background Light**: `#FFF8F4` (Warm sand container fill) & `#F9FAFB` (Soft gray surfaces)
- **Border Medium**: `rgba(7, 59, 107, 0.15)`

### Mobile Typography Scale
- **Hero Title**: `2.0rem` / `line-height: 1.22` (bold Hanken Grotesk)
- **Section Titles**: `1.75rem` / `line-height: 1.25`
- **Subtitles & Lead Text**: `0.92rem` – `1.0rem` / `line-height: 1.55` (Inter)
- **Technical Metrics**: `1.35rem` – `1.75rem` (JetBrains Mono / Hanken Grotesk)
- **Section Tags**: `0.72rem` (Uppercase, `letter-spacing: 0.08em`)

---

## 🛠️ 4. Mobile Component Architecture

### A. Sticky Header & Slide-Out Navigation Drawer
- **Header Height**: `68px` on mobile (vs `80px` on desktop).
- **Scrolled State**: Adds a subtle drop shadow (`0 4px 20px rgba(0,0,0,0.12)`) and translucent backdrop blur.
- **Mobile Drawer (`.mobile-nav-drawer`)**:
  - Off-canvas drawer sliding in from the right (`transform: translateX(100%)`).
  - Darkened backdrop overlay (`.mobile-nav-backdrop`) with `backdrop-filter: blur(4px)`.
  - Displays full page section links with chevron icons, direct phone helpline, official email, physical address, and instant WhatsApp/Instagram/Facebook icons.

### B. Sticky Mobile Bottom Conversion Bar (`.mobile-sticky-bar`)
- **Fixed Position**: Sticks to screen bottom (`position: fixed; bottom: 0; z-index: 99`).
- **Layout**: 2 equal-width action buttons:
  1. `⚡ Calculate Solar` (Primary Gold Button &rarr; scrolls smoothly to `#calculator`)
  2. `📞 Call: 9061626868` (Deep Navy Button &rarr; opens native phone dialer)
- **Body Offset**: `body { padding-bottom: 64px; }` prevents content occlusion at the bottom of the page.

### C. Mobile Solar Requirement Calculator (`#calculator`)
- **Single-Column Stacking**: Input pane (left) stacks cleanly above Live Results pane (right).
- **Touch-Friendly Controls**:
  - Quick preset pills row (`150 Units`, `300 Units`, `400 Units`, `600 Units`, `1000 Units`) with horizontal touch scrolling.
  - Large Range Slider (`#calcUnitsSlider`) with `48px` touch height.
- **Hero Capacity Badge**: Circular SVG progress gauge centered with live recommended kW capacity.
- **6-Card Metrics Grid**: Converts from 2-column or 3-column into a clean 2x3 or 1-column mobile grid.

### D. Reordered Section Sequence (Optimized Conversion Flow)
1. **Hero Section** (`#home`)
2. **Solar Calculator** (`#calculator`) — *"How Much Solar Power Does Your Home Need?"*
3. **Contact & Site Assessment** (`#contact`) — *"Ready to Switch Your Home to Solar?"*
4. **KSEB Grid Feasibility Portal** (`#feasibility`) — Official reCap portal instructions.
5. **Equipment Showcase** (`#equipment`) — Tier-1 panel, inverter, and chemical earthing blueprints.
6. **Installation Timeline** (`#process`) — 7-stage step cards.
7. **Projects Portfolio** (`#projects`) — Filterable project cards & statistics.
8. **About Us** (`#about`) — Engineering credentials.

---

## ♿ 5. Accessibility & Touch Standards

- **Touch Targets**: Minimum size of `44px` height/width on all mobile buttons, slider thumbs, drawer links, and select dropdowns.
- **Semantic HTML5**: Native `<header>`, `<nav>`, `<aside>`, `<main>`, `<section>`, `<article>`, and `<footer>` elements.
- **ARIA Attributes**: `aria-expanded` toggles for mobile menu & technical accordions; `aria-label` on graphic buttons.
- **Contrast Ratios**: Minimum contrast ratio of 4.5:1 for body text and 3:1 for large section headings.
