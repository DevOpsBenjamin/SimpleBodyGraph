import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

createApp(App).mount('#app')

// Register Service Worker for offline-first capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('PWA Service Worker registered successfully: ', reg.scope);
      })
      .catch((err) => {
        console.warn('PWA Service Worker registration failed: ', err);
      });
  });
}
