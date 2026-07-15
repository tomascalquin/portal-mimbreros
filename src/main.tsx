import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './hooks/useToast'

// Lógica para forzar actualización en iOS cuando la app vuelve del segundo plano
let lastActive = Date.now();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    // Si han pasado más de 2 horas en segundo plano, forzar recarga
    if (Date.now() - lastActive > 2 * 60 * 60 * 1000) {
      window.location.reload();
    }
    lastActive = Date.now();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
