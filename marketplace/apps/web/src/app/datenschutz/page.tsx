import type { Metadata } from "next";

export const metadata: Metadata = { title: "Datenschutzerklärung", robots: { index: false } };

export default function Page() {
  return (
    <div className="container section">
      <h1>Datenschutzerklärung</h1>
      <p className="legal-draft" role="note">
        Entwurf – dieser Text fehlt noch und muss vor dem Start von einer Rechtsanwältin bzw. einem Rechtsanwalt
        erstellt oder geprüft werden. Die Plattform darf ohne vollständige Rechtstexte nicht öffentlich betrieben werden.
      </p>
    </div>
  );
}
