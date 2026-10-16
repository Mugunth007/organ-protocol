import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OrganProtocol — Anti-Corruption Organ Allocation with Cold-Ischemia TTL',
  description: 'Decentralized cadaveric organ allocation and biological cold ischemia decay protocol built on Arkiv Tiramisu Testnet for the Road to Devcon 8 Hackathon.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#030712] text-neutral-100 min-h-screen selection:bg-emerald-500/30 selection:text-emerald-300 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
