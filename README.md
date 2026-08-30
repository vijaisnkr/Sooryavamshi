# Sooryavamshi Solar Projects LLP - Official Website

A modern, high-performance, responsive web application for **Sooryavamshi Solar Projects LLP**, an engineering-driven residential solar EPC installer based in Kerala, India.

---

## 🌟 Key Features

- **Interactive Solar Requirement Calculator**:
  - Live estimation based on monthly consumption (kWh) or monthly electricity bill (₹).
  - Calculates recommended system capacity (kW), required Tier-1 solar modules (550W), roof footprint (sq.ft / m²), annual generation, and estimated electricity bill savings.
  - Computes Central Government Subsidy under the **PM Surya Ghar: Muft Bijli Yojana** (up to ₹78,000).

- **Official KSEB Grid Feasibility & reCap Portal Guide**:
  - Step-by-step instructions on locating Consumer Number & Electrical Section on low-tension (LT) bills.
  - Direct gateway integration with KSEB's official renewable capacity tracker ([reCap Portal](https://wss.kseb.in/selfservices/reCap)).
  - Explains DTR headroom limits (KSERC 90% rule) and workarounds (augmentation, zero-export limitation, feeder transfers).

- **Tier-1 Equipment Showcase**:
  - Technical specifications for Mono-PERC / TOPCon bifacial solar modules, grid-tied smart string inverters, anodized aluminium HDG mounting structures, and lightning/surge protection.

- **Project Portfolio Showcase**:
  - Categorized gallery (Residential On-Grid, Hybrid Battery Backup, Commercial Solar) with detailed installation specs.

- **Conversion-Optimized Contact & Site Audit Forms**:
  - Direct telephone, WhatsApp, and email integration.
  - Interactive site visit assessment enquiry form.

---

## 🛠️ Technology Stack

- **Markup**: Semantic HTML5 (SEO and accessibility compliant)
- **Styling**: Modular Vanilla CSS3 (Custom Design System tokens, Glassmorphism, Micro-animations)
- **Logic**: Modular Vanilla JavaScript (ES6+), zero external runtime or framework overhead
- **Icons**: Clean inline SVG vectors

---

## 📂 Project Structure

```
Sooryavamshi/
├── index.html              # Main landing page & application entrypoint
├── css/
│   ├── variables.css       # Design tokens (colors, gradients, typography, shadows)
│   ├── main.css            # Global base styles, reset, layout scaffolding
│   ├── components.css      # Reusable UI components, cards, buttons, badges
│   ├── calculator.css      # Dedicated interactive solar calculator styles
│   ├── feasibility.css     # KSEB reCap portal guide & timeline styles
│   └── responsive.css      # Responsive media queries (desktop, tablet, mobile)
├── js/
│   ├── config.js           # Master configuration (tariffs, equipment, projects, contact)
│   ├── calculator.js       # Solar sizing math, subsidy calculation, ROI engine
│   ├── feasibility.js      # Feasibility guide interactions & smooth navigation
│   ├── equipment.js        # Equipment spec tabs & data rendering
│   ├── projects.js         # Portfolio filtering & modal gallery
│   └── app.js              # Navigation drawer, sticky bar, form validation, smooth scroll
├── assets/
│   ├── images/             # Brand logos, project photos, hero imagery
│   └── icons/              # Vector icons and brand assets
├── .gitignore              # Git ignore rules for clean repository state
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Local Development

Since this project uses zero build-step Vanilla web technologies, no build tools or package managers are required.

Simply serve the folder using any static web server:

#### Option 1: Python
```bash
python -m http.server 8000
```
Open [http://localhost:8000](http://localhost:8000) in your web browser.

#### Option 2: VS Code Live Server
Right-click `index.html` and select **"Open with Live Server"**.

#### Option 3: Node.js `serve` / `npx http-server`
```bash
npx serve .
```

---

## 📞 Company Contact Details

- **Company**: Sooryavamshi Solar Projects LLP
- **Phone**: +91 90616 26868 / +91 94477 96868
- **Email**: suryavamshisolarprojects@gmail.com
- **Operating Regions**: Cherthala, Alappuzha, Kochi, Ernakulam, and across Kerala, India
