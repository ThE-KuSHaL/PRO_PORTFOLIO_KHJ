'use client';
// components/layout/Sidebar.tsx
import { useEffect, useRef, useState } from 'react';
import { useLayoutStore } from '@/store/layoutStore';
import { useIsMobile } from '@/lib/device';
import { navLinks } from '@/lib/data';
import CpuCore from './CpuCore';
import {
  Home, User, GraduationCap, Cpu, FolderOpen,
  Rocket, GitBranch, Mail, Menu, X, ChevronRight, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';

const ICONS = [Home, User, GraduationCap, Cpu, FolderOpen, Rocket, GitBranch, Mail];

export default function Sidebar() {
  const { activeSection, setActiveSection, sidebarCollapsed, setSidebarCollapsed } = useLayoutStore();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    obsRef.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveSection(e.target.id);
        }
      },
      // Active = the section crossing a thin band just above mid-screen. A visibility threshold
      // also matched a neighbour that only touched the screen edge.
      { rootMargin: '-45% 0px -54% 0px', threshold: 0 }
    );
    document.querySelectorAll('section[id]').forEach((s) => obsRef.current?.observe(s));
    return () => obsRef.current?.disconnect();
  }, []);

  function scrollTo(href: string) {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileOpen(false);
  }

  const sectionId = (href: string) => href.replace('#', '');

  // Narrow desktop windows (tablets, high zoom) start collapsed so the content keeps its room.
  useEffect(() => {
    const narrow = window.matchMedia('(min-width: 768px) and (max-width: 1099px)');
    const apply = () => setSidebarCollapsed(narrow.matches);
    apply();
    narrow.addEventListener('change', apply);
    return () => narrow.removeEventListener('change', apply);
  }, [setSidebarCollapsed]);

  // The phone drawer is always the full-width version.
  const collapsed = sidebarCollapsed && !isMobile;
  // rem, so the sidebar grows with the fluid root size on large screens
  const width = collapsed ? '3.75rem' : '12.5rem';

  // Inject CSS variable for other components (like section padding)
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isMobile && !mobileOpen ? '0rem' : width);
  }, [width, isMobile, mobileOpen]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-4 z-[200] md:hidden p-2 rounded-lg"
        style={{ background: 'rgba(3,8,16,0.9)', border: '1px solid rgba(99,102,241,0.3)' }}
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle navigation"
      >
        {mobileOpen ? <X size={18} color="#06b6d4" /> : <Menu size={18} color="#06b6d4" />}
      </button>

      {/* Sidebar */}
      <aside
        role="navigation"
        aria-label="Main navigation"
        className="side"
        data-collapsed={collapsed}
        data-hidden={isMobile && !mobileOpen}
        style={{
          width,
          transform: (mobileOpen || !isMobile) ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Header: the processor mark with the name under it, plus the collapse control, always on screen */}
        <div className="side-head">
          <button type="button" className="cpu-core" onClick={() => scrollTo(navLinks[0].href)} aria-label="Back to the top">
            <CpuCore />
          </button>
          {!collapsed && <span className="side-name">Kushal H J</span>}
          {!isMobile && (
            <button
              type="button"
              className="side-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size="1.05rem" /> : <PanelLeftClose size="1.05rem" />}
            </button>
          )}
        </div>

        {/* Nav links: scrolls on very short screens instead of pushing anything off */}
        <ul className="side-list">
          {navLinks.map((link, i) => {
            const Icon = ICONS[i];
            const isact = activeSection === sectionId(link.href);
            return (
              <li key={link.href}>
                <button
                  type="button"
                  className="side-link"
                  onClick={() => scrollTo(link.href)}
                  title={collapsed ? link.label : undefined}
                  aria-label={link.label}
                  aria-current={isact ? 'true' : undefined}
                >
                  <Icon size="0.95rem" style={{ flexShrink: 0 }} />
                  {!collapsed && <span>{link.label}</span>}
                  {!collapsed && isact && <ChevronRight size="0.75rem" style={{ marginLeft: 'auto' }} />}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[90] md:hidden"
          style={{ background: 'rgba(3,8,16,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}
