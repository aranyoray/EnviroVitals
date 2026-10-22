import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "EnviroVitals — One Health CKM dashboard",
  description: "Live air quality, heat and weather alerts, drinking-water records and community cardiovascular-kidney-metabolic (CKM) estimates for any US ZIP, with value-specific steps for patients and households.",
  applicationName: "EnviroVitals",
  manifest: "/manifest.webmanifest",
  keywords: ["community health", "CKM", "cardiovascular", "kidney", "metabolic", "One Health", "air quality", "AQI", "heat", "drinking water", "PFAS", "ZIP code"],
  openGraph: {
    title: "EnviroVitals — One Health CKM dashboard",
    description: "A ZIP-level One Health view of CKM health: live AQI, heat and NWS alerts, drinking-water records, community prevalence, and steps that depend on today's values.",
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
