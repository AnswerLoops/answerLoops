import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteIdentityJsonLd } from '@/lib/site-identity'
import { jsonLdHtml } from '@/lib/marketing/json-ld'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://answerloops.com'),
  title: "AnswerLoops",
  description:
    "Agentic AI support for developer communities: AnswerLoops resolves repeat questions across Discord, Slack, Google Chat, GitHub, Telegram, email, and website chat. Open source, self-hosted, and MCP/API-ready.",
  openGraph: {
    type: 'website',
    siteName: 'AnswerLoops',
    title: 'AnswerLoops — Agentic support for developer communities',
    description:
      'Resolve repeat questions across every community channel with confidence-gated automation. Open source, self-hosted, and MCP/API-ready.',
    images: [
      {
        url: '/logo.png',
        width: 900,
        height: 900,
        alt: 'AnswerLoops logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'AnswerLoops — Agentic support for developer communities',
    description:
      'Resolve repeat questions across every community channel with confidence-gated automation. Open source, self-hosted, and MCP/API-ready.',
    images: ['/logo.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/icon.png', sizes: '512x512', type: 'image/png' },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground antialiased">
        {/* nosemgrep: typescript.react.security.audit.react-dangerouslysetinnerhtml.react-dangerouslysetinnerhtml */}
        {/* siteIdentityJsonLd is a static server-defined constant, never user input; jsonLdHtml escapes `<` so the payload can't break out of the script tag. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(siteIdentityJsonLd) }} />
        {children}
      </body>
    </html>
  );
}
