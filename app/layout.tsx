import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'n8n to Lamatic Migration Tool - Convert Workflows Instantly',
  description: 'Seamlessly migrate your n8n workflows to Lamatic with intelligent node mapping, dependency resolution, and instant conversion. Free migration tool for automation workflows.',
  keywords: ['n8n', 'lamatic', 'migration', 'workflow automation', 'n8n to lamatic', 'workflow converter', 'automation migration', 'node mapping', 'workflow migration tool'],
  authors: [{ name: 'Lamatic AI' }],
  openGraph: {
    title: 'n8n to Lamatic Migration Tool - Convert Workflows Instantly',
    description: 'Seamlessly migrate your n8n workflows to Lamatic with intelligent node mapping and instant conversion',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
