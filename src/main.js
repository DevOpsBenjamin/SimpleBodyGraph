import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { i18nPlugin } from './i18n'

const app = createApp(App)
app.use(createPinia())
app.use(i18nPlugin)
app.mount('#app')

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
