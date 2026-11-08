import Link from "next/link";
import { t, type Locale } from "@app/core";
import { BRAND_NAME } from "@/lib/brand";

export function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          <span className="logo-mark" aria-hidden="true">T</span>
          {BRAND_NAME}<span className="sr-only"> – Startseite</span>
        </Link>
      </div>
    </header>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="footer">
      <div className="container">
        <nav aria-label="Rechtliches">
          <Link href="/impressum">{t(locale, "footer.imprint")}</Link>
          <Link href="/datenschutz">{t(locale, "footer.privacy")}</Link>
          <Link href="/agb">{t(locale, "footer.terms")}</Link>
        </nav>
        <p>Alle Preise inkl. MwSt.</p>
      </div>
    </footer>
  );
}
