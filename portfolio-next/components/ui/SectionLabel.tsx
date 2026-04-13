// components/ui/SectionLabel.tsx
interface SectionLabelProps {
  children: React.ReactNode;
  color?: string;
}

export default function SectionLabel({ children, color = '#06b6d4' }: SectionLabelProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color,
        marginBottom: '0.75rem',
      }}
    >
      <span style={{ width: 20, height: 1, background: color, opacity: 0.5, display: 'inline-block' }} />
      {children}
    </span>
  );
}
