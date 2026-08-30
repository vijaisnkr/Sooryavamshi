/**
 * Sooryavamshi Solar Projects LLP - Central Configuration
 * All company details, product catalogues, project showcases, and calculation constants
 * are structured here for clean maintenance and instant updates.
 */

const SOORYAVAMSHI_CONFIG = {
  company: {
    legalName: "Sooryavamshi Solar Projects LLP",
    shortName: "Sooryavamshi Solar",
    tagline: "Power Your Home With Clean, Reliable Solar Energy",
    subTagline: "Trusted Residential & Commercial Solar Engineering in India",
    phone: "9061626868",
    displayPhone: "+91 9061626868",
    email: "suryavamshisolarprojects@gmail.com",
    address: "Cherthala, Alappuzha, Kerala",
    operatingHours: "Monday – Saturday: 9:00 AM – 7:30 PM",
    establishedYear: 2018,
    gstin: "32AALFS1234F1Z5 (Kerala Registered LLP)",
    pmSuryaGharSupported: true
  },

  // Key performance statistics (Editable placeholder values as requested)
  stats: [
    { id: "projects", value: 250, suffix: "+", label: "Projects Completed", note: "Residential & Commercial" },
    { id: "capacity", value: 2.8, suffix: " MW+", label: "Solar Capacity Installed", note: "Clean generation" },
    { id: "homes", value: 350, suffix: "+", label: "Homes & Roofs Powered", note: "Across Kerala & South India" },
    { id: "experience", value: 8, suffix: "+ Years", label: "Engineering Experience", note: "Certified solar technicians" }
  ],

  // Solar Calculator baseline engineering parameters
  calculator: {
    baseDailySunHours: 4.3, // Average Indian peak sun hours (kWh/m2/day)
    systemPerformanceRatio: 0.82, // Standard derating factor accounting for temperature & dust
    standardPanelWattage: 550, // Modern Tier-1 Mono PERC / Bi-facial panel wattage
    spaceRequiredPerKwSqFt: 85, // Standard shadow-free rooftop requirement in sq.ft
    averageTariffPerUnitInr: 7.2, // KSEB residential slab average (Rs/kWh)
    co2OffsetPerKwhKg: 0.82, // Average grid carbon intensity reduction (kg CO2 per kWh)
    
    // Regional insolation adjustment factors
    states: [
      { name: "Kerala", factor: 1.00, defaultTariff: 7.2 },
      { name: "Karnataka", factor: 1.02, defaultTariff: 7.8 },
      { name: "Tamil Nadu", factor: 1.04, defaultTariff: 7.6 },
      { name: "Maharashtra", factor: 1.03, defaultTariff: 8.5 },
      { name: "Telangana", factor: 1.03, defaultTariff: 7.9 },
      { name: "Andhra Pradesh", factor: 1.04, defaultTariff: 7.7 },
      { name: "Gujarat", factor: 1.08, defaultTariff: 6.9 },
      { name: "Rajasthan", factor: 1.12, defaultTariff: 7.4 },
      { name: "Delhi NCR", factor: 0.98, defaultTariff: 8.0 },
      { name: "Other States", factor: 1.00, defaultTariff: 7.5 }
    ]
  },

  // Products & Equipment data
  equipment: {
    panels: {
      title: "Solar Panels (Tier-1 Modules)",
      category: "Photovoltaic Modules",
      brands: ["Adani Solar", "Rayzon Solar", "Waaree", "Vikram Solar"],
      techType: "Mono PERC / N-Type TOPCon Bifacial Glass-to-Glass",
      wattageRange: "550 Wp – 590 Wp",
      efficiency: "Up to 22.8% Cell Efficiency",
      warranty: "12-15 Years Product Warranty | 30 Years Linear Power Output Warranty",
      keyBenefits: [
        "Superior low-light generation on cloudy/monsoon days",
        "Bifacial gain generates up to 15-25% extra energy from rear roof reflections",
        "PID (Potential Induced Degradation) resistant & anti-reflective tempered glass",
        "Certified wind load up to 2400 Pa and snow load up to 5400 Pa"
      ],
      description: "We install exclusively Tier-1 BIS-certified solar panels from India's most reputed manufacturers. Each module undergoes rigorous EL flash testing to prevent micro-cracks and maximize generation over 30+ years."
    },

    inverters: {
      title: "Solar Inverters (On-Grid & Hybrid)",
      category: "Power Conversion",
      brands: ["Solis", "Growatt", "Sungrow", "Enphase Microinverters"],
      capacityRange: "3 kW to 25 kW (Single-Phase & Three-Phase)",
      efficiency: "98.4% Maximum Conversion Efficiency",
      warranty: "5 to 10 Years Manufacturer Warranty (Extendable to 15 Years)",
      monitoring: "Integrated Wi-Fi / 4G Cloud Telemetry with Mobile App",
      keyBenefits: [
        "Dual MPPT (Maximum Power Point Tracking) for multi-angle roof orientations",
        "IP65 / IP66 rated waterproof and dust-tight aluminum enclosure",
        "Zero export & net metering compliance with local state DISCOMs",
        "Instant smartphone alerts for daily generation, voltage, and grid status"
      ],
      description: "Our inverters represent the brain of your solar power plant. Designed with active cooling, surge tolerance, and high MPPT accuracy, they transform DC sun energy into clean, stabilized AC electricity for your home."
    },

    lightningProtection: {
      title: "Lightning & Surge Protection System",
      category: "System Safety & Grounding",
      type: "Early Streamer Emission (ESE) / Franklin Rod & Dual Type 1+2 SPDs",
      components: [
        "Copper-bonded Chemical Earthing Rods (minimum 3 separate earth pits)",
        "Class B+C / Type 1+2 Surge Protection Devices (SPD) inside DCDB & ACDB",
        "High-grade bentonite / chemical compound backfill for < 5 Ohm earth resistance",
        "Solid copper grounding tape & insulated earth cables"
      ],
      keyBenefits: [
        "Protects expensive inverters and household appliances from indirect voltage surges",
        "Safeguards home rooftop structure against direct cloud-to-ground lightning strikes",
        "Dedicated segregated earthing for Inverter, Solar PV array, and Lightning arrester",
        "Meets IEC 62305 & Indian Electricity Rules compliance standards"
      ],
      description: "Solar plants sit elevated on roofs and are naturally vulnerable to lightning and power transients. Sooryavamshi engineers a comprehensive 3-pit grounding network with surge suppression devices to keep your entire home and equipment completely safe."
    },

    mountingStructure: {
      title: "Engineered Mounting Structures",
      category: "Mechanical Foundation",
      material: "Hot-Dip Galvanized Iron (HDGI > 80 Microns) & Anodized Aluminum 6063-T6",
      windResistance: "Engineered to withstand up to 150 km/h wind gusts",
      roofCompatibility: "RCC Flat Terrace, Tiled Slanted Roofs, Elevated Terrace Pergolas, Metal Sheds",
      warranty: "25 Years Structural Durability & Anti-Corrosion Guarantee",
      keyBenefits: [
        "Pre-engineered modular design with no welding on roof terrace to prevent rusting",
        "EPDM chemical water-proofing and non-penetrative mounting options available",
        "Optimized tilt angle (10° to 18°) tuned to your exact latitude for peak annual yield",
        "Elevated pergola designs preserve usable rooftop terrace space for family use"
      ],
      description: "A solar system is only as strong as its foundation. We utilize heavy-gauge hot-dip galvanized steel and high-tensile SS304 fasteners built to endure decades of extreme tropical monsoon and sun exposure."
    },

    dcAcProtection: {
      title: "DCDB & ACDB Protection Units",
      category: "Electrical Distribution",
      specs: "IP65 Weatherproof Polycarbonate Enclosures",
      components: [
        "DC Disconnect Isolators & DC Fuses (1000V DC rated)",
        "AC Miniature Circuit Breakers (MCB) & Molded Case Circuit Breakers (MCCB)",
        "Over-voltage & Under-voltage trip relays",
        "Visible rotary lockable AC isolator for DISCOM net meter safety"
      ],
      keyBenefits: [
        "Instant mechanical isolation for periodic maintenance and safety",
        "Protects against reverse polarity, short circuits, and ground faults",
        "Compliant with CEA (Central Electricity Authority) technical standards"
      ],
      description: "Dedicated distribution boxes house industrial-grade switchgear from brands like Schneider, Havells, and Hensel, providing fail-safe protection on both direct current and alternating current sides."
    },

    cablesComponents: {
      title: "UV Solar Cables & Precision Hardware",
      category: "Wiring & Interconnects",
      cableSpecs: "4 sq. mm / 6 sq. mm Tinned Electrolytic Copper, Electron-beam Cross-linked XLPO",
      connectors: "Original Stäubli MC4 IP68 Connectors",
      conduits: "Heavy-duty UV-stabilized PVC / GI Flexible Conduits with brass glands",
      keyBenefits: [
        "Flame retardant, halogen-free, and ozone/UV weather-proof for 25+ years",
        "Minimal resistance ensures voltage drop remains strictly under 1.5%",
        "IP68 sealed click-lock connectors eliminate moisture ingress and arcing risks"
      ],
      description: "We never compromise on wiring. Every single meter of cable is UV-resistant, fire-retardant, and routed through industrial conduits with proper cable ties and tagging."
    }
  },

  // Completed & ongoing project portfolio
  projects: [
    {
      id: "proj-1",
      title: "5 kW On-Grid Elevated Rooftop Plant",
      category: "residential",
      badge: "Residential Villa",
      location: "Indiranagar, Bengaluru, Karnataka",
      capacity: "5.4 kWp",
      panels: "10x 540W Mono PERC Bifacial (Adani Solar)",
      inverter: "5 kW Solis Dual-MPPT On-Grid Inverter",
      annualGeneration: "7,800 Units/year",
      savings: "₹60,000+ Annual Savings",
      image: "assets/images/project-villa.jpg",
      description: "Installed on an elevated heavy-duty galvanized pergola structure, allowing the homeowner to utilize 100% of their rooftop terrace garden while offsetting 95% of their electricity bill.",
      features: ["Elevated Pergola Mount", "PM Surya Ghar Net Metering", "Zero Terrace Space Loss", "Live Mobile Telemetry"]
    },
    {
      id: "proj-2",
      title: "8 kW Hybrid Residential Solar System",
      category: "residential",
      badge: "Independent Home",
      location: "Banjara Hills, Hyderabad, Telangana",
      capacity: "8.1 kWp",
      panels: "15x 540W TOPCon Modules (Waaree)",
      inverter: "8 kW Growatt Hybrid Inverter with LiFePO4 Battery Storage",
      annualGeneration: "11,800 Units/year",
      savings: "₹92,000+ Annual Savings",
      image: "assets/images/project-urban.jpg",
      description: "Custom hybrid rooftop solar installation with high-efficiency battery backup ensuring 24/7 continuous green power for air conditioning, water pumps, and home appliances during grid outages.",
      features: ["Hybrid Lithium Storage", "Automatic Grid Transfer", "Lightning Arrester Network", "Flush Terrace Mount"]
    },
    {
      id: "proj-3",
      title: "3 kW Affordable Rooftop Solar Project",
      category: "rooftop",
      badge: "Urban Rooftop",
      location: "Kakkanad, Kochi, Kerala",
      capacity: "3.24 kWp",
      panels: "6x 540W High Efficiency (Rayzon Solar)",
      inverter: "3.3 kW Single Phase String Inverter",
      annualGeneration: "4,600 Units/year",
      savings: "₹34,000+ Annual Savings",
      image: "assets/images/hero.jpg",
      description: "Compact, high-density residential installation designed for optimal ROI under the PM Surya Ghar Muft Bijli Yojana, yielding a payback period under 3.2 years.",
      features: ["Subsidized Scheme Approval", "Fast 48-Hour Installation", "Dual Pit Earthing", "Bi-directional Net Meter"]
    },
    {
      id: "proj-4",
      title: "25 kW Commercial Campus Solar Plant",
      category: "commercial",
      badge: "Institutional Campus",
      location: "Whitefield, Bengaluru, Karnataka",
      capacity: "25 kWp",
      panels: "46x 545W Vikram Solar Tier-1",
      inverter: "25 kW Sungrow Three-Phase Commercial Inverter",
      annualGeneration: "36,500 Units/year",
      savings: "₹2,80,000+ Annual Savings",
      image: "assets/images/project-commercial.jpg",
      description: "Commercial institutional rooftop solar installation powering laboratories and administrative facilities with high-voltage AC/DC protection and remote industrial monitoring.",
      features: ["Three-Phase Synchronous Feed", "Commercial Net Metering", "Class-1 SPD & ESE Arrester", "Accelerated Depreciation Benefit"]
    },
    {
      id: "proj-5",
      title: "10 kW Luxury Villa Solar Microgrid",
      category: "rooftop",
      badge: "Luxury Estate",
      location: "ECR, Chennai, Tamil Nadu",
      capacity: "10.8 kWp",
      panels: "20x 540W Adani Solar Bifacial",
      inverter: "10 kW Solis Three-Phase Grid-Tied",
      annualGeneration: "16,200 Units/year",
      savings: "₹1,25,000+ Annual Savings",
      image: "assets/images/project-villa.jpg",
      description: "Coastal corrosion-resistant solar installation featuring anodized aluminum fixtures and marine-grade SS316 fasteners suited for high-humidity coastal environments.",
      features: ["Coastal Grade Anti-Corrosion", "Walkway & Safety Line", "Bifacial Reflective Coating", "Real-Time Yield Dashboard"]
    },
    {
      id: "proj-6",
      title: "15 kW Multi-Dwelling Apartment Rooftop",
      category: "other",
      badge: "Apartment Society",
      location: "Kothrud, Pune, Maharashtra",
      capacity: "15 kWp",
      panels: "28x 540W Waaree Solar",
      inverter: "15 kW Three-Phase Inverter",
      annualGeneration: "22,500 Units/year",
      savings: "₹1,90,000+ Annual Savings",
      image: "assets/images/project-urban.jpg",
      description: "Common-area solar supply powering lifts, water pumps, clubhouse, and society corridor lighting, slashing society maintenance charges by over 70%.",
      features: ["Common Area Utility Offset", "Society Body Approval Handled", "Dual ACDB Protection", "Dedicated Sub-metering"]
    }
  ],

  // 7-step engineering installation process
  processSteps: [
    {
      step: "01",
      title: "Initial Consultation",
      duration: "Day 1",
      summary: "We discuss your energy requirements, current electricity bills, and primary goals (bill reduction, battery backup, or green energy).",
      icon: "message-circle"
    },
    {
      step: "02",
      title: "Consumption Analysis",
      duration: "Day 1–2",
      summary: "Detailed audit of your past 12-month DISCOM bills, connected load, sanctioned load, and peak hourly power usage profiles.",
      icon: "activity"
    },
    {
      step: "03",
      title: "Site Assessment & Shadow Audit",
      duration: "Day 2–3",
      summary: "Physical roof inspection with 3D shadow analysis, structural integrity check, azimuth angle measurement, and cable routing plan.",
      icon: "compass"
    },
    {
      step: "04",
      title: "System Engineering & Design",
      duration: "Day 3–4",
      summary: "CAD layout drafting, string voltage calculations, single-line diagram (SLD), DISCOM net-metering feasibility, and equipment selection.",
      icon: "sliders"
    },
    {
      step: "05",
      title: "Precision Installation",
      duration: "Day 5–7",
      summary: "Mounting structure erection, solar panel alignment, inverter mounting, 3-pit chemical earthing, and neat conduit wiring by certified technicians.",
      icon: "tool"
    },
    {
      step: "06",
      title: "Testing & Commissioning",
      duration: "Day 8–10",
      summary: "Megger insulation tests, earth resistance check (< 5 Ohm), open-circuit voltage tests, DISCOM net meter inspection, and grid sync.",
      icon: "check-circle"
    },
    {
      step: "07",
      title: "Handover & Lifetime Support",
      duration: "Ongoing",
      summary: "Mobile monitoring app setup on your phone, handover of warranty cards, safety briefing, and lifetime generation monitoring support.",
      icon: "shield"
    }
  ],

  // Solar Feasibility Checker engineering & grid parameters
  feasibility: {
    disclaimerText: "Final feasibility and grid approval are subject to site inspection and approval from the concerned electricity distribution company (DISCOM).",
    
    // State to DISCOM mapping with technical parameters
    discomsByState: {
      "Kerala": [
        { id: "KSEBL", name: "KSEBL (Kerala State Electricity Board Ltd)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "PM Surya Ghar / e-Kiran", netMetering: "Bi-directional Net Metering eligible" }
      ],
      "Karnataka": [
        { id: "BESCOM", name: "BESCOM (Bangalore Electricity Supply Company)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "PM Surya Ghar / BESCOM Solar", netMetering: "KERC Net Metering eligible" },
        { id: "MESCOM", name: "MESCOM (Mangalore Electricity Supply Company)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "MESCOM Solar Portal", netMetering: "KERC Net Metering eligible" },
        { id: "HESCOM", name: "HESCOM (Hubli Electricity Supply Company)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "HESCOM Solar Portal", netMetering: "KERC Net Metering eligible" },
        { id: "GESCOM", name: "GESCOM (Gulbarga Electricity Supply Company)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "GESCOM Solar Portal", netMetering: "KERC Net Metering eligible" },
        { id: "CESC", name: "CESC (Chamundeshwari Electricity Supply Corp)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "CESC Mysore Portal", netMetering: "KERC Net Metering eligible" }
      ],
      "Tamil Nadu": [
        { id: "TANGEDCO", name: "TANGEDCO (Tamil Nadu Generation & Distribution Corp)", phaseRule: "1-Phase up to 4 kW, 3-Phase > 4 kW", dtLimit: "Up to 90% of DT capacity", portal: "TANGEDCO LT Solar", netMetering: "TNERC Net Feed-in / Net Metering" }
      ],
      "Telangana": [
        { id: "TSSPDCL", name: "TSSPDCL (Southern Power Distribution Co. of Telangana)", phaseRule: "1-Phase up to 3 kW, 3-Phase > 3 kW", dtLimit: "Up to 80% of DT capacity", portal: "TSSPDCL Rooftop Solar", netMetering: "TSERC Net Metering eligible" },
        { id: "TSNPDCL", name: "TSNPDCL (Northern Power Distribution Co. of Telangana)", phaseRule: "1-Phase up to 3 kW, 3-Phase > 3 kW", dtLimit: "Up to 80% of DT capacity", portal: "TSNPDCL Solar Portal", netMetering: "TSERC Net Metering eligible" }
      ],
      "Andhra Pradesh": [
        { id: "APEPDCL", name: "APEPDCL (Eastern Power Distribution Co. of AP)", phaseRule: "1-Phase up to 3 kW, 3-Phase > 3 kW", dtLimit: "Up to 80% of DT capacity", portal: "APEPDCL Solar Portal", netMetering: "APERC Net Metering eligible" },
        { id: "APCPDCL", name: "APCPDCL (Central Power Distribution Co. of AP)", phaseRule: "1-Phase up to 3 kW, 3-Phase > 3 kW", dtLimit: "Up to 80% of DT capacity", portal: "APCPDCL Solar Portal", netMetering: "APERC Net Metering eligible" },
        { id: "APSPDCL", name: "APSPDCL (Southern Power Distribution Co. of AP)", phaseRule: "1-Phase up to 3 kW, 3-Phase > 3 kW", dtLimit: "Up to 80% of DT capacity", portal: "APSPDCL Solar Portal", netMetering: "APERC Net Metering eligible" }
      ],
      "Maharashtra": [
        { id: "MSEDCL", name: "MSEDCL (Mahavitaran)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 70% of DT capacity", portal: "MSEDCL RE Portal", netMetering: "MERC Net Metering eligible" },
        { id: "TATA_MUM", name: "Tata Power (Mumbai Distribution)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "Tata Power Solar", netMetering: "MERC Net Metering eligible" },
        { id: "ADANI_MUM", name: "Adani Electricity (Mumbai)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "AEML Green Power", netMetering: "MERC Net Metering eligible" }
      ],
      "Gujarat": [
        { id: "UGVCL", name: "UGVCL (Uttar Gujarat Vij Company)", phaseRule: "1-Phase up to 6 kW, 3-Phase > 6 kW", dtLimit: "Up to 100% of DT capacity", portal: "Surya Gujarat Portal", netMetering: "GERC Solar Policy Net Metering" },
        { id: "DGVCL", name: "DGVCL (Dakshin Gujarat Vij Company)", phaseRule: "1-Phase up to 6 kW, 3-Phase > 6 kW", dtLimit: "Up to 100% of DT capacity", portal: "Surya Gujarat Portal", netMetering: "GERC Solar Policy Net Metering" },
        { id: "MGVCL", name: "MGVCL (Madhya Gujarat Vij Company)", phaseRule: "1-Phase up to 6 kW, 3-Phase > 6 kW", dtLimit: "Up to 100% of DT capacity", portal: "Surya Gujarat Portal", netMetering: "GERC Solar Policy Net Metering" },
        { id: "PGVCL", name: "PGVCL (Paschim Gujarat Vij Company)", phaseRule: "1-Phase up to 6 kW, 3-Phase > 6 kW", dtLimit: "Up to 100% of DT capacity", portal: "Surya Gujarat Portal", netMetering: "GERC Solar Policy Net Metering" },
        { id: "TORRENT", name: "Torrent Power (Ahmedabad/Surat)", phaseRule: "1-Phase up to 6 kW, 3-Phase > 6 kW", dtLimit: "Up to 80% of DT capacity", portal: "Torrent Solar Portal", netMetering: "GERC Net Metering eligible" }
      ],
      "Rajasthan": [
        { id: "JVVNL", name: "JVVNL (Jaipur Vidyut Vitran Nigam)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "Rajasthan Solar Portal", netMetering: "RERC Net Metering eligible" },
        { id: "AVVNL", name: "AVVNL (Ajmer Vidyut Vitran Nigam)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "Rajasthan Solar Portal", netMetering: "RERC Net Metering eligible" },
        { id: "JDVVNL", name: "JdVVNL (Jodhpur Vidyut Vitran Nigam)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 80% of DT capacity", portal: "Rajasthan Solar Portal", netMetering: "RERC Net Metering eligible" }
      ],
      "Delhi NCR": [
        { id: "BRPL", name: "BSES Rajdhani Power Ltd (BRPL)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 100% of DT capacity", portal: "BSES Solar City", netMetering: "DERC Virtual / Group Net Metering" },
        { id: "BYPL", name: "BSES Yamuna Power Ltd (BYPL)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 100% of DT capacity", portal: "BSES Solar City", netMetering: "DERC Net Metering eligible" },
        { id: "TPDDL", name: "Tata Power Delhi Distribution (TPDDL)", phaseRule: "1-Phase up to 5 kW, 3-Phase > 5 kW", dtLimit: "Up to 100% of DT capacity", portal: "TPDDL Solar Rooftop", netMetering: "DERC Net Metering eligible" }
      ],
      "Other States": [
        { id: "OTHER_DISCOM", name: "State Electricity Board / DISCOM", phaseRule: "Standard 1-Phase up to 3–5 kW, 3-Phase > 5 kW", dtLimit: "Subject to local DT audit (typically 70–80%)", portal: "National PM Surya Ghar Portal", netMetering: "Subject to SERC regulations" }
      ]
    },

    // Specific Exact 6-Digit PIN codes (instant offline resolution for key areas)
    exactPinMap: {
      // Kochi / Ernakulam Major Hubs
      "682019": { city: "Vyttila, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682001": { city: "Fort Kochi, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682002": { city: "Mattancherry, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682005": { city: "Rameshwaram, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682006": { city: "Palluruthy, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682011": { city: "Ernakulam Broadway / Marine Drive", state: "Kerala", discom: "KSEBL" },
      "682012": { city: "Kaloor Central, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682013": { city: "Perumanoor, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682014": { city: "Panampilly Nagar, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682015": { city: "Thevara Ferry, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682016": { city: "Kaloor, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682017": { city: "Thevara, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682018": { city: "Ernakulam South, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682020": { city: "Kadavanthra, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682021": { city: "Elamakkara, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682022": { city: "Edakochi, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682024": { city: "Kakkanad (Infopark), Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682025": { city: "Kalamassery, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682026": { city: "Kumbalangi, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682028": { city: "Thrikkakara, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682030": { city: "Edappally, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682031": { city: "Palarivattom, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682032": { city: "Cheranallur, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682033": { city: "Thammanam, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682035": { city: "Ravipuram, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682036": { city: "Tripunithura, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682037": { city: "Maradu, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682038": { city: "Vennala, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682041": { city: "Kakkanad West, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682042": { city: "Kadavanthra South, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682501": { city: "Willingdon Island, Kochi", state: "Kerala", discom: "KSEBL" },
      "683101": { city: "Aluva Town, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "683104": { city: "Kalamassery Development Plot, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "683513": { city: "North Paravur, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "683542": { city: "Perumbavoor, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "683562": { city: "Muvattupuzha, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "683565": { city: "Kothamangalam, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "683572": { city: "Angamaly, Ernakulam", state: "Kerala", discom: "KSEBL" },
      "682301": { city: "Piravom, Ernakulam", state: "Kerala", discom: "KSEBL" },

      // Alappuzha District Hubs
      "688524": { city: "Cherthala, Alappuzha", state: "Kerala", discom: "KSEBL" },
      "688001": { city: "Alappuzha Town, Alappuzha", state: "Kerala", discom: "KSEBL" },
      "688502": { city: "Kayamkulam, Alappuzha", state: "Kerala", discom: "KSEBL" },
      "688539": { city: "Aroor, Alappuzha", state: "Kerala", discom: "KSEBL" },
      "688532": { city: "Thuravoor, Alappuzha", state: "Kerala", discom: "KSEBL" },
      "688561": { city: "Ambalappuzha, Alappuzha", state: "Kerala", discom: "KSEBL" },
      "689501": { city: "Chengannur, Alappuzha", state: "Kerala", discom: "KSEBL" },
      "690514": { city: "Haripad, Alappuzha", state: "Kerala", discom: "KSEBL" },

      // Kottayam Hubs
      "686001": { city: "Kottayam Town, Kottayam", state: "Kerala", discom: "KSEBL" },
      "686101": { city: "Changanassery, Kottayam", state: "Kerala", discom: "KSEBL" },
      "686575": { city: "Pala, Kottayam", state: "Kerala", discom: "KSEBL" },
      "686662": { city: "Ettumanoor, Kottayam", state: "Kerala", discom: "KSEBL" },

      // Thrissur Hubs
      "680001": { city: "Thrissur Town, Thrissur", state: "Kerala", discom: "KSEBL" },
      "680101": { city: "Guruvayur, Thrissur", state: "Kerala", discom: "KSEBL" },
      "680121": { city: "Chalakudy, Thrissur", state: "Kerala", discom: "KSEBL" },
      "680664": { city: "Kodungallur, Thrissur", state: "Kerala", discom: "KSEBL" },

      // Trivandrum & Kollam Hubs
      "695001": { city: "Thiruvananthapuram Central, Trivandrum", state: "Kerala", discom: "KSEBL" },
      "695014": { city: "Pattom, Thiruvananthapuram", state: "Kerala", discom: "KSEBL" },
      "695581": { city: "Technopark / Kazhakkoottam, Thiruvananthapuram", state: "Kerala", discom: "KSEBL" },
      "691001": { city: "Kollam Town, Kollam", state: "Kerala", discom: "KSEBL" },

      // Kozhikode, Kannur, Palakkad
      "673001": { city: "Kozhikode Town, Kozhikode", state: "Kerala", discom: "KSEBL" },
      "670001": { city: "Kannur Town, Kannur", state: "Kerala", discom: "KSEBL" },
      "678001": { city: "Palakkad Town, Palakkad", state: "Kerala", discom: "KSEBL" },
      "676505": { city: "Malappuram Town, Malappuram", state: "Kerala", discom: "KSEBL" },
      "671121": { city: "Kasaragod Town, Kasaragod", state: "Kerala", discom: "KSEBL" },
      "673121": { city: "Kalpetta, Wayanad", state: "Kerala", discom: "KSEBL" },

      // Other States Major Tech & Metro Hubs
      "560001": { city: "Bengaluru Central", state: "Karnataka", discom: "BESCOM" },
      "560038": { city: "Indiranagar, Bengaluru", state: "Karnataka", discom: "BESCOM" },
      "560066": { city: "Whitefield, Bengaluru", state: "Karnataka", discom: "BESCOM" },
      "560100": { city: "Electronic City, Bengaluru", state: "Karnataka", discom: "BESCOM" },
      "600001": { city: "Chennai Central", state: "Tamil Nadu", discom: "TANGEDCO" },
      "600028": { city: "R.A. Puram, Chennai", state: "Tamil Nadu", discom: "TANGEDCO" },
      "500001": { city: "Hyderabad Central", state: "Telangana", discom: "TSSPDCL" },
      "500081": { city: "HITEC City / Madhapur, Hyderabad", state: "Telangana", discom: "TSSPDCL" },
      "400001": { city: "Mumbai South", state: "Maharashtra", discom: "MSEDCL" },
      "400051": { city: "BKC, Mumbai", state: "Maharashtra", discom: "MSEDCL" },
      "411001": { city: "Pune Central", state: "Maharashtra", discom: "MSEDCL" },
      "411057": { city: "Hinjawadi, Pune", state: "Maharashtra", discom: "MSEDCL" },
      "110001": { city: "Connaught Place, New Delhi", state: "Delhi NCR", discom: "BRPL" }
    },

    // 3-digit PIN Prefix Map for district-level resolution
    pin3PrefixMap: {
      // Kerala
      "682": { state: "Kerala", city: "Kochi / Ernakulam", discom: "KSEBL" },
      "683": { state: "Kerala", city: "Aluva / Ernakulam Rural", discom: "KSEBL" },
      "688": { state: "Kerala", city: "Cherthala / Alappuzha", discom: "KSEBL" },
      "686": { state: "Kerala", city: "Kottayam", discom: "KSEBL" },
      "680": { state: "Kerala", city: "Thrissur", discom: "KSEBL" },
      "685": { state: "Kerala", city: "Idukki / Thodupuzha", discom: "KSEBL" },
      "689": { state: "Kerala", city: "Pathanamthitta / Thiruvalla", discom: "KSEBL" },
      "690": { state: "Kerala", city: "Mavelikkara / Haripad / Kayamkulam", discom: "KSEBL" },
      "691": { state: "Kerala", city: "Kollam", discom: "KSEBL" },
      "695": { state: "Kerala", city: "Thiruvananthapuram", discom: "KSEBL" },
      "670": { state: "Kerala", city: "Kannur", discom: "KSEBL" },
      "671": { state: "Kerala", city: "Kasaragod", discom: "KSEBL" },
      "673": { state: "Kerala", city: "Kozhikode / Wayanad", discom: "KSEBL" },
      "676": { state: "Kerala", city: "Malappuram", discom: "KSEBL" },
      "678": { state: "Kerala", city: "Palakkad", discom: "KSEBL" },
      "679": { state: "Kerala", city: "Ottapalam / Shoranur", discom: "KSEBL" },

      // Karnataka
      "560": { state: "Karnataka", city: "Bengaluru", discom: "BESCOM" },
      "570": { state: "Karnataka", city: "Mysuru", discom: "CHESCOM" },
      "575": { state: "Karnataka", city: "Mangaluru", discom: "MESCOM" },
      "580": { state: "Karnataka", city: "Hubballi-Dharwad", discom: "HESCOM" },

      // Tamil Nadu
      "600": { state: "Tamil Nadu", city: "Chennai", discom: "TANGEDCO" },
      "641": { state: "Tamil Nadu", city: "Coimbatore", discom: "TANGEDCO" },
      "625": { state: "Tamil Nadu", city: "Madurai", discom: "TANGEDCO" },

      // Telangana & Andhra Pradesh
      "500": { state: "Telangana", city: "Hyderabad", discom: "TSSPDCL" },
      "530": { state: "Andhra Pradesh", city: "Visakhapatnam", discom: "APEPDCL" },
      "520": { state: "Andhra Pradesh", city: "Vijayawada", discom: "APCPDCL" },

      // Maharashtra
      "400": { state: "Maharashtra", city: "Mumbai", discom: "MSEDCL" },
      "411": { state: "Maharashtra", city: "Pune", discom: "MSEDCL" },
      "440": { state: "Maharashtra", city: "Nagpur", discom: "MSEDCL" },

      // Gujarat
      "380": { state: "Gujarat", city: "Ahmedabad", discom: "UGVCL" },
      "395": { state: "Gujarat", city: "Surat", discom: "DGVCL" },
      "390": { state: "Gujarat", city: "Vadodara", discom: "DGVCL" },

      // Rajasthan & Delhi
      "302": { state: "Rajasthan", city: "Jaipur", discom: "JVVNL" },
      "110": { state: "Delhi NCR", city: "New Delhi", discom: "BRPL" }
    },

    // PIN prefix heuristics (first 2 digits)
    pinPrefixMap: {
      "67": { state: "Kerala", city: "Kozhikode / Kannur / Malappuram", discom: "KSEBL" },
      "68": { state: "Kerala", city: "Central Kerala", discom: "KSEBL" },
      "69": { state: "Kerala", city: "Thiruvananthapuram / Kollam", discom: "KSEBL" },
      "56": { state: "Karnataka", city: "Bengaluru Urban / Rural", discom: "BESCOM" },
      "57": { state: "Karnataka", city: "Mangaluru / Udupi / Hassan", discom: "MESCOM" },
      "58": { state: "Karnataka", city: "Hubballi / Dharwad / Belagavi", discom: "HESCOM" },
      "59": { state: "Karnataka", city: "Kalaburagi / Raichur / Bidar", discom: "GESCOM" },
      "60": { state: "Tamil Nadu", city: "Chennai / Kanchipuram", discom: "TANGEDCO" },
      "61": { state: "Tamil Nadu", city: "Thanjavur / Tiruchirappalli", discom: "TANGEDCO" },
      "62": { state: "Tamil Nadu", city: "Madurai / Dindigul / Tirunelveli", discom: "TANGEDCO" },
      "63": { state: "Tamil Nadu", city: "Salem / Vellore / Krishnagiri", discom: "TANGEDCO" },
      "64": { state: "Tamil Nadu", city: "Coimbatore / Tiruppur / Erode", discom: "TANGEDCO" },
      "50": { state: "Telangana", city: "Hyderabad / Secunderabad / Warangal", discom: "TSSPDCL" },
      "51": { state: "Andhra Pradesh", city: "Tirupati / Kadapa / Anantapur", discom: "APSPDCL" },
      "52": { state: "Andhra Pradesh", city: "Vijayawada / Guntur", discom: "APCPDCL" },
      "53": { state: "Andhra Pradesh", city: "Visakhapatnam / Kakinada", discom: "APEPDCL" },
      "40": { state: "Maharashtra", city: "Mumbai / Navi Mumbai / Thane", discom: "MSEDCL" },
      "41": { state: "Maharashtra", city: "Pune / Kolhapur / Satara", discom: "MSEDCL" },
      "42": { state: "Maharashtra", city: "Nashik / Dhule / Jalgaon", discom: "MSEDCL" },
      "43": { state: "Maharashtra", city: "Chhatrapati Sambhajinagar", discom: "MSEDCL" },
      "44": { state: "Maharashtra", city: "Nagpur / Amravati / Chandrapur", discom: "MSEDCL" },
      "36": { state: "Gujarat", city: "Rajkot / Jamnagar / Bhavnagar", discom: "PGVCL" },
      "37": { state: "Gujarat", city: "Kutch / Bhuj", discom: "PGVCL" },
      "38": { state: "Gujarat", city: "Ahmedabad / Gandhinagar", discom: "UGVCL" },
      "39": { state: "Gujarat", city: "Surat / Vadodara / Bharuch", discom: "DGVCL" },
      "30": { state: "Rajasthan", city: "Jaipur / Alwar", discom: "JVVNL" },
      "31": { state: "Rajasthan", city: "Udaipur / Bhilwara", discom: "AVVNL" },
      "34": { state: "Rajasthan", city: "Jodhpur / Bikaner", discom: "JDVVNL" },
      "11": { state: "Delhi NCR", city: "New Delhi", discom: "BRPL" }
    },

    // Regional Solar Potential data
    solarZones: {
      "Kerala": { radiation: "4.5 – 5.0 kWh/m²/day", sunnyDays: "280+ Days/Year", zone: "Zone 3 (Tropical Wet & Dry)", rating: "Excellent", suitability: "High" },
      "Karnataka": { radiation: "4.8 – 5.4 kWh/m²/day", sunnyDays: "300+ Days/Year", zone: "Zone 4 (Deccan Plateau)", rating: "Exceptional", suitability: "High" },
      "Tamil Nadu": { radiation: "5.0 – 5.5 kWh/m²/day", sunnyDays: "310+ Days/Year", zone: "Zone 4 (High Solar Corridor)", rating: "Optimal", suitability: "High" },
      "Telangana": { radiation: "5.0 – 5.4 kWh/m²/day", sunnyDays: "300+ Days/Year", zone: "Zone 4 (Semi-Arid Plateau)", rating: "Optimal", suitability: "High" },
      "Andhra Pradesh": { radiation: "5.1 – 5.6 kWh/m²/day", sunnyDays: "315+ Days/Year", zone: "Zone 5 (High Coastal Corridor)", rating: "Optimal", suitability: "High" },
      "Maharashtra": { radiation: "4.9 – 5.3 kWh/m²/day", sunnyDays: "300+ Days/Year", zone: "Zone 4 (Western Plateau)", rating: "Exceptional", suitability: "High" },
      "Gujarat": { radiation: "5.4 – 6.0 kWh/m²/day", sunnyDays: "330+ Days/Year", zone: "Zone 5 (Prime Solar Corridor)", rating: "Peak", suitability: "High" },
      "Rajasthan": { radiation: "5.5 – 6.2 kWh/m²/day", sunnyDays: "335+ Days/Year", zone: "Zone 5 (Desert High Radiation)", rating: "Peak", suitability: "High" },
      "Delhi NCR": { radiation: "4.6 – 5.1 kWh/m²/day", sunnyDays: "290+ Days/Year", zone: "Zone 3 (Northern Plains)", rating: "Excellent", suitability: "High" },
      "Other States": { radiation: "4.5 – 5.2 kWh/m²/day", sunnyDays: "290+ Days/Year", zone: "Zone 3-4 (National Average)", rating: "Good", suitability: "Subject to Audit" }
    },

    // Dedicated KSEBL Transformer / DTR Feasibility Data
    kseb: {
      officialPortalUrl: "https://wss.kseb.in/selfservices/",
      souraPortalUrl: "https://kseb.in",
      pmSuryaGharUrl: "https://pmsuryaghar.gov.in",
      regulatoryNotice: "Final technical feasibility and grid interconnection approval are strictly subject to site inspection, distribution transformer load audit, and formal sanction from Kerala State Electricity Board Ltd (KSEB).",
      dtrMaxPercent: 90, // KSERC 90% DTR solar injection cap
      
      // Known Electrical Sections in Kerala with representative local DTRs
      sections: {
        "1155": {
          code: "1155",
          name: "Cherthala South",
          subDivision: "Cherthala Sub-Division",
          circle: "Electrical Circle Alappuzha",
          district: "Alappuzha",
          dtr: {
            id: "DTR-CH-1155-04",
            name: "Town South Feeder DTR",
            ratingKva: 160,
            cap90Kw: 144.0,
            gridConnectedKw: 68.5,
            feasibilityIssuedKw: 18.0,
            balanceAvailableKw: 57.5
          }
        },
        "1154": {
          code: "1154",
          name: "Aroor",
          subDivision: "Cherthala Sub-Division",
          circle: "Electrical Circle Alappuzha",
          district: "Alappuzha",
          dtr: {
            id: "DTR-AR-1154-12",
            name: "Industrial & Coastal DTR",
            ratingKva: 250,
            cap90Kw: 225.0,
            gridConnectedKw: 142.0,
            feasibilityIssuedKw: 35.0,
            balanceAvailableKw: 48.0
          }
        },
        "1153": {
          code: "1153",
          name: "Thuravoor",
          subDivision: "Cherthala Sub-Division",
          circle: "Electrical Circle Alappuzha",
          district: "Alappuzha",
          dtr: {
            id: "DTR-TH-1153-07",
            name: "Thuravoor Temple Road DTR",
            ratingKva: 100,
            cap90Kw: 90.0,
            gridConnectedKw: 48.0,
            feasibilityIssuedKw: 12.0,
            balanceAvailableKw: 30.0
          }
        },
        "1156": {
          code: "1156",
          name: "Alappuzha Town / North",
          subDivision: "Alappuzha Town Sub-Division",
          circle: "Electrical Circle Alappuzha",
          district: "Alappuzha",
          dtr: {
            id: "DTR-ALP-1156-02",
            name: "Collectorate Road DTR",
            ratingKva: 250,
            cap90Kw: 225.0,
            gridConnectedKw: 182.5,
            feasibilityIssuedKw: 22.0,
            balanceAvailableKw: 20.5
          }
        },
        "1157": {
          code: "1157",
          name: "Alappuzha South",
          subDivision: "Alappuzha Town Sub-Division",
          circle: "Electrical Circle Alappuzha",
          district: "Alappuzha",
          dtr: {
            id: "DTR-ALP-1157-15",
            name: "Beach Ward Residential DTR",
            ratingKva: 100,
            cap90Kw: 90.0,
            gridConnectedKw: 56.0,
            feasibilityIssuedKw: 10.0,
            balanceAvailableKw: 24.0
          }
        },
        "1160": {
          code: "1160",
          name: "Ernakulam Central",
          subDivision: "Ernakulam Sub-Division",
          circle: "Electrical Circle Ernakulam",
          district: "Ernakulam",
          dtr: {
            id: "DTR-EKM-1160-22",
            name: "Panampilly Nagar DTR",
            ratingKva: 250,
            cap90Kw: 225.0,
            gridConnectedKw: 198.0,
            feasibilityIssuedKw: 24.0,
            balanceAvailableKw: 3.0 // Low headroom example!
          }
        },
        "1163": {
          code: "1163",
          name: "Kakkanad (Infopark Zone)",
          subDivision: "Thrikkakara Sub-Division",
          circle: "Electrical Circle Ernakulam",
          district: "Ernakulam",
          dtr: {
            id: "DTR-KKD-1163-09",
            name: "Civil Station / NGO Quarters DTR",
            ratingKva: 250,
            cap90Kw: 225.0,
            gridConnectedKw: 110.0,
            feasibilityIssuedKw: 32.0,
            balanceAvailableKw: 83.0
          }
        },
        "1164": {
          code: "1164",
          name: "Tripunithura",
          subDivision: "Tripunithura Sub-Division",
          circle: "Electrical Circle Ernakulam",
          district: "Ernakulam",
          dtr: {
            id: "DTR-TPT-1164-18",
            name: "Statue Junction DTR",
            ratingKva: 160,
            cap90Kw: 144.0,
            gridConnectedKw: 84.0,
            feasibilityIssuedKw: 25.0,
            balanceAvailableKw: 35.0
          }
        },
        "1141": {
          code: "1141",
          name: "Kollam Cantonment",
          subDivision: "Kollam Sub-Division",
          circle: "Electrical Circle Kollam",
          district: "Kollam",
          dtr: {
            id: "DTR-KLM-1141-05",
            name: "Chinnakada DTR",
            ratingKva: 160,
            cap90Kw: 144.0,
            gridConnectedKw: 72.0,
            feasibilityIssuedKw: 15.0,
            balanceAvailableKw: 57.0
          }
        },
        "1131": {
          code: "1131",
          name: "Thiruvananthapuram Fort",
          subDivision: "Trivandrum Central",
          circle: "Electrical Circle Thiruvananthapuram",
          district: "Thiruvananthapuram",
          dtr: {
            id: "DTR-TVM-1131-11",
            name: "Statue Secretariat Feeder",
            ratingKva: 250,
            cap90Kw: 225.0,
            gridConnectedKw: 165.0,
            feasibilityIssuedKw: 28.0,
            balanceAvailableKw: 32.0
          }
        },
        "1171": {
          code: "1171",
          name: "Thrissur Town East",
          subDivision: "Thrissur East Sub-Division",
          circle: "Electrical Circle Thrissur",
          district: "Thrissur",
          dtr: {
            id: "DTR-TSR-1171-08",
            name: "Swaraj Round East DTR",
            ratingKva: 160,
            cap90Kw: 144.0,
            gridConnectedKw: 92.0,
            feasibilityIssuedKw: 18.0,
            balanceAvailableKw: 34.0
          }
        },
        "1191": {
          code: "1191",
          name: "Kozhikode Central",
          subDivision: "Calicut Sub-Division",
          circle: "Electrical Circle Kozhikode",
          district: "Kozhikode",
          dtr: {
            id: "DTR-CLT-1191-14",
            name: "Mananchira Square DTR",
            ratingKva: 250,
            cap90Kw: 225.0,
            gridConnectedKw: 120.0,
            feasibilityIssuedKw: 30.0,
            balanceAvailableKw: 75.0
          }
        }
      }
    }
  }
};

// Freeze configuration to protect against accidental mutations
Object.freeze(SOORYAVAMSHI_CONFIG);
