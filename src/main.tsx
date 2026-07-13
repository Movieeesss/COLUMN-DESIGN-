import React from 'react'
import ReactDOM from 'react-dom/client'
// Import the new Column Design component (Ensure the export name matches your ColumnDesign.tsx file)
import RectangularColumnTool from './ColumnDesign' 
import './style.css'

// Ensure 'root' matches your index.html div id
const rootElement = document.getElementById('root') || document.getElementById('app');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* Render the new column tool here */}
      <RectangularColumnTool />
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
