// WAEC / WASSCE Subject Syllabus Catalog
// Rules:
// 1. English Language (Compulsory Core)
// 2. Mathematics (Compulsory Core)
// 3. Civic Education (Compulsory Core)
// Supply 6 other subjects from Sciences, Arts, Commercial or Trade to reach exactly 9 subjects!

export interface WaecCatalogSubject {
  code: string;
  name: string;
  category: 'core' | 'science' | 'arts' | 'commercial' | 'trade';
  description: string;
}

export const WAEC_COMPULSORY_SUBJECTS: WaecCatalogSubject[] = [
  { code: 'ENG', name: 'English Language', category: 'core', description: 'Grammar, Essay, Comprehension & Oral English' },
  { code: 'MTH', name: 'Mathematics', category: 'core', description: 'General Mathematics & Quantitative Reasoning' },
  { code: 'CIV', name: 'Civic Education', category: 'core', description: 'Governance, Citizenship, Human Rights & Values' }
];

export const WAEC_ELECTIVE_SUBJECTS: WaecCatalogSubject[] = [
  // Sciences
  { code: 'BIO', name: 'Biology', category: 'science', description: 'Morphology, Ecology, Physiology & Genetics' },
  { code: 'CHM', name: 'Chemistry', category: 'science', description: 'Organic, Inorganic & Physical Chemistry' },
  { code: 'PHY', name: 'Physics', category: 'science', description: 'Mechanics, Heat, Optics, Electricity & Magnetism' },
  { code: 'FMT', name: 'Further Mathematics', category: 'science', description: 'Calculus, Pure Mathematics & Statistics' },
  { code: 'AGR', name: 'Agricultural Science', category: 'science', description: 'Crop Production, Soil Science & Animal Husbandry' },
  { code: 'GEO', name: 'Geography', category: 'science', description: 'Physical, Regional & Human Geography' },
  { code: 'TDR', name: 'Technical Drawing', category: 'science', description: 'Orthographic, Isomeric & Mechanical Projection' },
  { code: 'CMP', name: 'Computer Studies', category: 'science', description: 'Information & Communication Technology (ICT)' },
  { code: 'PHE', name: 'Physical Education', category: 'science', description: 'Sports Science, Athletics & Health Studies' },

  // Arts & Humanities
  { code: 'LIT', name: 'Literature in English', category: 'arts', description: 'African & Non-African Prose, Drama & Poetry' },
  { code: 'GOV', name: 'Government', category: 'arts', description: 'Political Systems, Constitutions & Public Admin' },
  { code: 'CRS', name: 'Christian Religious Studies', category: 'arts', description: 'Biblical Literature, Synoptic Gospels & Epistles' },
  { code: 'IRS', name: 'Islamic Religious Studies', category: 'arts', description: 'Tawhid, Fiqh, Hadith & Qur\'anic Exegesis' },
  { code: 'HIS', name: 'History', category: 'arts', description: 'Nigerian History, West Africa & Global Events' },
  { code: 'FRN', name: 'French Language', category: 'arts', description: 'Grammar, Written Expression & Oral Translation' },
  { code: 'VAR', name: 'Visual Art', category: 'arts', description: 'Drawing, Painting, Sculpture & Textiles' },
  { code: 'MUS', name: 'Music', category: 'arts', description: 'Theory, Composition, Sight Reading & African Music' },
  { code: 'YOR', name: 'Yoruba Language', category: 'arts', description: 'Grammar, Literature, Culture & Customs' },
  { code: 'IGB', name: 'Igbo Language', category: 'arts', description: 'Grammar, Literature, Culture & Customs' },
  { code: 'HAU', name: 'Hausa Language', category: 'arts', description: 'Grammar, Literature, Culture & Customs' },

  // Commercial & Business Studies
  { code: 'ECO', name: 'Economics', category: 'commercial', description: 'Micro & Macro Economics, National Income & Finance' },
  { code: 'ACC', name: 'Financial Accounting', category: 'commercial', description: 'Ledgers, Trial Balance, Final Accounts & Auditing' },
  { code: 'COM', name: 'Commerce', category: 'commercial', description: 'Trade, Banking, Insurance, Warehousing & E-Commerce' },
  { code: 'OFP', name: 'Office Practice', category: 'commercial', description: 'Clerical Duties, Filing & Business Communications' },
  { code: 'MKT', name: 'Marketing', category: 'commercial', description: 'Product Promotion, Distribution & Consumer Behavior' },
  { code: 'INS', name: 'Insurance', category: 'commercial', description: 'Principles of Indemnity, Risk & Underwriting' },
  { code: 'BKK', name: 'Book Keeping', category: 'commercial', description: 'Double Entry, Petty Cash & Sales Journals' },
  { code: 'STM', name: 'Store Management', category: 'commercial', description: 'Stock Control, Inventory & Logistics' },

  // Trade & Entrepreneurship Subjects (WAEC Mandated)
  { code: 'DPR', name: 'Data Processing', category: 'trade', description: 'Database Systems, Spreadsheets & Computer Applications' },
  { code: 'CCP', name: 'Catering Craft Practice', category: 'trade', description: 'Food Preparation, Culinary Arts & Hospitality' },
  { code: 'ANH', name: 'Animal Husbandry', category: 'trade', description: 'Livestock Breeding, Nutrition & Poultry Management' },
  { code: 'FSH', name: 'Fisheries', category: 'trade', description: 'Aquaculture, Fish Pond Management & Preservation' },
  { code: 'GTM', name: 'Garment Making', category: 'trade', description: 'Pattern Drafting, Sewing & Fashion Designing' },
  { code: 'DYB', name: 'Dyeing & Bleaching', category: 'trade', description: 'Textile Surface Design, Batik & Tie-Dye' },
  { code: 'ELI', name: 'Electrical Installation & Maintenance', category: 'trade', description: 'Domestic Wiring, Circuit Testing & Electronics' },
  { code: 'AUT', name: 'Auto Mechanics', category: 'trade', description: 'Engine Servicing, Transmission & Vehicle Diagnostics' },
  { code: 'PHO', name: 'Photography', category: 'trade', description: 'Digital Cameras, Lighting, Studio Portraiture & Editing' },
  { code: 'CSM', name: 'Cosmetology', category: 'trade', description: 'Hair Styling, Skin Care, Manicure & Pedicure' }
];

export const ALL_WAEC_SUBJECTS: WaecCatalogSubject[] = [
  ...WAEC_COMPULSORY_SUBJECTS,
  ...WAEC_ELECTIVE_SUBJECTS
];

// Department recommended 9-subject presets
export const DEPARTMENT_RECOMMENDED_SUBJECTS: Record<'Science' | 'Arts' | 'Commercial', string[]> = {
  Science: [
    'English Language',
    'Mathematics',
    'Civic Education',
    'Physics',
    'Chemistry',
    'Biology',
    'Further Mathematics',
    'Agricultural Science',
    'Data Processing'
  ],
  Arts: [
    'English Language',
    'Mathematics',
    'Civic Education',
    'Literature in English',
    'Government',
    'Christian Religious Studies',
    'Economics',
    'Yoruba Language',
    'Catering Craft Practice'
  ],
  Commercial: [
    'English Language',
    'Mathematics',
    'Civic Education',
    'Financial Accounting',
    'Commerce',
    'Economics',
    'Marketing',
    'Book Keeping',
    'Data Processing'
  ]
};
