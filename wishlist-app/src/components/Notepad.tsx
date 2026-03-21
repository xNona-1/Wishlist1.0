import React, { useState, useEffect } from 'react'
import '../styles/Notepad.css'

type NotepadItem = {
  id: string
  text: string
  createdAt: string
}

export function Notepad() {
  const [isOpen, setIsOpen] = useState(false)
  const [notes, setNotes] = useState<NotepadItem[]>(() => {
    const saved = localStorage.getItem('wishlist-notepad')
    if (!saved) return []
    try {
      return JSON.parse(saved)
    } catch {
      return []
    }
  })
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    localStorage.setItem('wishlist-notepad', JSON.stringify(notes))
  }, [notes])

  const addNote = () => {
    if (!inputValue.trim()) return
    
    const newNote: NotepadItem = {
      id: crypto.randomUUID(),
      text: inputValue.trim(),
      createdAt: new Date().toISOString(),
    }
    
    setNotes((prev) => [...prev, newNote])
    setInputValue('')
  }

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id))
  }

  const clearAll = () => {
    if (notes.length === 0) return
    if (window.confirm('Weet je zeker dat je alle notities wilt verwijderen?')) {
      setNotes([])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addNote()
    }
  }

  return (
    <>
      <button
        className={`notepad-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle kladblok"
      >
        <svg className="notepad-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className={`notepad-drawer ${isOpen ? 'open' : ''}`}>
        <div className="notepad-header">
          <h3 className="notepad-title">Kladblok</h3>
          <button
            className="notepad-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Sluit kladblok"
          >
            ✕
          </button>
        </div>

        <div className="notepad-input-section">
          <input
            type="text"
            className="notepad-input"
            placeholder="Typ een notitie..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            className="notepad-add-btn"
            onClick={addNote}
            disabled={!inputValue.trim()}
          >
            + Voeg toe
          </button>
        </div>

        <div className="notepad-list">
          {notes.length === 0 ? (
            <p className="notepad-empty">Nog geen notities</p>
          ) : (
            <ul className="notepad-items">
              {notes.map((note) => (
                <li key={note.id} className="notepad-item">
                  <span className="notepad-bullet">•</span>
                  <span className="notepad-text">{note.text}</span>
                  <button
                    className="notepad-delete-btn"
                    onClick={() => deleteNote(note.id)}
                    aria-label="Verwijder notitie"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {notes.length > 0 && (
          <div className="notepad-footer">
            <button className="notepad-clear-btn" onClick={clearAll}>
              Wis alles
            </button>
          </div>
        )}
      </div>

      {isOpen && <div className="notepad-backdrop" onClick={() => setIsOpen(false)} />}
    </>
  )
}
