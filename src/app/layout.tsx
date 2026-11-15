import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OOS Industrial Procurement & Proposal Engine',
  description: 'High-density spreadsheet-speed industrial procurement and proposal engine for Brandreth Road & Pakistan markets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased select-none">
        {children}
      </body>
    </html>
  );
}
