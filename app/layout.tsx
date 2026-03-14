import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { PWARegister } from "@/components/pwa-register";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "ZircuVia",
  description: "Smart Circular Tourism Platform for Puerto Princesa City",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#2E7D32",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2E7D32" />
      </head>
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
