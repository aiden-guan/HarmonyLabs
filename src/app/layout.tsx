import type { Metadata } from "next";
import { Familjen_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sans = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-familjen",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: {
    default: "FaceLab",
    template: "%s · FaceLab",
  },
  description:
    "Measure facial geometry from front and profile photographs using landmarks, ratios, and a transparent reference score.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`} data-scroll-behavior="smooth">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
