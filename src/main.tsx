import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Dynamically load Google Maps API
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
if (apiKey) {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    window.dispatchEvent(new CustomEvent('google_maps_loaded'));
  };
  script.onerror = () => {
    console.error("Failed to load Google Maps API script.");
  };
  document.head.appendChild(script);
} else {
  console.warn("VITE_GOOGLE_MAPS_API_KEY is not defined in environment variables.");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
