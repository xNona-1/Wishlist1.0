export async function scrapeUrl(url: string): Promise<{
  title: string | null;
  image: string | null;
  price: number | null;
}> {
  try {
    const response = await fetch(
      `https://wishlist-backend-7t1r.onrender.com/scrape?url=${encodeURIComponent(url)}` 
    );

    if (!response.ok) throw new Error("Backend niet bereikbaar");

    const data = await response.json();
    return {
      title: data.title ?? null,
      image: data.image ?? null,
      price: data.price ?? null,
    };
  } catch {
    return { title: null, image: null, price: null };
  }
}
