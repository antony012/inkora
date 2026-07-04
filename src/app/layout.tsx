import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { Providers } from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inkora — Software para tatuadores y estudios",
  description:
    "Agenda, cotización inteligente, señas, consentimientos digitales, CRM y caja. La plataforma all-in-one para estudios de tatuaje.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <DeveloperCredit />
        </Providers>
      </body>
    </html>
  );
}
