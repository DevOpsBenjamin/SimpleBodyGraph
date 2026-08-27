import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { i18nPlugin } from './i18n'
import { registerServiceWorker } from './services/updateService'

const app = createApp(App)
app.use(createPinia())
app.use(i18nPlugin)
app.mount('#app')

// Register Service Worker with strict cache revalidation & Capacitor resume listeners
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    registerServiceWorker();
  });
}
