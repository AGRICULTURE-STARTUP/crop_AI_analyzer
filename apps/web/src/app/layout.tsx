import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const body = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const siteUrl = "https://agriscan.co.ke";
const siteTitle = "AgriScan — AI crop disease detection for Kenyan farmers";
const siteDescription =
  "Take a photo of a sick plant to get treatment advice in English or Kiswahili, connect with buyers, and build a Farm Health Score.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | AgriScan",
  },
  description: siteDescription,
  applicationName: "AgriScan",
  keywords: [
    "AgriScan",
    "crop disease detection",
    "plant disease AI",
    "Kenya farming",
    "maize disease",
    "tomato blight",
    "Kiswahili farm advice",
    "Farm Health Score",
    "agricultural technology Kenya",
  ],
  authors: [{ name: "AgriScan", url: siteUrl }],
  creator: "AgriScan",
  publisher: "AgriScan",
  icons: {
    icon: "/images/agriscan_favicon.png",
    apple: "/images/agriscan_favicon.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: siteUrl,
    siteName: "AgriScan",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/images/ai_assistant.jpeg",
        width: 1200,
        height: 675,
        alt: "Farmer getting crop advice with AgriScan",
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
    <html lang="en">
      <body className={`${body.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
