# Architectuur van de wishlist-app

Dit document beschrijft kort de structuur en belangrijkste keuzes van de wishlist-app.

## Stack

- **Frontend**: React 18 + TypeScript
- **Bundler/dev server**: Vite
- **Router**: React Router DOM
- **Opslag**: `localStorage` in de browser (geen backend)

## Belangrijkste bestanden

- `src/main.tsx`
  - Entrypoint van de app.
  - Mount `App` in het DOM-element `#root`.
  - Wrapt de app in `<BrowserRouter>` voor client-side routing.

- `src/App.tsx`
  - Centrale component met state `items: WishlistItem[]`.
  - Side-effects:
    - `useEffect` om items éénmalig uit `localStorage` te laden.
    - `useEffect` om items bij elke wijziging terug naar `localStorage` te schrijven.
  - Bevat:
    - Formuliercomponent `AddItemForm` voor nieuwe items.
    - Lijstcomponent `ItemList` voor het tonen van items.
    - Categorie-pagina `CategoryPage` die filtert op `item.category`.
  - Regelt de routering met `<Routes>` en `<Route>`:
    - `/` – home (formulier + recente items).
    - `/categorie/:category` – items binnen een categorie.

- `src/types/wishlist.ts`
  - `Category` type (`"keuken" | "badkamer" | ...`).
  - `PriceHistoryEntry` type voor toekomstige prijs-tracker.
  - `WishlistItem` type met alle velden (id, title, url, price, deadlines, category, prijsvelden, enz.).

- `src/styles/App.css`
  - Globale layout (max-width container, header, main).
  - Styling voor formulier, cards, tabs, categorie-badges en responsive gedrag.

## Data model

`WishlistItem` (vereenvoudigd):

- Identiteit & basisinfo:
  - `id: string`
  - `title: string`
  - `url: string`
  - `thumbnailUrl?: string`
- Status & tijd:
  - `createdAt: string`
  - `completed: boolean`
  - `completedAt?: string`
- Inhoud:
  - `price?: number`
  - `note?: string`
  - `deadline?: string`
- Categorie & prijs-tracker:
  - `category: Category`
  - `originalPrice?: number`
  - `currentPrice?: number`
  - `priceHistory?: PriceHistoryEntry[]`
  - `lastPriceCheckAt?: string`
  - `notifyOnDrop?: boolean`

De data wordt als array van `WishlistItem` in `localStorage` opgeslagen onder de key `"wishlist"`.

## Control flow

### Laden

1. Bij eerste render leest `App` de string uit `localStorage.getItem("wishlist")`.
2. Indien aanwezig, wordt de JSON geparsed.
3. Er wordt gecontroleerd of de waarde een array is.
4. Elk item wordt omgezet naar een volledig `WishlistItem` met defaults (o.a. `category = "overig"` als geen categorie aanwezig is).

### Schrijven

- Telkens als `items` wijzigt, schrijft een `useEffect` de volledige array terug naar `localStorage`.

### Formulier en categoriesuggestie

- `AddItemForm` houdt lokaal formulierstate bij (`title`, `url`, `price`, `deadline`, `note`, `category`).
- Bij wijziging van `url` of `title`:
  - Wordt een titelsuggestie gedaan uit de URL (slug).
  - Wordt (zolang de gebruiker `category` niet veranderd heeft) een categorie gesuggereerd op basis van trefwoorden in titel/URL.
- Bij submit:
  - Wordt `suggestCategory` opnieuw aangeroepen.
  - Als de dropdown nog op `overig` staat, wordt de suggestie gebruikt (anders de handmatige keuze).
  - `App` voegt een nieuw `WishlistItem` toe met gegenereerde `id`, `createdAt` en initiale prijsvelden.

### Weergave en interactie

- `ItemList` rendert de lijst met cards.
- Elke card:
  - Heeft een thumbnail met favicon/placeholder.
  - Toont titel, categorie-badge, webshopnaam, prijs, deadline, notitie en datums.
  - Is volledig klikbaar: open de URL in een nieuw tabblad.
  - Heeft tabs voor status (voltooid/ongedaan) en verwijderen; deze stoppen de click-bubbel zodat de card zelf niet navigeert.

## Uitbreidbaarheid

De app is bewust simpel gehouden, maar voorbereid op:

- Een backend/API die actuele prijzen ophaalt op basis van `url` en `priceHistory` bijwerkt.
- Notificaties bij prijsdalingen (`notifyOnDrop`).
- User accounts en gedeelde wishlists (aparte userlaag bovenop `WishlistItem`).

Dit document is bedoeld als startpunt; toekomstige iteraties kunnen hier meer details aan toevoegen (bijv. exacte router-structuur, statusmanagement beyond `useState`, of backend-API-contracten).
