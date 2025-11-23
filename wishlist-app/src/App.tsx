import React, { useState, useEffect, useRef } from 'react'
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

        // Als thumbnailUrl nog een favicon is, negeren we die zodat alleen eigen uploads overblijven
        if (base.url && base.thumbnailUrl) {
          try {
            const parsedUrl = new URL(base.url)
            const faviconUrl = `${parsedUrl.origin}/favicon.ico`
            if (base.thumbnailUrl === faviconUrl) {
              base.thumbnailUrl = undefined
            }
          } catch {
            // als de URL ongeldig is, doen we niets
          }
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

  const [showAddForm, setShowAddForm] = useState(false)

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

  const updateItemImage = (id: string, imageDataUrl: string) => {
    setItems((prev: WishlistItem[]) =>
      prev.map((item: WishlistItem) =>
        item.id === id ? { ...item, thumbnailUrl: imageDataUrl } : item,
      ),
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
              <div className="page-layout">
                <div className="page-top">
                  <div className={`add-item-collapsible ${showAddForm ? 'open' : ''}`}>
                    <AddItemForm onAddItem={addItem} />
                  </div>

                  <section className={`add-item-toggle-bar ${showAddForm ? 'open' : ''}`}>
                    <button
                      type="button"
                      className={`add-item-toggle ${showAddForm ? 'open' : ''}`}
                      onClick={() => setShowAddForm((prev) => !prev)}
                    >
                      <span className="add-item-toggle-label">Nieuw artikel</span>
                      <span className="add-item-toggle-icon">{showAddForm ? '–' : '+'}</span>
                    </button>
                  </section>
                </div>

                <div className="page-scroll">
                  <ItemList
                    items={recentItems}
                    onToggleCompleted={toggleCompleted}
                    onDeleteItem={deleteItem}
                    onUpdateImage={updateItemImage}
                    showCategory
                  />
                </div>
              </div>
            }
          />
          <Route
            path="/categorie/:category"
            element={
              <CategoryPage
                items={items}
                onToggleCompleted={toggleCompleted}
                onDeleteItem={deleteItem}
                onUpdateImage={updateItemImage}
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
  const [showDetails, setShowDetails] = useState(false)

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
      thumbnailUrl: undefined,
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
      <div className="add-item-header">
        <h2 className="add-item-title">Nieuw item</h2>
        <p className="add-item-subtitle">Voeg een product toe aan jullie wishlist.</p>
      </div>
      <form onSubmit={handleSubmit} className="add-item-form">
        {/* Rij 1: URL, volledige breedte */}
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

        {/* Rij 2: naam, prijs, deadline */}
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

        <div className="form-details-toggle">
          <button
            type="button"
            className="details-toggle-btn"
            onClick={() => setShowDetails((prev) => !prev)}
          >
            {showDetails ? 'Minder details' : 'Meer details'}
          </button>
        </div>

        {showDetails && (
          <>
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
          </>
        )}

        <div className="form-actions">
          <button type="submit" className="submit-btn">
            Item toevoegen
          </button>
        </div>
      </form>
    </section>
  )
}

// Item list component
function ItemList({ 
  items, 
  onToggleCompleted, 
  onDeleteItem,
  onUpdateImage,
  showCategory = false,
}: { 
  items: WishlistItem[]
  onToggleCompleted: (id: string) => void
  onDeleteItem: (id: string) => void
  onUpdateImage: (id: string, imageDataUrl: string) => void
  showCategory?: boolean
}) {
  const [activePasteItemId, setActivePasteItemId] = useState<string | null>(null)
  const pasteInputRef = useRef<HTMLTextAreaElement | null>(null)

  const handlePasteFromClipboard = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!activePasteItemId) return

    const clipboardItems = event.clipboardData?.items
    if (!clipboardItems) return

    for (let i = 0; i < clipboardItems.length; i += 1) {
      const clipboardItem = clipboardItems[i]
      if (!clipboardItem.type.startsWith('image/')) continue

      const file = clipboardItem.getAsFile()
      if (!file) continue

      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result
        if (typeof result === 'string') {
          onUpdateImage(activePasteItemId, result)
        }
      }
      reader.readAsDataURL(file)

      event.preventDefault()
      break
    }
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

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    id: string,
  ) => {
    e.stopPropagation()
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === 'string') {
        onUpdateImage(id, result)
      }
    }
    reader.readAsDataURL(file)

    // allow re-selecting the same file later
    e.target.value = ''
  }

  return (
    <section className="item-list-section">
      <textarea
        ref={pasteInputRef}
        className="paste-capture"
        aria-hidden="true"
        tabIndex={-1}
        onPaste={handlePasteFromClipboard}
      />
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
              <div
                className="item-image-area"
                onClick={(e) => {
                  e.stopPropagation()
                  setActivePasteItemId(item.id)
                  if (pasteInputRef.current) {
                    pasteInputRef.current.focus()
                  }
                }}
              >
                <button
                  type="button"
                  className={`item-complete-toggle ${item.completed ? 'completed' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleCompleted(item.id)
                  }}
                  aria-label={item.completed ? 'Markeer als niet voltooid' : 'Markeer als voltooid'}
                >
                  ✓
                </button>

                {item.thumbnailUrl ? (
                  <>
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="item-main-image"
                    />
                    <input
                      id={`upload-${item.id}`}
                      type="file"
                      accept="image/*"
                      className="image-upload-input"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleImageChange(e, item.id)}
                    />
                  </>
                ) : (
                  <>
                    <label
                      className="image-upload-placeholder"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActivePasteItemId(item.id)
                        if (pasteInputRef.current) {
                          pasteInputRef.current.focus()
                        }
                      }}
                    >
                      <span className="plus-icon">+</span>
                    </label>
                    <input
                      id={`upload-${item.id}`}
                      type="file"
                      accept="image/*"
                      className="image-upload-input"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleImageChange(e, item.id)}
                    />
                  </>
                )}
              </div>

              <p className="item-shop">{getShopName(item.url)}</p>

              <div className="item-body">
                <div className="item-body-header">
                  <h3 className={`item-title ${item.completed ? 'completed-title' : ''}`}>
                    {item.title}
                  </h3>
                  {showCategory && (
                    <span className={`item-category-badge category-${item.category}`}>
                      {item.category}
                    </span>
                  )}
                </div>

                <div className="item-footer">
                  {item.price && (
                    <div className="item-price-pill">
                      {formatPrice(item.price)}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="item-delete-btn"
                  aria-label="Verwijder item"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteItem(item.id)
                  }}
                >
                  ×
                </button>
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
  onUpdateImage,
}: {
  items: WishlistItem[]
  onToggleCompleted: (id: string) => void
  onDeleteItem: (id: string) => void
  onUpdateImage: (id: string, imageDataUrl: string) => void
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
    <div className="page-layout">
      <div className="page-top">
        <section className="item-list-section">
          <h2>{labelMap[categoryParam]} items ({filtered.length})</h2>
        </section>
      </div>

      <div className="page-scroll">
        <ItemList
          items={filtered}
          onToggleCompleted={onToggleCompleted}
          onDeleteItem={onDeleteItem}
          onUpdateImage={onUpdateImage}
          showCategory
        />
      </div>
    </div>
  )
}

export default App
