export const NICHE_LABELS: Record<string, string> = {
  medtech:       "MedTech",
  pharma:        "Pharma",
  biotech:       "Biotech",
  chemistry:     "Chemie",
  polymers:      "Polymere",
  mechanical:    "Maschinenbau",
  manufacturing: "Fertigung",
  automotive:    "Automotive",
  aerospace:     "Luft- & Raumfahrt",
  marine:        "Maritime Technik",
  electronics:   "Elektronik",
  electrical:    "Elektrotechnik",
  telecom:       "Telekommunikation",
  software:      "Software & IT",
  optics:        "Optik",
  measurement:   "Messtechnik",
  energy:        "Energie",
  robotics:      "Robotik",
  construction:  "Bauwesen",
  food:          "Lebensmittel",
  agriculture:   "Landwirtschaft",
  textiles:      "Textilien",
  packaging:     "Verpackung",
  environment:   "Umwelttechnik",
};

// Legacy alias for old code
export const INDUSTRY_LABELS = NICHE_LABELS;

export interface Subcategory {
  key: string;
  label: string;
  cpc: string;
}

export const NICHE_SUBCATEGORIES: Record<string, Subcategory[]> = {
  medtech: [
    { key: "medtech_surgery",      label: "Chirurgie",          cpc: "A61B17" },
    { key: "medtech_diagnostics",  label: "Diagnostik",         cpc: "A61B" },
    { key: "medtech_imaging",      label: "Bildgebung",         cpc: "A61B6" },
    { key: "medtech_implants",     label: "Implantate",         cpc: "A61F" },
    { key: "medtech_delivery",     label: "Drug Delivery",      cpc: "A61M" },
    { key: "medtech_rehab",        label: "Rehabilitation",     cpc: "A61H" },
    { key: "medtech_radiation",    label: "Strahlentherapie",   cpc: "A61N" },
    { key: "medtech_sterilize",    label: "Sterilisation",      cpc: "A61L" },
  ],
  pharma: [
    { key: "pharma_formulation",   label: "Formulierung",       cpc: "A61K9" },
    { key: "pharma_compounds",     label: "Wirkstoffe",         cpc: "A61K31" },
    { key: "pharma_biologics",     label: "Biologika",          cpc: "A61K38" },
    { key: "pharma_oncology",      label: "Onkologie",          cpc: "A61P35" },
    { key: "pharma_neuro",         label: "Neurologie",         cpc: "A61P25" },
    { key: "pharma_cardio",        label: "Herz-Kreislauf",     cpc: "A61P9" },
    { key: "pharma_immuno",        label: "Immunologie",        cpc: "A61P37" },
  ],
  biotech: [
    { key: "bio_gene",             label: "Gentechnik",         cpc: "C12N15" },
    { key: "bio_cell",             label: "Zellbiologie",       cpc: "C12N5" },
    { key: "bio_enzyme",           label: "Enzyme",             cpc: "C12N9" },
    { key: "bio_assay",            label: "Diagnostische Tests",cpc: "C12Q1" },
    { key: "bio_ferm",             label: "Fermentation",       cpc: "C12M" },
    { key: "bio_plant",            label: "Pflanzenbiotech",    cpc: "A01H" },
  ],
  chemistry: [
    { key: "chem_inorganic",       label: "Anorganische Chemie",cpc: "C01" },
    { key: "chem_organic",         label: "Organische Chemie",  cpc: "C07" },
    { key: "chem_coatings",        label: "Farben & Lacke",     cpc: "C09D" },
    { key: "chem_petro",           label: "Erdölchemie",        cpc: "C10" },
    { key: "chem_food_chem",       label: "Lebensmittelchem.",  cpc: "C11" },
    { key: "chem_leather",         label: "Leder & Fette",      cpc: "C14" },
  ],
  polymers: [
    { key: "poly_thermo",          label: "Thermoplaste",       cpc: "C08L" },
    { key: "poly_rubber",          label: "Elastomere",         cpc: "C08J" },
    { key: "poly_composite",       label: "Verbundwerkstoffe",  cpc: "C08K" },
    { key: "poly_adhesive",        label: "Klebstoffe",         cpc: "C09J" },
    { key: "poly_fiber",           label: "Fasern & Folien",    cpc: "C08F" },
  ],
  mechanical: [
    { key: "mech_motors",          label: "Motoren & Turbinen", cpc: "F01" },
    { key: "mech_pumps",           label: "Pumpen & Verdichter",cpc: "F04" },
    { key: "mech_hydraulic",       label: "Hydraulik",          cpc: "F15" },
    { key: "mech_gears",           label: "Getriebe & Lager",   cpc: "F16" },
    { key: "mech_combustion",      label: "Verbrennungsmotoren",cpc: "F02" },
    { key: "mech_pressure",        label: "Drucktechnik",       cpc: "F17" },
  ],
  manufacturing: [
    { key: "mfg_metal_forming",    label: "Metallumformung",    cpc: "B21" },
    { key: "mfg_casting",          label: "Gießerei",           cpc: "B22" },
    { key: "mfg_machining",        label: "Zerspanen",          cpc: "B23" },
    { key: "mfg_welding",          label: "Schweißen",          cpc: "B23K" },
    { key: "mfg_tools",            label: "Handwerkzeuge",      cpc: "B25" },
    { key: "mfg_plastics",         label: "Kunststoffverarbeit.",cpc: "B29" },
    { key: "mfg_pressing",         label: "Pressen & Stanzen",  cpc: "B30" },
  ],
  automotive: [
    { key: "auto_chassis",         label: "Fahrwerk & Karosserie",cpc: "B62" },
    { key: "auto_engine",          label: "Antriebsstrang",     cpc: "F02B" },
    { key: "auto_ev",              label: "Elektroantrieb",     cpc: "B60L" },
    { key: "auto_adas",            label: "ADAS & Sensorik",    cpc: "B60W" },
    { key: "auto_brakes",          label: "Bremssysteme",       cpc: "B60T" },
    { key: "auto_hvac",            label: "Klimaanlage",        cpc: "B60H" },
  ],
  aerospace: [
    { key: "aero_aircraft",        label: "Flugzeugzelle",      cpc: "B64C" },
    { key: "aero_propulsion",      label: "Antrieb",            cpc: "B64D" },
    { key: "aero_space",           label: "Raumfahrzeuge",      cpc: "B64G" },
    { key: "aero_control",         label: "Steuerung & Nav.",   cpc: "B64D45" },
  ],
  marine: [
    { key: "marine_hull",          label: "Schiffsrumpf",       cpc: "B63B" },
    { key: "marine_drive",         label: "Schiffsantrieb",     cpc: "B63H" },
    { key: "marine_sub",           label: "U-Boote",            cpc: "B63G" },
  ],
  electronics: [
    { key: "elec_semiconductor",   label: "Halbleiter",         cpc: "H01L" },
    { key: "elec_battery",         label: "Batterien & Akkus",  cpc: "H01M" },
    { key: "elec_connectors",      label: "Steckverbinder",     cpc: "H01R" },
    { key: "elec_laser",           label: "Laser & LED",        cpc: "H01S" },
    { key: "elec_display",         label: "Displays",           cpc: "H05B" },
    { key: "elec_pcb",             label: "Leiterplatten",      cpc: "H05K" },
  ],
  electrical: [
    { key: "elec_power_gen",       label: "Stromerzeugung",     cpc: "H02K" },
    { key: "elec_power_conv",      label: "Leistungselektronik",cpc: "H02M" },
    { key: "elec_grid",            label: "Stromnetze",         cpc: "H02J" },
    { key: "elec_motor_ctrl",      label: "Motorsteuerung",     cpc: "H02P" },
  ],
  telecom: [
    { key: "tele_wireless",        label: "Mobilfunk",          cpc: "H04W" },
    { key: "tele_optical",         label: "Glasfaser",          cpc: "H04B10" },
    { key: "tele_signal",          label: "Signalverarbeitung", cpc: "H04B" },
    { key: "tele_network",         label: "Netzwerke",          cpc: "H04L" },
    { key: "tele_broadcast",       label: "Rundfunk",           cpc: "H04H" },
  ],
  software: [
    { key: "sw_ml",                label: "KI & Machine Learning",cpc: "G06N" },
    { key: "sw_ui",                label: "Benutzeroberflächen",cpc: "G06F3" },
    { key: "sw_database",          label: "Datenbanken",        cpc: "G06F16" },
    { key: "sw_security",          label: "IT-Sicherheit",      cpc: "G06F21" },
    { key: "sw_health_it",         label: "Health IT",          cpc: "G16H" },
    { key: "sw_iot",               label: "IoT",                cpc: "G16Y" },
  ],
  optics: [
    { key: "opt_lenses",           label: "Linsen & Optiken",   cpc: "G02B" },
    { key: "opt_fiber",            label: "Lichtleiter",        cpc: "G02B6" },
    { key: "opt_photo",            label: "Fotografie",         cpc: "G03B" },
    { key: "opt_litho",            label: "Lithographie",       cpc: "G03F" },
  ],
  measurement: [
    { key: "meas_physical",        label: "Physikalische Messung",cpc: "G01B" },
    { key: "meas_flow",            label: "Durchflussmessung",  cpc: "G01F" },
    { key: "meas_temp",            label: "Temperatur",         cpc: "G01K" },
    { key: "meas_chemical",        label: "Chemische Analyse",  cpc: "G01N" },
    { key: "meas_testing",         label: "Werkstoffprüfung",   cpc: "G01N3" },
  ],
  energy: [
    { key: "energy_wind",          label: "Windenergie",        cpc: "F03D" },
    { key: "energy_solar",         label: "Solarenergie",       cpc: "H02S" },
    { key: "energy_thermal",       label: "Wärmetauscher",      cpc: "F24" },
    { key: "energy_fuel_cell",     label: "Brennstoffzellen",   cpc: "H01M8" },
    { key: "energy_storage",       label: "Energiespeicher",    cpc: "H02J7" },
  ],
  robotics: [
    { key: "rob_manipulator",      label: "Manipulatoren",      cpc: "B25J" },
    { key: "rob_control",          label: "Regelungstechnik",   cpc: "G05B" },
    { key: "rob_autonomous",       label: "Autonome Systeme",   cpc: "G05D" },
    { key: "rob_gripper",          label: "Greifer & Aktoren",  cpc: "B25J15" },
  ],
  construction: [
    { key: "const_foundation",     label: "Gründung & Tiefbau", cpc: "E02" },
    { key: "const_building",       label: "Hochbau",            cpc: "E04" },
    { key: "const_roads",          label: "Straßenbau",         cpc: "E01" },
    { key: "const_water",          label: "Wasserbau",          cpc: "E03" },
    { key: "const_doors",          label: "Türen & Fenster",    cpc: "E06" },
  ],
  food: [
    { key: "food_baking",          label: "Backen & Teig",      cpc: "A21" },
    { key: "food_meat",            label: "Fleischverarbeitung",cpc: "A22" },
    { key: "food_preservation",    label: "Konservierung",      cpc: "A23L3" },
    { key: "food_dairy",           label: "Milchprodukte",      cpc: "A23C" },
    { key: "food_beverages",       label: "Getränke",           cpc: "A23L2" },
  ],
  agriculture: [
    { key: "agri_crop",            label: "Pflanzenschutz",     cpc: "A01N" },
    { key: "agri_soil",            label: "Bodenbearbeitung",   cpc: "A01B" },
    { key: "agri_harvest",         label: "Ernte & Mähen",      cpc: "A01D" },
    { key: "agri_livestock",       label: "Tierhaltung",        cpc: "A01K" },
    { key: "agri_greenhouse",      label: "Gewächshaus",        cpc: "A01G" },
  ],
  textiles: [
    { key: "tex_spinning",         label: "Spinnen & Weben",    cpc: "D01" },
    { key: "tex_knitting",         label: "Stricken",           cpc: "D04B" },
    { key: "tex_nonwoven",         label: "Vliesstoffe",        cpc: "D04H" },
    { key: "tex_finishing",        label: "Textilveredlung",    cpc: "D06" },
  ],
  packaging: [
    { key: "pack_containers",      label: "Behälter & Dosen",   cpc: "B65D" },
    { key: "pack_wrapping",        label: "Verpackungsmaschinen",cpc: "B65B" },
    { key: "pack_transport",       label: "Transport & Lager",  cpc: "B65G" },
  ],
  environment: [
    { key: "env_water",            label: "Wasseraufbereitung", cpc: "C02F" },
    { key: "env_waste",            label: "Abfallbehandlung",   cpc: "B09" },
    { key: "env_air",              label: "Abluftreinigung",    cpc: "B01D53" },
    { key: "env_incineration",     label: "Müllverbrennung",    cpc: "F23G" },
  ],
};

export const CPC_BY_INDUSTRY: Record<string, string[]> = Object.fromEntries(
  Object.entries(NICHE_SUBCATEGORIES).map(([niche, subs]) => [
    niche,
    subs.map((s) => s.cpc),
  ])
);
