import './globals.css';
import type { Metadata } from 'next';
import LenisProvider from '@/lib/animate/LenisProvider';

export const metadata: Metadata = {
  title: "Hellens Editions | Winter '26",
  description: 'A new world of commerce. 150+ product updates.',
  openGraph: {
    title: "Hellens Editions | Winter '26",
    description: 'A new world of commerce. 150+ product updates.',
    siteName: 'Hellens',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
