"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { t, type Locale } from "@app/core";

/**
 * Address entry + delivery/pickup switch. Submits to /restaurants.
 * Geolocation is optional and only requested after an explicit click.
 */
export function AddressSearch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [mode, setMode] = useState<"lieferung" | "abholung">("lieferung");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = address.trim();
    if (mode === "lieferung" && value.length < 3) {
      setError(t(locale, "home.addressRequired"));
      return;
    }
    setError(null);
    const params = new URLSearchParams({ modus: mode });
    if (value) params.set("adresse", value);
    router.push(`/restaurants?${params.toString()}`);
  }

  function useLocation() {
    if (!("geolocation" in navigator)) {
      setError(t(locale, "home.locationUnavailable"));
      return;
    }
    setStatus("…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Coordinates are rounded (~100 m) before leaving the device (data minimisation).
        setAddress(`${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`);
        setStatus(null);
        setError(null);
      },
      () => {
        setStatus(null);
        setError(t(locale, "home.locationUnavailable"));
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  return (
    <form className="search-card" onSubmit={submit} noValidate aria-label={t(locale, "home.search")}>
      <fieldset className="segmented">
        <legend className="sr-only">{t(locale, "home.deliveryOrPickup")}</legend>
        {(["lieferung", "abholung"] as const).map((m) => (
          <label key={m}>
            <input type="radio" name="modus" value={m} checked={mode === m} onChange={() => setMode(m)} />
            <span>{t(locale, m === "lieferung" ? "home.delivery" : "home.pickup")}</span>
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="address">{t(locale, "home.addressLabel")}</label>
        <input
          id="address"
          className="input"
          name="adresse"
          autoComplete="street-address"
          placeholder={t(locale, "home.addressPlaceholder")}
          value={address}
          maxLength={200}
          onChange={(e) => setAddress(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "address-error" : undefined}
        />
      </div>
      {error && <p id="address-error" className="error" role="alert">{error}</p>}
      {status && <p className="status" role="status">{status}</p>}
      <div className="row">
        <button type="submit" className="btn btn-primary">{t(locale, "home.search")}</button>
        <button type="button" className="btn btn-ghost" onClick={useLocation}>📍 {t(locale, "home.useLocation")}</button>
      </div>
    </form>
  );
}
