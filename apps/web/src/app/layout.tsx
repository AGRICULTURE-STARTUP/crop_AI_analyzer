import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const body = Roboto({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "AgriScan — Empowering Farmers",
  description:
    "Take a photo of a sick plant to get treatment advice in English or Kiswahili, connect with buyers, and build a Farm Health Score.",
  icons: {
    icon: "/images/agriscan_favicon.png",
  },
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
