# Wishlist-app

Een eenvoudige, uitbreidbare wishlist-webapplicatie gebouwd met **React + TypeScript + Vite**.

## Functionaliteit (huidige versie)

- Wishlist items met:
  - URL van het product
  - Naam
  - Prijs (optioneel)
  - Deadline (optioneel, datumselector)
  - Notitie (optioneel)
- Automatisch:
  - `createdAt` (toevoegdatum)
  - `completed` + `completedAt` bij voltooien
- Persistente opslag in `localStorage`.
- Automatische titelsuggestie uit de URL (slug), ingekort tot max. 4 woorden.
- Automatische categorie-suggestie op basis van titel/URL (keuken, badkamer, woonkamer, gadgets, kleding, overig).
- Thumbnail/icon op basis van favicon van de webshop of een letter-placeholder.
- Categorie-badge in elke card.
- Klikbare kaarten:
  - Klik op een item-card opent de product-URL in een nieuw tabblad.
  - URL zelf wordt niet getoond; i.p.v. daarvan de naam van de webshop.
  - Tabs boven de kaart voor **Voltooid** en **Verwijderen**.
- Meerdere pagina's met React Router:
  - `/` – Home: formulier + meest recente items.
  - `/categorie/:category` – lijst met items in één categorie.

## Installatie

Vereisten:

- Node.js 18+ en npm

Installeer dependencies:\r

```bash
npm install
```

(Indien nodig handmatig geïnstalleerd: `react`, `react-dom`, `react-router-dom`, `@types/react`, `@types/react-dom`.)

## Development server starten

### Via npm

```bash
npm run dev
```

Vite toont in de terminal een URL zoals `http://localhost:5173/`. Open die URL in de browser.

### Via `startserver.bat`

Op Windows kun je in de Verkenner dubbelklikken op:

```text
startserver.bat
```

Dit script:

- gaat naar de map `wishlist-app`
- voert `npm run dev` uit

### Server stoppen

- Ga naar het terminalvenster waarin `npm run dev` draait.
- Druk `Ctrl + C` en bevestig (Y) om de server te stoppen.

Als geheugensteuntje is er ook een `closeserver.bat` die uitlegt hoe je dit doet, maar die stopt de server niet automatisch (om geen andere Node-processen te verstoren).

## Projectstructuur (globaal)

- `src/App.tsx` – hoofdcomponent met:
  - laden/bewaren in `localStorage`
  - formulier voor nieuwe items
  - weergave van lijsten (home + categoriepagina)
- `src/types/wishlist.ts` – TypeScript-typen (`WishlistItem`, `Category`, `PriceHistoryEntry`).
- `src/styles/App.css` – styling van de volledige app.
- `src/main.tsx` – entrypoint, mount React in `#root` en wrapt met `BrowserRouter`.

Meer details over de architectuur staan in `architecture.md`.

## Toekomstige uitbreidingen

- Echte prijs-tracker (backend of externe API) op basis van `priceHistory`.
- User accounts en gedeelde wishlists.
- Meer geavanceerde filters en sortering per categorie.
