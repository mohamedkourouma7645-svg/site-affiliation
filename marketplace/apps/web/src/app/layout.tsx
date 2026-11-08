import type { Metadata, Viewport } from "next";
import { DEFAULT_LOCALE, t } from "@app/core";
import { Footer, Header } from "@/components/SiteChrome";
import { BRAND_NAME } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${BRAND_NAME} – Essen bestellen & selbst zusammenstellen`, template: `%s · ${BRAND_NAME}` },
  description: t(DEFAULT_LOCALE, "app.tagline"),
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#C2410C" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = DEFAULT_LOCALE;
  return (
    <html lang={locale}>
      <body>
        <a href="#main" className="skip-link">{t(locale, "nav.skip")}</a>
        <Header />
        <main id="main">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
