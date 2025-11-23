# Changelog

Alle belangrijke wijzigingen aan deze wishlist-app.

## 2025-11-23

- Eerste versie van de React + TypeScript wishlist-app opgezet met Vite.
- Wishlist functionaliteit:
  - Items toevoegen met URL, naam, prijs, deadline en notitie.
  - Automatisch `createdAt` en toggle van `completed` + `completedAt`.
  - Opslag in `localStorage`.
- UI:
  - Gradient header "Onze Wishlist".
  - Formulierkaart en responsieve cards voor items.

### URL- en formulierverbeteringen

- Automatische titelsuggestie op basis van product-URL (slug). 
- Slimmere titels: max. 4 woorden, verwijdert webshopnaam en maat-aanduidingen.
- Formulier herschikt: URL bovenaan, daaronder Naam / Prijs / Deadline, notitie eronder.
- Thumbnail per item op basis van favicon of placeholder-letter.

### Categorieën en router

- `Category`-type toegevoegd: `keuken`, `badkamer`, `woonkamer`, `gadgets`, `kleding`, `overig`.
- `WishlistItem` uitgebreid met o.a. `category`, `originalPrice`, `currentPrice`, `priceHistory`, `notifyOnDrop`.
- Bestaande `localStorage`-data backwards compatible geladen (default `category = "overig"`).
- Categorie-suggestie op basis van titel/URL (keuken, badkamer, woonkamer, gadgets, kleding).
- React Router toegevoegd met:
  - Home (`/`): formulier + meest recente items.
  - Categorie-pagina (`/categorie/:category`): items per categorie.
- Navigatiebalk met links naar alle categorieën.

### UI-updates

- Categorie-badge in de item-cards.
- Actieknoppen omgebouwd naar tabs ("Voltooid" en rood `x`-tab) boven de card.
- Kaarten klikbaar gemaakt:
  - Klik op card opent de product-URL in nieuw tabblad.
  - Paarse glow bij click.
- URL niet meer zichtbaar, maar naam van de webshop (`Webshop: ...`).
