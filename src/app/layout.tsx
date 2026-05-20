import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { getLanguage } from "@/lib/i18n";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Dosis Educa LMS",
  description: "Dosis de Esperanza Educa learning platform built with Next.js, Supabase, and Stripe."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = await getLanguage();

  return (
    <html lang={language}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
