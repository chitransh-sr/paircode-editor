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
      className={`${inter.variable} ${jetBrainsMono.variable} ${ibmPlexSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the stored/OS theme before hydration so day/night mode
            covers the whole site with no flash. Mirrors useTheme logic.
            Plain <script> in <head> — next/script with beforeInteractive
            cannot be a direct child of <html>. */}
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}`,
          }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground font-sans transition-colors duration-150"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
