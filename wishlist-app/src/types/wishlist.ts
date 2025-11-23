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
  id: string;          // unieke ID, bijv. via crypto.randomUUID()
  title: string;       // naam van het product
  url: string;         // link naar de website
  price?: number;      // optioneel, in euro (huidige ingevoerde prijs)
  note?: string;       // optionele notitie
  deadline?: string;   // optioneel, ISO string "YYYY-MM-DD"
  createdAt: string;   // ISO datum/tijd string
  completed: boolean;  // voltooid ja/nee
  completedAt?: string; // ISO datum/tijd string wanneer voltooid

  // Thumbnail/icon voor snelle herkenning
  thumbnailUrl?: string; // optioneel, URL naar een kleine afbeelding/icon voor het item

  // Nieuw: categorie en prijs-tracker velden
  category: Category;
  originalPrice?: number;
  currentPrice?: number;
  priceHistory?: PriceHistoryEntry[];
  lastPriceCheckAt?: string;
  notifyOnDrop?: boolean;
};

// TODO: Phase 2 - uitbreiding voor user accounts
// export type User = {
//   id: string;
//   name: string;
//   email: string;
// };

// TODO: Phase 2 - categorieën/tags
// export type Category = "electronics" | "clothing" | "books" | "home" | "other";

// TODO: Phase 2 - prioriteit levels
// export type Priority = "low" | "medium" | "high";
