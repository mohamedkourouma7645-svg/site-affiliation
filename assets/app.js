const grille = document.getElementById("grille");
const filtres = document.getElementById("filtres");
const recherche = document.getElementById("recherche");
let categorieActive = "Tout";

function afficher() {
  const q = recherche.value.toLowerCase();
  const liste = PRODUITS.filter(p =>
    (categorieActive === "Tout" || p.categorie === categorieActive) &&
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
          <strong>${p.prix}</strong>
          <a class="bouton" href="${p.lien}" target="_blank" rel="nofollow sponsored noopener">Voir l'offre</a>
        </div>
      </div>
    </article>`).join("") : "<p>Aucun produit trouvé.</p>";
}

const categories = ["Tout", ...new Set(PRODUITS.map(p => p.categorie))];
filtres.innerHTML = categories.map(c =>
  `<button class="filtre${c === "Tout" ? " actif" : ""}" data-c="${c}">${c}</button>`).join("");
filtres.addEventListener("click", e => {
  if (!e.target.dataset.c) return;
  categorieActive = e.target.dataset.c;
  filtres.querySelectorAll(".filtre").forEach(b => b.classList.toggle("actif", b === e.target));
  afficher();
});
recherche.addEventListener("input", afficher);
document.getElementById("annee").textContent = new Date().getFullYear();
afficher();
