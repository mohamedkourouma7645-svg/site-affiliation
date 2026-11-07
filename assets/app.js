const grille = document.getElementById("grille");
const filtres = document.getElementById("filtres");
const recherche = document.getElementById("recherche");
let categorieActive = "Alle";

const lien = p => p.lien ||
  "https://www.amazon.de/s?k=" + encodeURIComponent(p.suche) + "&tag=" + AMAZON_TAG;

function afficher() {
  const q = recherche.value.toLowerCase();
  const liste = PRODUITS.filter(p =>
    (categorieActive === "Alle" || p.categorie === categorieActive) &&
    (p.nom + " " + p.description).toLowerCase().includes(q)
  );
  grille.innerHTML = liste.length ? liste.map(p => `
    <article class="carte">
      <img src="${p.image}" alt="${p.nom}" loading="lazy">
      <div class="contenu">
        <span class="badge">${p.categorie}</span>
        <h3>${p.nom}</h3>
        <p>${p.description}</p>
        <div class="bas">
          <a class="bouton" href="${lien(p)}" target="_blank" rel="nofollow sponsored noopener">Auf Amazon ansehen*</a>
        </div>
      </div>
    </article>`).join("") : "<p>Keine Produkte gefunden.</p>";
}

const categories = ["Alle", ...new Set(PRODUITS.map(p => p.categorie))];
filtres.innerHTML = categories.map(c =>
  `<button class="filtre${c === "Alle" ? " actif" : ""}" data-c="${c}">${c}</button>`).join("");
filtres.addEventListener("click", e => {
  if (!e.target.dataset.c) return;
  categorieActive = e.target.dataset.c;
  filtres.querySelectorAll(".filtre").forEach(b => b.classList.toggle("actif", b === e.target));
  afficher();
});
recherche.addEventListener("input", afficher);
document.getElementById("annee").textContent = new Date().getFullYear();
afficher();
