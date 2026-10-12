import type { Metadata } from "next";
import { Montserrat, Poppins } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

// Poppins carries the whole interface; Montserrat is reserved for large
// headlines and the wordmark on public pages.
const ui = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const display = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const siteUrl = "https://ukulimabora.co.ke";
const siteTitle = "Ukulima Bora — AI crop disease detection for Kenyan farmers";
const siteDescription =
  "Take a photo of a sick plant to get treatment advice in English or Kiswahili, connect with buyers, and build a Farm Health Score.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Ukulima Bora",
  },
  description: siteDescription,
  applicationName: "Ukulima Bora",
  keywords: [
    "Ukulima Bora",
    "crop disease detection",
    "plant disease AI",
    "Kenya farming",
    "maize disease",
    "tomato blight",
    "Kiswahili farm advice",
    "Farm Health Score",
    "agricultural technology Kenya",
  ],
  authors: [{ name: "Ukulima Bora", url: siteUrl }],
  creator: "Ukulima Bora",
  publisher: "Ukulima Bora",
  icons: {
    // PNGs generated from image 2 (same artwork, cropped to fill the icon box —
    // the raw SVG has large empty canvas so it looked tiny in browser tabs).
    icon: [
      { url: "/UkulimaBoraagritechlogo/favicon.ico", sizes: "48x48" },
      { url: "/UkulimaBoraagritechlogo/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/UkulimaBoraagritechlogo/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/UkulimaBoraagritechlogo/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/UkulimaBoraagritechlogo/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/UkulimaBoraagritechlogo/favicon.ico",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: siteUrl,
    siteName: "Ukulima Bora",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/images/ai_assistant.jpeg",
        width: 1200,
        height: 675,
        alt: "Farmer getting crop advice with Ukulima Bora",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/images/ai_assistant.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "agriculture",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        {/* Without JavaScript the scroll-reveal never runs, so show everything. */}
        <noscript>
          <style>{".reveal{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body className={`${ui.variable} ${display.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
