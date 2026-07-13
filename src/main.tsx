import React from 'react'
import ReactDOM from 'react-dom/client'
import DoublyReinforcedTool from './DoublyReinforced' // Fixed: removed { }
import './style.css'

// Ensure 'root' matches your index.html div id
const rootElement = document.getElementById('root') || document.getElementById('app');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <DoublyReinforcedTool />
    </React.StrictMode>,
  )
}

// Register Service Worker for PWA Installation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('App ready for installation'))
      .catch(err => console.error('Installation logic failed', err));
  });
}
