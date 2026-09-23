import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/jacquarda-bastarda-9'
import '@fontsource/tiny5'
import './ui/theme.css'
import { App } from './ui/App'
import { ArenaPage } from './ui/arena/ArenaPage'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

const isArena = new URLSearchParams(window.location.search).has('arena')

createRoot(root).render(<StrictMode>{isArena ? <ArenaPage /> : <App />}</StrictMode>)
