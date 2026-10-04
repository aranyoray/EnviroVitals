import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EnviroVitals — community CKM health",
  description: "Explore cardiovascular, kidney, and metabolic prevalence with local air and drinking-water context, plus a deterministic household action checklist.",
  applicationName: "EnviroVitals",
  manifest: "/manifest.webmanifest",
  keywords: ["community health", "CKM", "cardiovascular", "kidney", "metabolic", "air quality", "drinking water", "ZIP code"],
  openGraph: {
    title: "EnviroVitals — community CKM health",
    description: "A ZIP-level view of CKM prevalence, nearby air and drinking-water data, and practical actions.",
    type: "website",
    siteName: "EnviroVitals",
  },
  formatDetection: { telephone: false, address: false, email: false },
  category: "health",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f2f4ef" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
