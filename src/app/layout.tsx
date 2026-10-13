import type { Metadata } from "next";
import { Inter, JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PairCode - Technical Interviews",
  description: "A lightweight, real-time collaborative code editor designed specifically for technical interviews.",
  keywords: ["code editor", "interview", "collaborative", "real-time", "coding"],
  authors: [{ name: "PairCode" }],
  openGraph: {
    title: "PairCode - Technical Interviews",
    description: "Code collaboratively in real-time with support for 15+ languages.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      // Default to dark so SSR matches useTheme's initial 'dark' state.
      // Theme is corrected client-side after mount (see useTheme), and
      // suppressHydrationWarning silences the class mismatch for light users.
      // NOTE: No <script> / next/script here on purpose — a sync/defer script
      // as a direct child of <html> triggers hydration errors, so theme is
      // applied in an effect instead of a blocking script (no flash for dark).
      className={`${inter.variable} ${jetBrainsMono.variable} ${ibmPlexSans.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground font-sans transition-colors duration-150"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
