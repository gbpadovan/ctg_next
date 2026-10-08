import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Crypto to Gold (CTG) Terminal | Saylor to Schiff Momentum Indicator',
  description:
    'Advanced quantitative financial terminal tracking cryptocurrency purchasing power denominated in Gold, featuring 4-week Rate of Change (ROC) oscillators, automated buy/sell crossover signals, and high-performance TradingView visualizations.',
  keywords: [
    'Crypto to Gold',
    'CTG Indicator',
    'Saylor to Schiff',
    'ROC Oscillator',
    'TradingView Lightweight Charts',
    'PulseChain',
    'PulseX',
    'Bitcoin Gold Ratio',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased bg-[#070a12]`}
    >
      <body className="min-h-full bg-[#070a12] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
