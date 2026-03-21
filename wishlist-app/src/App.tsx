import React, { useState, useEffect, useRef } from 'react'
import { Routes, Route, Link, useParams } from 'react-router-dom'
import type { WishlistItem, Category } from './types/wishlist'
import { scrapeUrl } from './utils/scraper'
import { Notepad } from './components/Notepad'
import './styles/App.css'

function App() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [isLoadingFromBackend, setIsLoadingFromBackend] = useState(true)
  const [isPriceCheckComplete, setIsPriceCheckComplete] = useState(false)
  const [showPriceCheckNotification, setShowPriceCheckNotification] = useState(false)

  // Check if we should show price check notification
  useEffect(() => {
    const checkForNightlyUpdate = () => {
      const now = new Date()
      const currentHour = now.getHours()
      const today = now.toDateString()
      const lastNotificationDate = localStorage.getItem('lastPriceCheckNotificationDate')
      
      // Show notification if it's after 21:00 and we haven't shown it today
      if (currentHour >= 21 && lastNotificationDate !== today) {
        // Check if any items have been checked today
        const hasRecentCheck = items.some(item => {
          if (!item.lastPriceCheckAt) return false
          const checkDate = new Date(item.lastPriceCheckAt)
          return checkDate.toDateString() === today && checkDate.getHours() >= 21
        })
        
        if (hasRecentCheck) {
          setShowPriceCheckNotification(true)
          localStorage.setItem('lastPriceCheckNotificationDate', today)
        }
      }
    }
    
    if (items.length > 0) {
      checkForNightlyUpdate()
    }
  }, [items])

  // Load items from backend on mount
  useEffect(() => {
    const loadFromBackend = async () => {
      try {
        const response = await fetch('http://localhost:3001/wishlist')
        if (response.ok) {
          const data = await response.json()
          
          // If backend is empty, check localStorage for migration
          if (data.length === 0) {
            const saved = localStorage.getItem("wishlist")
            if (saved) {
              try {
                const localItems = JSON.parse(saved)
                if (localItems.length > 0) {
                  console.log("Migrating", localItems.length, "items from localStorage to backend...")
                  // Migrate to backend
                  await fetch('http://localhost:3001/wishlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(localItems),
                  })
                  setItems(localItems)
                  // Remove from localStorage after successful migration
                  localStorage.removeItem("wishlist")
                  console.log("Migration complete. localStorage cleared.")
                  return
                }
              } catch (err) {
                console.error("Error during migration:", err)
              }
            }
          }
          
          setItems(data)
          localStorage.setItem("wishlist", JSON.stringify(data))
        } else {
          // Fallback to localStorage if backend is not available
          const saved = localStorage.getItem("wishlist")
          if (saved) {
            setItems(JSON.parse(saved))
          }
        }
      } catch (error) {
        console.error("Error loading from backend, using localStorage:", error)
        const saved = localStorage.getItem("wishlist")
        if (saved) {
          try {
            setItems(JSON.parse(saved))
          } catch {
            setItems([])
          }
        }
      } finally {
        setIsLoadingFromBackend(false)
      }
    }
    loadFromBackend()
  }, [])

  // Sync items to backend and localStorage whenever they change
  useEffect(() => {
    if (isLoadingFromBackend) return
    
    const syncToBackend = async () => {
      try {
        await fetch('http://localhost:3001/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(items),
        })
        localStorage.setItem("wishlist", JSON.stringify(items))
      } catch (error) {
        console.error("Error syncing to backend, saving to localStorage only:", error)
        localStorage.setItem("wishlist", JSON.stringify(items))
      }
    }
    syncToBackend()
  }, [items, isLoadingFromBackend])

  // Auto-refresh wishlist data every 60 seconds
  useEffect(() => {
    if (isLoadingFromBackend) return

    const refreshData = async () => {
      try {
        const response = await fetch('http://localhost:3001/wishlist')
        if (response.ok) {
          const data = await response.json()
          // Only update if data has actually changed to avoid unnecessary re-renders
          if (JSON.stringify(data) !== JSON.stringify(items)) {
            setItems(data)
            localStorage.setItem("wishlist", JSON.stringify(data))
          }
        }
      } catch (error) {
        console.error("Error auto-refreshing data:", error)
      }
    }

    const intervalId = setInterval(refreshData, 60000) // 60 seconds

    return () => clearInterval(intervalId)
  }, [isLoadingFromBackend, items])

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

  const checkPrices = async () => {
    try {
      setIsPriceCheckComplete(false)
      await fetch('http://localhost:3001/check-prices', { method: 'POST' })
      // Reload items after price check - wait 5 seconds for backend to complete
      setTimeout(async () => {
        const response = await fetch('http://localhost:3001/wishlist')
        if (response.ok) {
          const data = await response.json()
          setItems(data)
          localStorage.setItem("wishlist", JSON.stringify(data))
          setIsPriceCheckComplete(true)
          setTimeout(() => setIsPriceCheckComplete(false), 3000)
        }
      }, 5000)
    } catch (error) {
      console.error("Error checking prices:", error)
    }
  }

  const recentItems = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Onze Wishlist</h1>
            <p>Deel je wensen met elkaar</p>
          </div>
          <button 
            onClick={checkPrices} 
            className={`price-check-header-btn ${isPriceCheckComplete ? 'complete' : ''}`}
          >
            <svg className="price-check-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 12C4 7.58172 7.58172 4 12 4C14.5264 4 16.7792 5.17108 18.2454 7M20 12C20 16.4183 16.4183 20 12 20C9.47362 20 7.22075 18.8289 5.75463 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 3V7H14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 21V17H10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="price-check-text">Check prijzen</span>
          </button>
        </div>

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
      <Notepad />
      
      {showPriceCheckNotification && (
        <div className="price-check-notification-overlay" onClick={() => setShowPriceCheckNotification(false)}>
          <div className="price-check-notification" onClick={(e) => e.stopPropagation()}>
            <div className="price-check-notification-icon">✓</div>
            <h3 className="price-check-notification-title">Prijzen gecheckt!</h3>
            <p className="price-check-notification-message">
              De automatische prijscheck van 21:00 is uitgevoerd.
            </p>
            <button 
              className="price-check-notification-btn"
              onClick={() => setShowPriceCheckNotification(false)}
            >
              Begrepen
            </button>
          </div>
        </div>
      )}
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
  const [isScrapingUrl, setIsScrapingUrl] = useState(false)
  const [scrapedImageUrl, setScrapedImageUrl] = useState<string | undefined>(undefined)
  const urlDebounceTimerRef = useRef<number | null>(null)

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
      thumbnailUrl: scrapedImageUrl,
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
    setScrapedImageUrl(undefined)
  }

  const handleUrlBlur = async () => {
    const url = formData.url.trim()
    if (!url) return

    setIsScrapingUrl(true)
    try {
      const scraped = await scrapeUrl(url)
      
      setFormData((prev) => {
        const next = { ...prev }
        
        // Auto-fill title if empty and scraped title exists
        if (!prev.title && scraped.title) {
          next.title = scraped.title
        }
        
        // Auto-fill price if empty and scraped price exists
        if (!prev.price && scraped.price) {
          next.price = scraped.price.toString()
        }
        
        return next
      })
      
      // Store scraped image
      if (scraped.image) {
        setScrapedImageUrl(scraped.image)
      }
      
    } catch (error) {
      console.error('Error during URL scraping:', error)
    } finally {
      setIsScrapingUrl(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target

    setFormData((prev: typeof formData) => {
      const next = { ...prev, [name]: value }

      if (name === 'url') {
        // Clear previous debounce timer
        if (urlDebounceTimerRef.current) {
          window.clearTimeout(urlDebounceTimerRef.current)
        }
        
        // Set new debounce timer for scraping
        if (value.trim()) {
          urlDebounceTimerRef.current = window.setTimeout(() => {
            handleUrlBlur()
          }, 600)
        }
        
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
          <label htmlFor="url">
            URL *
            {isScrapingUrl && <span className="scraping-indicator"> (Productinfo ophalen...)</span>}
          </label>
          <input
            type="url"
            id="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            onBlur={handleUrlBlur}
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

  const formatLastCheckDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('nl-NL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
                      htmlFor={`upload-${item.id}`}
                      className="image-upload-placeholder"
                      onClick={(e) => {
                        e.stopPropagation()
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
                  {item.currentPrice && item.originalPrice && item.currentPrice < item.originalPrice ? (
                    <div className="item-price-section">
                      <div className="price-drop-label">🎉 Prijs gedaald!</div>
                      <div className="item-price-comparison">
                        <span className="original-price">{formatPrice(item.originalPrice)}</span>
                        <span className="current-price">{formatPrice(item.currentPrice)}</span>
                      </div>
                    </div>
                  ) : item.currentPrice ? (
                    <div className="item-price-pill">
                      {formatPrice(item.currentPrice)}
                    </div>
                  ) : item.price ? (
                    <div className="item-price-pill">
                      {formatPrice(item.price)}
                    </div>
                  ) : null}
                  {item.lastPriceCheckAt && (
                    <div className="last-check-date">
                      Laatste check: {formatLastCheckDate(item.lastPriceCheckAt)}
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
