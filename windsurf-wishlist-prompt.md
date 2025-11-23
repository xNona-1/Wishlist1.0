Je bent een AI coding assistant in Windsurf. Je gaat een kleine maar uitbreidbare web-app bouwen: een gezamenlijke wishlist voor twee personen (ik en mijn vriend).

## Doel

Bouw een **single-page web-app** met **React + TypeScript** waarin we producten kunnen toevoegen aan een wishlist, met o.a.:

- handmatig toevoegen van items (titel, link, prijs, notitie, deadline)
- automatisch vastleggen van `datum toegevoegd`
- kunnen afvinken als voltooid, inclusief `datum voltooid`
- data opslaan in `localStorage` zodat de lijst blijft bestaan na refresh
- simpele, overzichtelijke UI die goed werkt op desktop én mobiel

Dit is **Phase 1 (MVP)**. Maak de code alvast zo gestructureerd dat we later eenvoudig Phase 2 en 3 kunnen toevoegen (login, categorieën, prioriteit, etc.).

---

## Tech stack & setup

- Gebruik **React + TypeScript**.
- Gebruik bij voorkeur **Vite** (React + TS template) of een vergelijkbare moderne setup.
- Zorg voor een duidelijke mappenstructuur, bijvoorbeeld:

  - `src/components/`
  - `src/types/`
  - `src/hooks/` (optioneel)
  - `src/styles/` of een enkele `App.css`

- Styling mag simpel zijn (basis CSS), maar:
  - Gebruik een lichte, rustige layout.
  - Maak het **mobile friendly** (form en lijst goed leesbaar op mobiel).

---

## Data model

Definieer in `src/types/wishlist.ts` (of vergelijkbaar) een TypeScript type voor een wishlist item:

```ts
export type WishlistItem = {
  id: string;          // unieke ID, bijv. via crypto.randomUUID()
  title: string;       // naam van het product
  url: string;         // link naar de website
  price?: number;      // optioneel, in euro
  note?: string;       // optionele notitie
  deadline?: string;   // optioneel, ISO string "YYYY-MM-DD"
  createdAt: string;   // ISO datum/tijd string
  completed: boolean;  // voltooid ja/nee
  completedAt?: string; // ISO datum/tijd string wanneer voltooid
};
```

---

## Functionaliteit Phase 1 (MVP)

### 1. Wishlist state

- Beheer de lijst met items in React state, bijvoorbeeld in `App.tsx`:

  ```ts
  const [items, setItems] = useState<WishlistItem[]>([]);
  ```

- Implementeer helpers om:
  - een nieuw item toe te voegen
  - een item te togglen tussen `completed = true/false`
  - bij `completed = true` → `completedAt` invullen met `new Date().toISOString()`
  - bij `completed = false` → `completedAt` leegmaken (undefined)

### 2. Formulier om item toe te voegen

Maak bovenaan de pagina een formulier met de volgende velden:

- **Titel** (required)
- **URL** (required)
- **Prijs** (optioneel, number)
- **Deadline** (optioneel, type `date`)
- **Notitie** (optioneel, textarea)

Bij submit:

1. Valideer minimaal dat titel en URL zijn ingevuld.
2. Maak een nieuw `WishlistItem` object:
   - `id`: unieke ID
   - `createdAt`: `new Date().toISOString()`
   - `completed`: `false`
3. Voeg dit toe aan de bestaande `items` state.

Na succesvol toevoegen:

- Formulier leegmaken.
- Eventueel een subtiele bevestiging (bijv. een kleine tekst “Item toegevoegd”).

### 3. Lijstweergave

Onder het formulier:

- Render alle wishlist items in een nette lijst, bij voorkeur in **cards**.
- Toon per item:
  - Titel (prominent)
  - Klikbare URL (open in nieuw tabblad)
  - Prijs (indien aanwezig, netjes geformatteerd, bijv. `€ 49,99`)
  - Deadline (indien aanwezig, in leesbaar formaat, bijv. `24-12-2025`)
  - Notitie (indien aanwezig)
  - Datum toegevoegd (formatted)
  - Checkbox of knop: “Voltooid” / “Markeer als voltooid”

Gedrag checkbox/knop:

- Bij togglen:
  - `completed` wisselen tussen `true` en `false`.
  - Als `true` wordt gezet → `completedAt = new Date().toISOString()`.
  - Als `false` wordt gezet → `completedAt = undefined`.

Visuele feedback:

- Voltooide items mogen visueel verschillen:
  - bijv. lichte grijstint, doorstreepte titel, of een klein label “Voltooid op dd-mm-yyyy”.

### 4. Opslag in localStorage

Implementeer eenvoudige persistence met `localStorage`:

- Bij eerste render:
  - Lees `localStorage.getItem("wishlist")`.
  - Als er data is, parse de JSON en zet dit in `items` state.

- Bij elke verandering in `items`:
  - Schrijf de nieuwe waarde naar `localStorage` met `localStorage.setItem("wishlist", JSON.stringify(items))`.

Gebruik hiervoor `useEffect`:

```ts
useEffect(() => {
  const saved = localStorage.getItem("wishlist");
  if (saved) {
    setItems(JSON.parse(saved));
  }
}, []);

useEffect(() => {
  localStorage.setItem("wishlist", JSON.stringify(items));
}, [items]);
```

Zorg dat de types kloppen bij het parsen.

---

## UI/UX richtlijnen

- **Layout**
  - Bovenaan: titel van de app, bijv. “Onze Wishlist”.
  - Daarna: formulier om items toe te voegen.
  - Daaronder: lijst met items.

- **Form styling**
  - Velden onder elkaar op mobiel.
  - Op desktop mag je velden naast elkaar zetten waar logisch (bijv. titel + url + prijs op één rij).
  - Duidelijke labels en placeholder-teksten.

- **Lijst**
  - Gebruik cards met lichte border en wat padding.
  - Zet de titel bovenaan, andere info in kleinere tekst eronder.
  - Checkbox/knop rechts of onderaan de card.

- **Responsiveness**
  - Zorg dat de app op een telefoon goed bruikbaar is (geen horizontale scroll).
  - Minimale fontgrootte ~14–16px.

---

## Toekomstige uitbreidingen (alleen voorbereiden, nog niet bouwen)

Plaats op een paar plekken alvast **TODO-comments** in de code voor latere fases:

- Login / gebruikers:
  - Phase 2: eenvoudige auth om te kunnen inloggen als “Patricia” of “vriend”.
- Categorieën / tags:
  - Phase 2: extra veld `category` of `tags` aan `WishlistItem`.
- Prioriteit:
  - Phase 2: extra veld `priority: "low" | "medium" | "high"`.
- Filters en sorteren:
  - Phase 2: UI-elementen om te filteren op voltooid, prioriteit, categorie, etc.
- URL scraping:
  - Phase 3: op basis van geplakte URL automatisch titel, afbeelding en beschrijving ophalen.

Je hoeft deze features nu **nog niet** te implementeren, maar houd de code gestructureerd zodat we later eenvoudig kunnen uitbreiden.

---

## Wat ik nu van je wil als Windsurf assistant

1. **Maak of configureer een React + TypeScript project** (bijvoorbeeld met Vite).
2. **Implementeer de volledige Phase 1 functionaliteit** zoals hierboven beschreven:
   - TypeScript type voor `WishlistItem`.
   - State management voor de lijst.
   - Formulier voor nieuwe items.
   - Lijstweergave met voltooien / ongedaan maken.
   - localStorage persistence.
3. Zorg dat het project direct kan draaien met `npm install` en `npm run dev`.
4. Schrijf duidelijke comments waar nuttig, en gebruik nette, type-safe code.
5. Toon de volledige broncode van de belangrijkste bestanden (`main.tsx`, `App.tsx`, componenten, types, CSS) in je antwoord.

Gebruik best practices voor React + TypeScript en zorg dat de app meteen bruikbaar is als wishlist voor twee personen.
