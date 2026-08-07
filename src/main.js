import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { useBodyGraphStore } from './stores/bodyGraph'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.mount('#app')

// Expose Pinia and the store for E2E and integration tests
if (typeof window !== 'undefined') {
  window.pinia = pinia
  window.useBodyGraphStore = useBodyGraphStore
}

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
