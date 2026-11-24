// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { LITE_SCRIPT } from '@/lib/device';

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#030810',
};

export const metadata: Metadata = {
  title: "Know Kushal H J | Portfolio",
  description: "Official portfolio of Kushal H J. Projects, Resume, Skills, Experience and Contact.",
  keywords: [
    "Kushal H J",
    "Kushal H J Portfolio",
    "Kushal H J Resume",
    "Know Kushal H J",
    "Kushal H J Developer",
    "Kushal H J Mysuru"
  ],
  authors: [{ name: "Kushal H J" }],
  creator: "Kushal H J",
  metadataBase: new URL("https://pro-portfolio-khj-djwg.vercel.app"),
  openGraph: {
    title: "Know Kushal H J",
    description: "Official portfolio of Kushal H J",
    type: "website"
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plex.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LITE_SCRIPT }} />
      </head>
      <body className={`bg-bg text-tx antialiased overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}
