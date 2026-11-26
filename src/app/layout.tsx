import type { Metadata, Viewport } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} · ${SITE_TAGLINE} | Intercambio de libros en Lima`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["intercambio de libros", "donar libros", "libros usados Lima", "trueque de libros", "libros de segunda mano", "Lima", "Perú", "Sitisbooks"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website", locale: "es_PE", url: "/", siteName: SITE_NAME,
    title: `${SITE_NAME} · ${SITE_TAGLINE}`, description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} · ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#2F6BDB", width: "device-width", initialScale: 1 };

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
        <footer className="foot">
          <div className="wrap">
            <span>© {new Date().getFullYear()} Sitisbooks</span>
            <a href="/terminos">Términos y condiciones</a>
            <a href="/terminos#privacidad">Política de privacidad</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
