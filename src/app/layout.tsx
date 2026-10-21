import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Sitisbooks · Dona un libro, recibe otro",
  description: "Intercambia libros en Lima: por cada libro que donas ganas 1 crédito para pedir otro.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" />
      </head>
      <body>
        <Header />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
