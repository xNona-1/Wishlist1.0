Je bent een AI coding assistant in Windsurf. Er bestaat al een werkende **React + TypeScript** wishlist web-app met:

- Een formulier om items toe te voegen (URL, naam, prijs, deadline, notitie).
- Een lijst met wishlist items.
- Velden zoals: `id`, `title`, `url`, `price`, `note`, `deadline`, `createdAt`, `completed`, `completedAt`.
- Opslag in `localStorage`.
- Een bestaande UI met een gradient header “Onze Wishlist”, formulierkaart en cards voor de items (zoals in de huidige code).

Ik wil dat je deze bestaande code **aanpast en uitbreidt**, niet volledig opnieuw opzet.

---

## Doel van deze iteratie

1. **Categorieën toevoegen** (keuken, badkamer, woonkamer, gadgets, kleding, overig)  
   - Elk item krijgt één categorie.
   - Bij het toevoegen van een item wordt automatisch een categorie-suggestie gedaan op basis van titel/URL.
   - De gebruiker kan de categorie aanpassen in een dropdown.

2. **Meerdere pagina’s op basis van categorie** met React Router  
   - **Homepagina (`/`)**: formulier + 4 tot 8 meest recent toegevoegde items.
   - **Categorie-pagina (`/categorie/:category`)**: lijst van items binnen één categorie.

3. **App voorbereiden op een toekomstige pricetracker**  
   - Datamodel uitbreiden met velden voor prijs-historie en notificaties.
   - Simpele weergave van “oorspronkelijke prijs”/“huidige prijs” in de UI.
   - TODO-comments toevoegen voor later, maar nog géén echte scraping of backend.

De UI-stijl moet zoveel mogelijk aansluiten bij wat er al is: clean, licht, met cards en de bestaande gradient-knoppen.

---

## Stap 1 – Types uitbreiden (WishlistItem + Category)

1. Zoek het TypeScript-type of interface voor een wishlist item (bijv. `WishlistItem`).
2. Voeg daar het volgende aan toe:

```ts
export type Category =
  | "keuken"
  | "badkamer"
  | "woonkamer"
  | "gadgets"
  | "kleding"
  | "overig";

export type PriceHistoryEntry = {
  date: string;   // ISO datum
  price: number;
};

export type WishlistItem = {
  id: string;
  title: string;
  url: string;
  price?: number;
  note?: string;
  deadline?: string;
  createdAt: string;
  completed: boolean;
  completedAt?: string;

  // NIEUW:
  category: Category;
  originalPrice?: number;
  currentPrice?: number;
  priceHistory?: PriceHistoryEntry[];
  lastPriceCheckAt?: string;
  notifyOnDrop?: boolean;
};
```

3. Zorg dat bestaande items uit `localStorage` nog steeds goed geladen worden:
   - Als `category` ontbreekt in oude data → standaard `"overig"` gebruiken.
   - `originalPrice` en `currentPrice` mogen optioneel blijven.

---

## Stap 2 – Categorie-suggestie functie

Maak een helperfunctie, bijvoorbeeld in een apart bestand `src/utils/category.ts` of in dezelfde file als de form-logica:

```ts
export function suggestCategory(title: string, url: string): Category {
  const lowerTitle = title.toLowerCase();
  const lowerUrl = url.toLowerCase();

  if (
    lowerUrl.includes("coolblue") ||
    lowerUrl.includes("mediamarkt") ||
    lowerTitle.includes("tv") ||
    lowerTitle.includes("laptop") ||
    lowerTitle.includes("monitor")
  ) {
    return "gadgets";
  }

  if (
    lowerTitle.includes("kast") ||
    lowerTitle.includes("bank") ||
    lowerTitle.includes("tafel") ||
    lowerTitle.includes("stoel")
  ) {
    return "woonkamer";
  }

  if (
    lowerTitle.includes("pan") ||
    lowerTitle.includes("pannen") ||
    lowerTitle.includes("servies") ||
    lowerTitle.includes("bestek") ||
    lowerTitle.includes("keuken")
  ) {
    return "keuken";
  }

  if (
    lowerTitle.includes("douche") ||
    lowerTitle.includes("handdoek") ||
    lowerTitle.includes("wc") ||
    lowerTitle.includes("badkamer")
  ) {
    return "badkamer";
  }

  if (
    lowerTitle.includes("shirt") ||
    lowerTitle.includes("broek") ||
    lowerTitle.includes("jurk") ||
    lowerTitle.includes("hoodie") ||
    lowerTitle.includes("kleding")
  ) {
    return "kleding";
  }

  return "overig";
}
```

Gebruik deze functie:

- Wanneer een nieuw item wordt aangemaakt:
  - Als de gebruiker nog geen categorie gekozen heeft, vul dan automatisch een default in met `suggestCategory(title, url)`.
- In het formulier:
  - Voeg een `<select>` of dropdown toe met alle categorieën.
  - Standaardwaarde = voorgestelde categorie.
  - De gebruiker kan deze handmatig wijzigen.

---

## Stap 3 – Formulier uitbreiden met categorie

1. In het formulier voor “Nieuw item toevoegen”:

   - Voeg een nieuw veld toe:
     - Label: **Categorie**
     - Type: select dropdown
     - Opties: Keuken, Badkamer, Woonkamer, Gadgets, Kleding, Overig
   - Zorg dat dit veld in state wordt bijgehouden (bijv. `category` state).

2. Bij het toevoegen van een item:

   - Gebruik de ingevulde of automatisch gesuggereerde categorie.
   - Stel `originalPrice` en `currentPrice` in op de ingevulde `price` (indien aanwezig).
   - Initialiseer `priceHistory` optioneel met één entry:
     ```ts
     priceHistory: price
       ? [{ date: new Date().toISOString(), price }]
       : [];
     ```

---

## Stap 4 – React Router toevoegen (meerdere pagina’s)

Gebruik **React Router v6** (of de versie die het best past bij de huidige setup).

1. Installeer indien nodig:

```bash
npm install react-router-dom
```

2. Pas `main.tsx` of de root-entrance aan zodat de app wordt gewrapt in `BrowserRouter`:

```tsx
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

3. In `App.tsx`:

   - Implementeer routes met `<Routes>` en `<Route>`:

```tsx
import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { CategoryPage } from "./pages/CategoryPage";
```

   - Maak een eenvoudige layoutcomponent met de bestaande header “Onze Wishlist” en daaronder de content (via `Outlet` of simpelweg boven de `Routes`).

   - Definieer routes:

```tsx
<Routes>
  <Route path="/" element={
    <HomePage
      items={items}
      onAddItem={handleAddItem}
      onToggleComplete={handleToggleComplete}
    />
  } />
  <Route path="/categorie/:category" element={
    <CategoryPage
      items={items}
      onToggleComplete={handleToggleComplete}
    />
  } />
</Routes>
```

> Je mag de props gerust anders structureren als dat beter past bij de huidige code.

4. Maak twee nieuwe componenten in `src/pages`:

### `HomePage`

- Bevat:
  - Het bestaande formulier “Nieuw item toevoegen”.
  - Een sectie “Wishlist items (laatste X)”:
    - Sorteer `items` aflopend op `createdAt`.
    - Toon alleen de **laatste 4 tot 8 items** (limiet 8).
- Onderaan een link / knop:
  - “Bekijk alle items per categorie” → links naar de categorie-pagina’s.

### `CategoryPage`

- Lees de categorie-parameter uit de URL met `useParams`.
- Filter `items` op `item.category === categoryParam`.
- Toon dezelfde kaartjes/styling als op de homepage, maar dan alleen voor die categorie.
- Bovenaan:
  - Titel: “Keuken”, “Badkamer”, etc.
- Eventueel: een toggle “Verberg voltooide items”.

5. Maak een eenvoudige **navigatie** (bijv. onder de header):

- Links of buttons naar:
  - Home (`/`)
  - `/categorie/keuken`
  - `/categorie/badkamer`
  - `/categorie/woonkamer`
  - `/categorie/gadgets`
  - `/categorie/kleding`
  - `/categorie/overig`

Houd de styling in lijn met de huidige UI (bijv. kleine tabs of simpele links).

---

## Stap 5 – UI-aanpassingen voor prijs en pricetracker-voorbereiding

1. In de item-cards:

   - Toon:
     - **Prijs** (zoals nu).
     - Indien `originalPrice` en `currentPrice` verschillen:
       - Geef visueel aan dat de prijs gedaald is, bijv.:
         - “Oorspronkelijke prijs: €X, huidige prijs: €Y”
         - Klein label: “In prijs verlaagd”.

2. Voeg een (optionele) checkbox toe per item:

   - Tekst: “Meld als prijs daalt”.
   - Bind deze aan `notifyOnDrop`.

3. Voeg duidelijke **TODO-comments** toe op plekken waar later backend/scraping moet komen, bijvoorbeeld:

```ts
// TODO: Hier later een request doen naar een backend service
// die de actuele prijs van deze URL ophaalt en `currentPrice` bijwerkt.

// TODO: Als `notifyOnDrop` true is en `currentPrice < originalPrice`,
// dan een notificatie (e-mail/push/in-app) tonen.
```

Er hoeft **nu nog geen echte price tracking** te werken; het doel is dat de structuur er al ligt.

---

## Stap 6 – Kleine UX/overzicht verbeteringen

- Voeg een simpele toggle boven de lijst toe, bijv. op zowel Home als Category pagina:
  - Checkbox: “Voltooide items verbergen”.
  - Wanneer aangevinkt: filter items met `completed === false`.
- Sorteer items standaard op:
  - Eerst niet-voltooide items, daarna voltooide items.
  - Binnen die groepen: sorteren op `createdAt` of `deadline`.

---

## Verwachting van de output

1. Pas de **bestaande codebase** aan volgens bovenstaande stappen.
2. Toon de relevante aangepaste bestanden:
   - `types` (waar `WishlistItem` staat).
   - `App.tsx`.
   - `main.tsx` of root file waar `BrowserRouter` wordt toegevoegd.
   - Nieuwe files: `HomePage`, `CategoryPage`, `category utils` en eventuele extra componenten.
3. Zorg dat:
   - De app compileert.
   - `localStorage` nog steeds gebruikt wordt om de wishlist op te slaan/laden.
   - De UI compatibel blijft met de huidige look & feel (gradient header, cards, grote paarse knoppen).
4. Schrijf nette, type-safe TypeScript code met waar nodig korte comments.

Gebruik best practices voor React + TypeScript en maak de wijzigingen zo dat ik ze makkelijk verder kan uitbouwen bij een volgende iteratie.
