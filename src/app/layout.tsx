import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/auth/convex-client-provider";
import { isConvexConfigured } from "@/lib/env";
import "./globals.css";

const sans = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-familjen",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "HarmonyLabs",
    template: "%s · HarmonyLabs",
  },
  description:
    "Measure facial geometry from front and profile photographs using landmarks, ratios, and a transparent reference score.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const app = (
    <html lang="en" className={`${sans.variable} ${mono.variable} h-full`} data-scroll-behavior="smooth">
      <body className="min-h-full antialiased">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
  if (!isConvexConfigured()) return app;
  return <ConvexAuthNextjsServerProvider>{app}</ConvexAuthNextjsServerProvider>;
}
