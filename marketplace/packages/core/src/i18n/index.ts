import de from "./messages/de.json";
import en from "./messages/en.json";
import fr from "./messages/fr.json";

export const LOCALES = ["de", "en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "de";

export type Messages = typeof de;
export type MessageKey = keyof Messages;

const catalogs: Record<Locale, Messages> = { de, en, fr };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Translate with `{name}` placeholders. Falls back to German, then to the key. */
export function t(locale: Locale, key: MessageKey, params: Record<string, string | number> = {}): string {
  const template = catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export function messages(locale: Locale): Messages {
  return catalogs[locale];
}
