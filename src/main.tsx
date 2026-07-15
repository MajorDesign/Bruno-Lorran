import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import { SetupNotice } from './pages/SetupNotice'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <SetupNotice />
    )}
  </StrictMode>,
)
