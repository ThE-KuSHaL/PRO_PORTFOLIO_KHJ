// app/layout.tsx
import type { Metadata } from 'next';
import { Space_Grotesk } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kushal H J — Builder, IoT Engineer, Entrepreneur',
  description:
    'Portfolio of Kushal H J — AI-powered systems, IoT platforms, and funded ventures built at the intersection of hardware and cloud.',
  keywords: ['IoT', 'AI', 'entrepreneur', 'QUIRK TECHNOLOGIES', 'VVCE', 'portfolio'],
  openGraph: {
    title: 'Kushal H J — Builder, IoT Engineer, Entrepreneur',
    description: 'AI-powered systems, IoT platforms, funded ventures.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className={`bg-bg text-tx antialiased overflow-x-hidden`}>
        {children}
      </body>
    </html>
  );
}
