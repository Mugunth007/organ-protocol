import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OrganProtocol — Anti-Corruption Organ Allocation with Biological Cold-Ischemia TTL',
  description: 'Decentralized cadaveric organ allocation and cold ischemia decay protocol built on Arkiv Tiramisu Testnet for the Road to Devcon 8 Hackathon.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070b14] text-slate-100 min-h-screen selection:bg-emerald-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
