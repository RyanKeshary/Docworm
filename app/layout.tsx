import type { Metadata } from 'next';
import '../src/index.css';
import { Providers } from './providers';


export const metadata: Metadata = {
  title: 'Docworm - Digital Permission and Task System',
  description: 'Digital Institutional Permission, Approval, and Task System',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
