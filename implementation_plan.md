# Implementation Plan: Sooryavamshi Solar Projects LLP Website

Create a modern, premium, responsive website for **Sooryavamshi Solar Projects LLP**, a residential solar installation company in India. The design focuses on trustworthiness, technical engineering precision, clean aesthetics, and conversion optimization.

## User Review Required

> [!IMPORTANT]
> - **Primary Brand Identity**: Deep Navy Blue (`#073B6B`), Solar Orange (`#F58220`), Solar Gold (`#FDBA2D`), Eco Green (`#218739`), Clean Off-White (`#F4F8FB`), Dark Navy text (`#14213D`).
> - **Fonts**: Google Fonts `Poppins` (Headings) and `Inter` (Body).
> - **Calculator Logic**: Follows Indian standard solar insolation (~4.5 peak sun hours/day, 80-100 sq.ft per kW, 540W-550W Tier-1 Mono PERC/TOPCon panels, grid-tied inverter sizing, derating factor 0.80).
> - **Contact Details**: Phone `9061626868`, Email `suryavamshisolarprojects@gmail.com`, editable Indian office address placeholder.
> - **Zero External Framework Dependencies**: Clean, ultra-fast Semantic HTML5, Modular Vanilla CSS design tokens, and modular Vanilla JS for instant loading and zero build-step friction.

## Proposed Architecture & Structure

The project will be organized as follows:
```
c:/Vijai/Antigravity/Projects/Sooryavamshi/
├── index.html                   # Main single-page application with all sections
├── css/
│   ├── variables.css            # Design tokens (colors, gradients, typography, shadows, transitions)
│   ├── main.css                 # Base styles, layout grid, typography, resets
│   ├── components.css           # Navigation, buttons, cards, badges, modals, timeline
│   ├── calculator.css           # Dedicated rich styling for the Solar Calculator
│   └── responsive.css           # Mobile breakpoints, hamburger drawer, sticky mobile bar
├── js/
│   ├── config.js                # Editable company info, brand specs, equipment catalog, project data
│   ├── calculator.js            # Solar capacity, units, panel count, roof area, and savings calculator
│   ├── projects.js              # Project filters, modal popups, interactive image galleries
│   ├── equipment.js             # Equipment details expandable cards & spec sheets
│   └── app.js                   # Mobile menu, smooth scrolling, number counters, form submission
└── assets/
    ├── images/                  # Solar rooftop imagery & equipment visuals
    └── icons/                   # Custom solar SVGs, technical diagrams, brand marks
```

## Proposed Changes

### 1. Assets & Brand Visuals
- Create custom SVG branding for **Sooryavamshi Solar Projects LLP** featuring solar sunburst and solar-cell geometric iconography.
- Generate high-quality realistic residential rooftop solar visuals using `generate_image` for the Hero banner and Project showcases.
- Create SVG icons for solar panels, inverters, lightning arresters, earthing rods, DCDB/ACDB, and timeline stages.

### 2. Stylesheets & Design System
- [NEW] [variables.css](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/css/variables.css): Color palette, Poppins/Inter font imports, solar gradients (`linear-gradient(135deg, #073B6B, #0D5CA8)`, `linear-gradient(135deg, #F58220, #FDBA2D)`), elevation shadows, border radii.
- [NEW] [main.css](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/css/main.css): Global reset, typography hierarchy, utility classes, section containers.
- [NEW] [components.css](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/css/components.css): Sticky navbar with backdrop blur, buttons, trust badges, process timeline (7 steps), equipment cards, project cards, contact form, dark footer.
- [NEW] [calculator.css](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/css/calculator.css): Interactive slider controls, capacity gauge/progress ring, solar panel matrix visualization, result cards, and breakdown explanation.
- [NEW] [responsive.css](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/css/responsive.css): Desktop (1200px+), Tablet (768px-1024px), Mobile (<768px), mobile drawer menu, sticky mobile bottom CTA.

### 3. Core Functional Logic
- [NEW] [config.js](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/js/config.js): Centralized configuration for easy editing of company details (Phone, Email, Address), equipment brands (Adani Solar, Rayzon Solar, Waaree, Vikram Solar, Solis/Growatt inverters), project listings, and statistics.
- [NEW] [calculator.js](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/js/calculator.js):
  - Calculates daily units = monthly consumption / 30.
  - Required Solar Capacity (kW) = `Monthly Consumption / (30 * 4.2 * 0.82)`.
  - Annual Generation (kWh) = `Capacity * 4.2 * 365 * 0.82`.
  - Number of panels = `Math.ceil((Capacity * 1000) / 540)`.
  - Roof area needed = `Capacity * 85` sq. ft. (~8 sq. m / kW).
  - Estimated Monthly & Annual Savings (based on Indian slab rates ~₹7.5/kWh average).
  - Inverter sizing recommendation (e.g. 3.3kW, 5kW, 8kW, 10kW String / Hybrid).
  - Dynamic solar panel icon grid rendering.
  - "Get a Free Site Assessment" button connects directly to the contact form with pre-filled inputs.
- [NEW] [projects.js](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/js/projects.js): Filter projects by category (Residential, Commercial, Rooftop, Other), open modal with detailed project specifications and photo gallery.
- [NEW] [equipment.js](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/js/equipment.js): Expandable technical specifications for Solar Panels (Adani, Rayzon, Waaree, Vikram), Inverters, Lightning & Surge Protection, Mounting Structures, DC/AC Protection, Cables & Connectors.
- [NEW] [app.js](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/js/app.js): Sticky header observer, animated number counters on scroll, mobile hamburger menu, form submission handler with validation & confirmation message.

### 4. Main Presentation Layer
- [NEW] [index.html](file:///c:/Vijai/Antigravity/Projects/Sooryavamshi/index.html):
  - Sticky Navigation with logo, menu links, CTA button, mobile toggle.
  - Hero Section with high-impact headline, subtext, CTAs, trust badges (End-to-End Service, Quality Assurance, Advanced Technology, 30 Years Performance Warranty).
  - **Solar Requirement Calculator** card with interactive slider, quick presets (150, 300, 500, 800 units), state selector, real-time results, panel visualization, formula explanation, disclaimer, and CTA.
  - Equipment Section: Tier-1 panels, inverters, dedicated Lightning & Surge Protection card, galvanized mounting structures, DC/AC boxes, UV-grade solar cables.
  - Installation Process: 7-stage visual timeline (Consultation → Analysis → Site Assessment → Design → Installation → Commissioning → Handover).
  - Our Projects Section: Filterable gallery, project modal, statistics counter (250+ Projects, 2.8+ MW Installed, 350+ Homes, 8+ Years).
  - About Sooryavamshi: Company introduction, values, technical credentials.
  - Contact / Site Assessment: Direct phone/email links, contact form with consumption field, map section, WhatsApp floating action.
  - Dark Navy Footer: Logo, navigation links, equipment links, contact info, PM Surya Ghar Muft Bijli Yojana awareness, copyright.

## Verification Plan

### Automated / Functional Checks
- Launch local HTTP server using Python: `python -m http.server 8000`.
- Verify all assets load without 404s or console errors.
- Test calculator computation accuracy across multiple consumption levels (100 kWh to 2000 kWh).
- Verify project filters (All, Residential, Commercial, Rooftop, Other) show/hide items properly.
- Verify equipment details expand and collapse smoothly.
- Test contact form validation and pre-fill from the calculator.

### Browser Visual & Responsive Verification
- Use `browser_subagent` to open `http://localhost:8000/`.
- Verify desktop view: sticky header, hero layout, calculator interactivity, equipment cards, timeline, project modal, footer.
- Test mobile view (resizing browser or testing mobile viewport): hamburger menu drawer, touch-friendly calculator slider, sticky mobile CTA bar.
