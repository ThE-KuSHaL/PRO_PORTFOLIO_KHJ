'use client';
// app/page.tsx
import dynamic from 'next/dynamic';
import HeroSection from '@/components/hero/HeroSection';
import AboutSection from '@/components/sections/AboutSection';
import EducationSection from '@/components/sections/EducationSection';
import SkillsSection from '@/components/sections/SkillsSection';
import ProjectsSection from '@/components/sections/ProjectsSection';
import VentureSection from '@/components/sections/VentureSection';
import JourneySection from '@/components/sections/JourneySection';
import ContactSection from '@/components/sections/ContactSection';
import ScrollIndicator from '@/components/ui/ScrollIndicator';
import ScrollToTop from '@/components/ui/ScrollToTop';
import ScrollNav from '@/components/ui/ScrollNav';

// Client-only components
const PCBBackground = dynamic(
  () => import('@/components/background/PCBBackground'),
  { ssr: false }
);
const ClickSpark = dynamic(
  () => import('@/components/ui/ClickSpark'),
  { ssr: false }
);
const Sidebar = dynamic(
  () => import('@/components/layout/Sidebar'),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      {/* Scroll to top on every load */}
      <ScrollToTop />

      {/* Fixed background */}
      <PCBBackground />


      {/* Click spark effect — fires on every click site-wide */}
      <ClickSpark sparkColor="#06b6d4" sparkCount={10} sparkSize={14} duration={500} />

      {/* Collapsible sidebar navigation */}
      <Sidebar />

      {/* Scroll indicator + nav buttons */}
      <ScrollIndicator />
      <ScrollNav />

      {/* Main content */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        <HeroSection />
        <AboutSection />
        <EducationSection />
        <SkillsSection />
        <ProjectsSection />
        <VentureSection />
        <JourneySection />
        <ContactSection />
      </main>
    </>
  );
}
