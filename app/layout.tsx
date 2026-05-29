import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MONK AI — Turn Any Idea Into a Company",
  description:
    "MONK AI is a universal autonomous startup execution engine. From idea to company in minutes — assembles your team, builds your startup document, and coordinates all departments in parallel.",
  keywords: ["AI startup builder", "startup generator", "autonomous AI", "startup execution", "multi-agent AI", "startup document", "PRD generator"],
  openGraph: {
    title: "MONK AI — Turn Any Idea Into a Company",
    description: "Universal autonomous startup execution engine. Assembles teams, builds documents, coordinates departments, delivers working outputs.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
