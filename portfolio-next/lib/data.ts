// lib/data.ts
export interface Project {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  tags: string[];
  status: 'active' | 'live' | 'confidential' | 'winner';
  emoji: string;
  modal: { demo: string | null; github: string | null };
}

export interface JourneyMilestone {
  id?: string;
  year: string;
  title: string;
  summary: string;
  x: number;
  y: number;
  side: 'left' | 'right';
}

export interface SkillItem {
  label: string;
  variant: 'primary' | 'secondary' | 'dim';
}

export interface SkillCategory {
  category: string;
  icon: string;
  items: SkillItem[];
}

export interface SemesterData {
  sem: number;
  period: string;
  courses: string[];
  projects: string[];
  platforms: string[];
}

// ── PROJECTS ──────────────────────────────────────────────────────────────────
export const projects: Project[] = [
  {
    id: 'flow',
    name: 'FLOW',
    subtitle: 'Gas Sensing IoT Platform',
    description:
      'A real-time gas sensing and monitoring system built on embedded IoT hardware. Designed for industrial and safety environments — measures air quality, detects hazardous leaks, and streams live telemetry to cloud dashboards. CAD-designed enclosure for deployable hardware nodes.',
    tags: ['IoT', 'Python', 'Embedded', 'Solid Edge CAD', 'Cloud'],
    status: 'active',
    emoji: '🌬️',
    modal: { demo: null, github: null }, // TODO: add links when public
  },
  {
    id: 'dharmajyoti',
    name: 'DHARMAJYOTI',
    subtitle: 'AI Legal Companion',
    description:
      'An AI-powered legal assistant that leverages Large Language Models to help users understand complex legal documents, rights, and procedures in plain language. Built for accessibility — bridging the gap between law and the everyday citizen.',
    tags: ['Python', 'LLM APIs', 'AI', 'FastAPI', 'Prompt Engineering'],
    status: 'live',
    emoji: '⚖️',
    modal: { demo: null, github: null }, // TODO: add links
  },
  {
    id: 'kavach',
    name: 'KAVACH',
    subtitle: 'AI-Based Fraud Detection System',
    description:
      'An intelligent system built to detect and flag fraudulent transactions in real-time. Leverages machine learning models to analyze transaction patterns, reducing false positives while identifying anomalous behavior accurately.',
    tags: ['AI', 'Fraud Detection', 'Python', 'Machine Learning', 'Real-time'],
    status: 'active',
    emoji: '🛡️',
    modal: { demo: null, github: null }, // TODO: add links
  },
  {
    id: 'confidential',
    name: 'Confidential B2B Venture',
    subtitle: 'CAD · IoT · Cloud — Funded',
    description:
      'A funded B2B product at the intersection of CAD automation, IoT infrastructure, and cloud services. Currently in stealth — ~2 months from launch. Built under QUIRK TECHNOLOGIES.',
    tags: ['IoT', 'CAD', 'Cloud', 'B2B', 'Funded'],
    status: 'confidential',
    emoji: '🔒',
    modal: { demo: null, github: null },
  },
];

// ── JOURNEY MILESTONES ────────────────────────────────────────────────────────
export const journeyMilestones: JourneyMilestone[] = [
  {
    year: '2019',
    title: 'Origin',
    summary: 'First line of logic · Sri Venkateshwara High School',
    x: 400, y: 40, side: 'right',
  },
  {
    year: '2022',
    title: 'Turning Point',
    summary: 'First Python script. Everything changed.',
    x: 580, y: 160, side: 'left',
  },
  {
    year: '2023',
    title: 'AI Exploration',
    summary: 'Started building AI systems · QUIRK TECHNOLOGIES formed',
    x: 400, y: 380, side: 'right',
  },
  {
    year: '2024',
    title: 'First Product',
    summary: 'DHARMAJYOTI launched · Co-founded QUIRK TECHNOLOGIES',
    x: 220, y: 490, side: 'left',
  },
  {
    id: 'kavach-milestone',
    year: '2024',
    title: 'AI Security',
    summary: 'KAVACH built · AI fraud detection system',
    x: 220, y: 590, side: 'right',
  },
  {
    id: 'deepening-knowledge',
    year: '2024',
    title: 'System Architecture',
    summary: 'Scaling AI pipelines and robust security models',
    x: 400, y: 690, side: 'left',
  },
  {
    year: '2024',
    title: 'FLOW',
    summary: 'Gas sensing IoT · commercialization in progress',
    x: 580, y: 790, side: 'right',
  },
  {
    year: '2025',
    title: 'Funded',
    summary: 'Secured funding for B2B venture. First real step as founder.',
    x: 400, y: 880, side: 'left',
  },
  {
    year: 'Present',
    title: 'Building',
    summary: 'Confidential B2B product. ~2 months to launch.',
    x: 400, y: 880, side: 'right',
  },
];

// ── SKILLS ───────────────────────────────────────────────────────────────────
export const skills: SkillCategory[] = [
  {
    category: 'Languages',
    icon: '{ }',
    items: [
      { label: 'Python', variant: 'primary' },
      { label: 'C', variant: 'primary' },
      { label: 'JavaScript', variant: 'primary' },
      { label: 'Java', variant: 'secondary' },
    ],
  },
  {
    category: 'Frameworks',
    icon: '⚙',
    items: [
      { label: 'Express.js', variant: 'primary' },
      { label: 'FastAPI', variant: 'primary' },
      { label: 'Flask', variant: 'secondary' },
    ],
  },
  {
    category: 'AI / ML',
    icon: '◈',
    items: [
      { label: 'LLM APIs', variant: 'primary' },
      { label: 'Prompt Engineering', variant: 'primary' },
      { label: 'AI Product Dev', variant: 'primary' },
    ],
  },
  {
    category: 'IoT & Hardware',
    icon: '⊕',
    items: [
      { label: 'Solid Edge CAD', variant: 'primary' },
      { label: 'Sensor Integration', variant: 'primary' },
      { label: 'Embedded IoT', variant: 'primary' },
      { label: 'Gas AQI Systems', variant: 'secondary' },
    ],
  },
  {
    category: 'Cloud / DevOps',
    icon: '☁',
    items: [
      { label: 'Docker', variant: 'secondary' },
      { label: 'Git', variant: 'primary' },
      { label: 'REST APIs', variant: 'primary' },
      { label: 'Linux', variant: 'secondary' },
    ],
  },
  {
    category: 'Core CS',
    icon: '∑',
    items: [
      { label: 'DSA', variant: 'primary' },
      { label: 'DAA', variant: 'secondary' },
      { label: 'OS', variant: 'secondary' },
      { label: 'DBMS', variant: 'secondary' },
      { label: 'Software Engineering', variant: 'dim' },
      { label: 'Digital Design', variant: 'dim' },
      { label: 'Computer Organization', variant: 'dim' },
    ],
  },
  {
    category: 'Design & Tools',
    icon: '✦',
    items: [
      { label: 'Figma', variant: 'secondary' },
      { label: 'UI/UX', variant: 'secondary' },
      { label: 'Postman', variant: 'dim' },
      { label: 'VS Code', variant: 'dim' },
    ],
  },
];

// ── SEMESTER DATA ─────────────────────────────────────────────────────────────
export const semesterData: SemesterData[] = [
  {
    sem: 1,
    period: 'Aug 2024 – Dec 2024',
    courses: ['C Programming', 'Digital Design & Logic', 'Engineering Mathematics', 'Basic Electronics'],
    projects: ['Started Python exploration on the side'],
    platforms: ['VS Code', 'Tinkercad'],
  },
  {
    sem: 2,
    period: 'Jan 2025 – Jun 2025',
    courses: ['Data Structures', 'Discrete Mathematics', 'OOP with Java', 'Computer Organization'],
    projects: ['DHARMAJYOTI born', 'QUIRK TECHNOLOGIES formally co-founded'],
    platforms: ['FastAPI', 'LLM APIs', 'Git'],
  },
  {
    sem: 3,
    period: 'Jul 2025 – Present',
    courses: ['DSA', 'Operating Systems', 'DBMS', 'Software Engineering'],
    projects: [
      'KAVACH built — AI-based fraud detection system',
      'FLOW designed and moving to commercialization',
      'B2B venture funded',
    ],
    platforms: ['IoT sensors', 'Solid Edge CAD', 'Docker', 'Cloud platforms'],
  },
];

// ── NAV LINKS ─────────────────────────────────────────────────────────────────
export const navLinks = [
  { label: 'Home',      href: '#hero' },
  { label: 'About',     href: '#about' },
  { label: 'Education', href: '#education' },
  { label: 'Skills',    href: '#skills' },
  { label: 'Projects',  href: '#projects' },
  { label: 'Venture',   href: '#venture' },
  { label: 'Journey',   href: '#journey' },
  { label: 'Contact',   href: '#contact' },
];
