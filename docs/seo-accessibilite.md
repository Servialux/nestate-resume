# Référencement et accessibilité — 27 septembre 2026

## Objectif

Faire identifier le site comme le portfolio officiel d’Alexandre Ambiehl, développeur PHP/Symfony et architecte logiciel basé à Montpellier, et rendre explicite son intérêt pour les projets web et IA en France et en full remote. Aucun classement n’est garanti, même sur le nom : Google décide de l’indexation, du titre affiché et du classement.

## État de la production après la fusion

La version `main` publiée le 27 septembre active les pages du portfolio et du blog. La production a été migrée du site statique au serveur Node 22, avec un volume `/data` distinct de celui de recette, `SITE_URL=https://nestate.site` et `ORIGIN=https://nestate.site`.

Vérifications HTTP : accueil indexable, canonical `https://nestate.site/`, robots autorisant l’exploration et annonçant le sitemap, sitemap contenant l’accueil et le blog. Les articles publiés sont ajoutés automatiquement ; les brouillons et pages privées sont exclus. Le compte auteur de production reste à provisionner séparément : les identifiants et données de recette ne sont pas copiés.

## Passe sur develop

- Titre : « Alexandre Ambiehl — Développeur PHP/Symfony à Montpellier ».
- Description dédiée, courte, avec nom, expertise, localisation et full remote ; introduction visible et préférence géographique dans le contact.
- Données structurées `WebSite` et `ProfilePage` / `Person` : même identifiant d’auteur dans le portfolio et le blog, portrait, localisation à Montpellier et lien LinkedIn. Aucun avis, adresse commerciale, statut freelance ou certification inventé.
- Nom d’auteur des articles relié au portfolio, avec un lien souligné.
- Portrait WebP adaptatif : 51 160 octets à 480 px et 125 336 octets à 960 px, contre 462 054 octets pour le JPEG original conservé. Dimensions intrinsèques, priorité de chargement, texte alternatif conservés. Régénération : `node scripts/optimize-portrait.mjs`.
- Polices WOFF2 locales, avec `font-display: swap` et licences OFL incluses. Plus d’appel visiteur à Google Fonts.
- Boutons d’impression et de thème désactivés jusqu’à l’initialisation JavaScript pour éviter les clics sans effet pendant le chargement.
- Recette maintenue en `noindex` ; elle ne doit pas concurrencer le domaine public. Les changements SEO de develop n’amélioreront la production qu’après leur prochaine fusion et publication sur main.

## Vérification

Les tests couvrent les métadonnées sans JavaScript, le lien entre identité et profil LinkedIn, les canonicals, l’exclusion des pages privées, le portrait adaptatif, les polices locales, le clavier, les thèmes clair/sombre et le reflow à 320 px. Axe vérifie les règles WCAG A/AA automatisables sur le portfolio, le blog et l’espace auteur. Cela ne constitue pas une certification WCAG ou RGAA.

Chromium bureau/mobile et WebKit iPhone sont utilisés pour la validation. Firefox ne démarre pas sur cette machine (« Could not find profile folder »), y compris avec un autre répertoire temporaire : aucune conformité Firefox ne peut être déduite de cette exécution.

## Actions dans Google après publication de la passe SEO

Ces actions nécessitent l’accès du propriétaire à Search Console ; aucune soumission n’a été effectuée dans cette passe.

1. Ajouter ou ouvrir la propriété `nestate.site` dans [Google Search Console](https://search.google.com/search-console). Valider la propriété de domaine via le TXT DNS fourni par Google, ou utiliser une propriété préfixe d’URL `https://nestate.site/` avec une méthode de validation adaptée.
2. Envoyer `https://nestate.site/sitemap.xml` dans « Sitemaps ».
3. Inspecter `https://nestate.site/`, contrôler le test en direct puis demander son indexation. Faire de même pour les vrais articles importants. Les demandes répétées n’accélèrent pas nécessairement le traitement.
4. Consulter « Indexation des pages » pour détecter les exclusions et « Performances » pour suivre les impressions et clics sur `Alexandre Ambiehl`, `Ambiehl Alexandre`, puis les recherches pertinentes autour de PHP/Symfony, Montpellier et du travail à distance. Filtrer par France et comparer des périodes de même durée.
5. Vérifier que le profil LinkedIn comporte un lien vers `https://nestate.site/` et le même nom public. Ajouter ce lien dans les profils professionnels réellement utilisés ; pas d’achat ni de création massive de liens.
6. Publier des retours techniques originaux sur des réalisations partageables : choix d’architecture Symfony, agents IA, qualité du code, résultats concrets et limites. Chaque article doit aider un lecteur, sans divulguer les clients confidentiels. Le nom seul et les données structurées ne suffisent pas à gagner les requêtes génériques très concurrentielles.

## Références officielles

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Données structurées ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
- [Nom du site et WebSite](https://developers.google.com/search/docs/appearance/site-names)
- [Liens explorables et libellés descriptifs](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Règles contre le bourrage de mots-clés et le spam de liens](https://developers.google.com/search/docs/essentials/spam-policies)
