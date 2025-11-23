import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useParams } from 'react-router-dom'
import type { WishlistItem, Category } from './types/wishlist'
import './styles/App.css'

function App() {
  const [items, setItems] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem("wishlist")
    if (!saved) return []

    try {
      const parsed = JSON.parse(saved)

      if (!Array.isArray(parsed)) {
        console.warn("Wishlist data in localStorage is not an array, ignoring.")
        return []
      }

      const withDefaults: WishlistItem[] = parsed.map((raw: Partial<WishlistItem>) => {
        const category: Category = (raw as WishlistItem).category ?? "overig"

        const base: WishlistItem = {
          id: raw.id ?? crypto.randomUUID(),
          title: raw.title ?? "Onbekend item",
          url: raw.url ?? "",
          price: raw.price,
          note: raw.note,
          deadline: raw.deadline,
          createdAt: raw.createdAt ?? new Date().toISOString(),
          completed: raw.completed ?? false,
          completedAt: raw.completedAt,
          thumbnailUrl: (raw as WishlistItem).thumbnailUrl,
          category,
          originalPrice: (raw as WishlistItem).originalPrice ?? raw.price,
          currentPrice: (raw as WishlistItem).currentPrice ?? raw.price,
          priceHistory: (raw as WishlistItem).priceHistory,
          lastPriceCheckAt: (raw as WishlistItem).lastPriceCheckAt,
          notifyOnDrop: (raw as WishlistItem).notifyOnDrop ?? false,
        }

        // Initialiseer een eenvoudige priceHistory als die nog niet bestaat maar er wél een prijs is
        if (!base.priceHistory && typeof base.price === 'number') {
          base.priceHistory = [{ date: base.createdAt, price: base.price }]
        }

        return base
      })

      return withDefaults
    } catch (error) {
      console.error("Error loading wishlist from localStorage:", error)
      return []
    }
  })

  // Save items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("wishlist", JSON.stringify(items))
  }, [items])

  // Add new item
  const addItem = (item: Omit<WishlistItem, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => {
    const createdAt = new Date().toISOString()

    const newItem: WishlistItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt,
      completed: false,
      originalPrice: item.originalPrice ?? item.price,
      currentPrice: item.currentPrice ?? item.price,
      priceHistory: item.price
        ? [{ date: createdAt, price: item.price }]
        : item.priceHistory,
      lastPriceCheckAt: item.lastPriceCheckAt,
    }
    setItems((prev: WishlistItem[]) => [...prev, newItem])
  }

  // Toggle completed status
  const toggleCompleted = (id: string) => {
    setItems((prev: WishlistItem[]) => prev.map((item: WishlistItem) => {
      if (item.id === id) {
        return {
          ...item,
          completed: !item.completed,
          completedAt: !item.completed ? new Date().toISOString() : undefined
        }
      }
      return item
    }))
  }

  // Delete item
  const deleteItem = (id: string) => {
    setItems((prev: WishlistItem[]) =>
      prev.filter((item: WishlistItem) => item.id !== id),
    )
  }

  const recentItems = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8)

  return (
    <div className="app">
      <header className="app-header">
        <h1>Onze Wishlist</h1>
        <p>Deel je wensen met elkaar</p>

        <nav className="app-nav">
          <Link to="/" className="nav-link">Overzicht</Link>
          <Link to="/categorie/keuken" className="nav-link">Keuken</Link>
          <Link to="/categorie/badkamer" className="nav-link">Badkamer</Link>
          <Link to="/categorie/woonkamer" className="nav-link">Woonkamer</Link>
          <Link to="/categorie/gadgets" className="nav-link">Gadgets</Link>
          <Link to="/categorie/kleding" className="nav-link">Kleding</Link>
          <Link to="/categorie/overig" className="nav-link">Overig</Link>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <AddItemForm onAddItem={addItem} />
                <ItemList
                  items={recentItems}
                  onToggleCompleted={toggleCompleted}
                  onDeleteItem={deleteItem}
                  showCategory
                />
              </>
            }
          />
          <Route
            path="/categorie/:category"
            element={
              <CategoryPage
                items={items}
                onToggleCompleted={toggleCompleted}
                onDeleteItem={deleteItem}
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}

// Form component for adding new items
function AddItemForm({ onAddItem }: { onAddItem: (item: Omit<WishlistItem, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => void }) {
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    price: '',
    deadline: '',
    note: '',
    category: 'overig' as Category,
  })

  const suggestCategory = (title: string, url: string): Category => {
    const lowerTitle = title.toLowerCase()
    const lowerUrl = url.toLowerCase()

    // Badkamer-meubels eerst herkennen
    if (
      lowerTitle.includes('badkamer') ||
      lowerTitle.includes('badmeubel') ||
      lowerTitle.includes('badkamermeubel') ||
      lowerTitle.includes('wastafel') ||
      lowerTitle.includes('badkamerkast') ||
      lowerUrl.includes('bathroom')
    ) {
      return 'badkamer'
    }

    if (
      lowerUrl.includes('coolblue') ||
      lowerUrl.includes('mediamarkt') ||
      lowerTitle.includes('tv') ||
      lowerTitle.includes('laptop') ||
      lowerTitle.includes('monitor')
    ) {
      return 'gadgets'
    }

    // Woonkamer-meubilair
    const isBank =
      lowerTitle.includes('bank') ||
      lowerTitle.includes('hoekbank') ||
      lowerTitle.includes('sofa') ||
      lowerTitle.includes('loungebank')

    if (isBank) {
      return 'woonkamer'
    }

    const isKast = lowerTitle.includes('kast')
    const isWoonkamerSpecifiek =
      lowerTitle.includes('bank') ||
      lowerTitle.includes('tafel') ||
      lowerTitle.includes('stoel') ||
      lowerTitle.includes('dressoir') ||
      lowerTitle.includes('salontafel')

    if (isKast && isWoonkamerSpecifiek) {
      return 'woonkamer'
    }

    if (
      lowerTitle.includes('pan') ||
      lowerTitle.includes('pannen') ||
      lowerTitle.includes('servies') ||
      lowerTitle.includes('bestek') ||
      lowerTitle.includes('keuken')
    ) {
      return 'keuken'
    }

    if (
      lowerTitle.includes('shirt') ||
      lowerTitle.includes('broek') ||
      lowerTitle.includes('jurk') ||
      lowerTitle.includes('hoodie') ||
      lowerTitle.includes('kleding')
    ) {
      return 'kleding'
    }

    return 'overig'
  }

  const deriveTitleFromUrl = (url: string): string => {
    try {
      const parsed = new URL(url)
      const host = parsed.hostname.replace(/^www\./, '')
      const hostBase = host.split('.')[0]?.toLowerCase() ?? ''

      // Probeer een productslug uit het pad te halen, bv. "/nl/nl/p/sony-wh-1000xm5-koptelefoon/9300000101234567/"
      const segments = parsed.pathname
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean)

      const candidate = segments.sort((a, b) => b.length - a.length)[0]

      if (candidate && candidate.length > 3) {
        // Decodeer, vervang koppeltekens/underscores door spaties
        let cleaned = decodeURIComponent(candidate)
          .replace(/[-_]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        // Verwijder typische maat-aanduidingen zoals "89 x 39 x 184.5 cm"
        cleaned = cleaned.replace(/\b\d+(?:[.,]\d+)?\s*x\s*\d+(?:[.,]\d+)?(?:\s*x\s*\d+(?:[.,]\d+)?)?\s*(?:cm|mm|m)?/gi, '').trim()

        if (cleaned) {
          const words = cleaned.split(' ')

          // Filter webshopnaam-achtige woorden eruit (bijv. vidaxl)
          const filtered = words.filter((w) => w.toLowerCase() !== hostBase && !w.toLowerCase().includes(hostBase))

          const limited = (filtered.length ? filtered : words).slice(0, 4)
          const title = limited.join(' ').trim()

          if (title) {
            return title.charAt(0).toUpperCase() + title.slice(1)
          }
        }
      }

      // Fallback: webshopnaam (zonder TLD)
      return hostBase || host
    } catch {
      return ''
    }
  }

  const deriveThumbnailFromUrl = (url: string): string | undefined => {
    try {
      const parsed = new URL(url)
      return `${parsed.origin}/favicon.ico`
    } catch {
      return undefined
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    // Basic validation
    if (!formData.title.trim() || !formData.url.trim()) {
      alert('Titel en URL zijn verplicht')
      return
    }

    const cleanedUrl = formData.url.trim()
    const cleanedTitle = formData.title.trim() || deriveTitleFromUrl(cleanedUrl)
    const suggested = suggestCategory(cleanedTitle, cleanedUrl)
    const finalCategory: Category = formData.category === 'overig' ? suggested : formData.category

    onAddItem({
      title: cleanedTitle,
      url: cleanedUrl,
      price: formData.price ? parseFloat(formData.price) : undefined,
      deadline: formData.deadline || undefined,
      note: formData.note.trim() || undefined,
      thumbnailUrl: deriveThumbnailFromUrl(cleanedUrl),
      category: finalCategory,
    })

    // Reset form
    setFormData({
      title: '',
      url: '',
      price: '',
      deadline: '',
      note: '',
      category: 'overig' as Category,
    })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target

    setFormData((prev: typeof formData) => {
      const next = { ...prev, [name]: value }

      if (name === 'url') {
        const autoTitle = deriveTitleFromUrl(value)
        if (!prev.title && autoTitle) {
          next.title = autoTitle
        }
      }

      // Als categorie nog op default staat, probeer een suggestie te doen
      if ((name === 'url' || name === 'title') && prev.category === 'overig') {
        const title = name === 'title' ? value : next.title
        const url = name === 'url' ? value : next.url
        if (title || url) {
          next.category = suggestCategory(title || '', url || '')
        }
      }

      return next
    })
  }

  return (
    <section className="add-item-section">
      <h2>Nieuw item toevoegen</h2>
      <form onSubmit={handleSubmit} className="add-item-form">
        {/* URL bovenaan, volledige breedte */}
        <div className="form-group">
          <label htmlFor="url">URL *</label>
          <input
            type="url"
            id="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            placeholder="https://..."
            required
          />
        </div>

        {/* Daaronder: naam, prijs, deadline naast elkaar (op desktop) */}
        <div className="form-row form-row-3">
          <div className="form-group">
            <label htmlFor="title">Naam *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Naam van het product"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="price">Prijs (€)</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="49.99"
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="deadline">Deadline</label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Categorie dropdown */}
        <div className="form-group">
          <label htmlFor="category">Categorie</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
          >
            <option value="keuken">Keuken</option>
            <option value="badkamer">Badkamer</option>
            <option value="woonkamer">Woonkamer</option>
            <option value="gadgets">Gadgets</option>
            <option value="kleding">Kleding</option>
            <option value="overig">Overig</option>
          </select>
        </div>

        {/* Notitie onder de overige velden */}
        <div className="form-group">
          <label htmlFor="note">Notitie</label>
          <textarea
            id="note"
            name="note"
            value={formData.note}
            onChange={handleChange}
            placeholder="Extra informatie..."
            rows={3}
          />
        </div>

        <button type="submit" className="submit-btn">
          Item toevoegen
        </button>
      </form>
    </section>
  )
}

// Item list component
function ItemList({ 
  items, 
  onToggleCompleted, 
  onDeleteItem,
  showCategory = false,
}: { 
  items: WishlistItem[]
  onToggleCompleted: (id: string) => void
  onDeleteItem: (id: string) => void
  showCategory?: boolean
}) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  const getShopName = (url: string): string => {
    try {
      const parsed = new URL(url)
      const host = parsed.hostname.replace(/^www\./, '')
      const main = host.split('.')[0] || host
      return main.charAt(0).toUpperCase() + main.slice(1)
    } catch {
      return 'Webshop'
    }
  }

  const handleCardClick = (url: string) => {
    if (!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="item-list-section">
      <h2>Wishlist items ({items.length})</h2>
      
      {items.length === 0 ? (
        <p className="empty-message">Nog geen items toegevoegd. Voeg je eerste wens hierboven toe!</p>
      ) : (
        <div className="item-grid">
          {items.map((item: WishlistItem) => (
            <div
              key={item.id}
              className={`item-card ${item.completed ? 'completed' : ''}`}
              onClick={() => handleCardClick(item.url)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCardClick(item.url)
                }
              }}
            >
              <div className="item-tabs">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleCompleted(item.id)
                  }}
                  className={`tab-btn status-tab ${item.completed ? 'completed' : ''}`}
                >
                  Voltooid
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteItem(item.id)
                  }}
                  className="tab-btn delete-tab"
                  aria-label="Verwijder item"
                >
                  ×
                </button>
              </div>

              <div className="item-header">
                <div className="item-thumbnail-wrapper">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="item-thumbnail"
                    />
                  ) : (
                    <div className="item-thumbnail placeholder">
                      {new URL(item.url).hostname.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="item-header-main">
                  <h3 className={`item-title ${item.completed ? 'completed-title' : ''}`}>
                    {item.title}
                  </h3>
                  {showCategory && (
                    <span className={`item-category-badge category-${item.category}`}>
                      {item.category}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="item-content">
                <p className="item-shop">
                  <strong>Webshop:</strong> {getShopName(item.url)}
                </p>
                
                {item.price && (
                  <p className="item-price">
                    <strong>Prijs:</strong> {formatPrice(item.price)}
                  </p>
                )}
                
                {item.deadline && (
                  <p className="item-deadline">
                    <strong>Deadline:</strong> {formatDate(item.deadline)}
                  </p>
                )}
                
                {item.note && (
                  <p className="item-note">
                    <strong>Notitie:</strong> {item.note}
                  </p>
                )}
                
                <p className="item-date">
                  <strong>Toegevoegd:</strong> {formatDate(item.createdAt)}
                  {item.completed && item.completedAt && (
                    <span className="completed-date">
                      <br /><strong>Voltooid:</strong> {formatDate(item.completedAt)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CategoryPage({
  items,
  onToggleCompleted,
  onDeleteItem,
}: {
  items: WishlistItem[]
  onToggleCompleted: (id: string) => void
  onDeleteItem: (id: string) => void
}) {
  const params = useParams<{ category: Category }>()
  const categoryParam = (params.category ?? 'overig') as Category

  const filtered = items.filter((item) => item.category === categoryParam)

  const labelMap: Record<Category, string> = {
    keuken: 'Keuken',
    badkamer: 'Badkamer',
    woonkamer: 'Woonkamer',
    gadgets: 'Gadgets',
    kleding: 'Kleding',
    overig: 'Overig',
  }

  return (
    <>
      <section className="item-list-section">
        <h2>{labelMap[categoryParam]} items ({filtered.length})</h2>
      </section>
      <ItemList
        items={filtered}
        onToggleCompleted={onToggleCompleted}
        onDeleteItem={onDeleteItem}
        showCategory
      />
    </>
  )
}

export default App
