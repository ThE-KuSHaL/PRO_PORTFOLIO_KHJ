'use client';
// components/layout/Sidebar.tsx
import { useEffect, useRef, useState } from 'react';
import { navLinks } from '@/lib/data';
import {
  Home, User, GraduationCap, Cpu, FolderOpen,
  Rocket, GitBranch, Mail, Menu, X, ChevronRight,
} from 'lucide-react';

const ICONS = [Home, User, GraduationCap, Cpu, FolderOpen, Rocket, GitBranch, Mail];

export default function Sidebar() {
  const [active, setActive] = useState('hero');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const obsRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    obsRef.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { threshold: 0.35 }
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
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: collapsed ? 'center' : 'flex-start',
          padding: '1.5rem 0',
          width: collapsed ? 60 : 200,
          background: 'rgba(3,8,16,0.85)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(99,102,241,0.1)',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s ease',
          transform: mobileOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)
            ? 'translateX(0)'
            : 'translateX(-100%)',
        }}
        className={`max-md:${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 mb-8 w-full">
          <div
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              border: '1.5px solid #06b6d4',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#06b6d4', flexShrink: 0,
            }}
          >
            KHJ
          </div>
          {!collapsed && (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
              Kushal H J
            </span>
          )}
        </div>

        {/* Nav links */}
        <ul className="flex flex-col gap-1 w-full px-2 flex-1">
          {navLinks.map((link, i) => {
            const Icon = ICONS[i];
            const isact = active === sectionId(link.href);
            return (
              <li key={link.href}>
                <button
                  onClick={() => scrollTo(link.href)}
                  title={collapsed ? link.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'none',
                    background: isact ? 'rgba(6,182,212,0.1)' : 'transparent',
                    color: isact ? '#06b6d4' : 'rgba(255,255,255,0.45)',
                    transition: 'background 0.2s, color 0.2s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isact) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isact) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {link.label}
                    </span>
                  )}
                  {!collapsed && isact && (
                    <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Collapse toggle — desktop only */}
        <button
          className="hidden md:flex"
          onClick={() => setCollapsed((c) => !c)}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            width: 28, height: 28,
            borderRadius: '50%',
            border: '1px solid rgba(99,102,241,0.3)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.4)',
            cursor: 'none',
            transition: 'all 0.2s',
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight size={12} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
        </button>
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
