// components/ui/SectionLabel.tsx
// Intentionally renders nothing: each section's heading already names it, and the sidebar
// shows where you are. Kept as a component so existing imports stay valid.
interface SectionLabelProps {
  children: React.ReactNode;
  color?: string;
}

export default function SectionLabel(_props: SectionLabelProps) {
  return null;
}
