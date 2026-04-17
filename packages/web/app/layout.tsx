import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SURVIVORS — 888 on Ethereum",
  description:
    "A selected order shaped by collapse, signal, and endurance. When every NFT died, we lived.",
  openGraph: {
    title: "SURVIVORS",
    description: "When every NFT died, we lived. 888 on Ethereum.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SURVIVORS",
    description: "When every NFT died, we lived. 888 on Ethereum.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
