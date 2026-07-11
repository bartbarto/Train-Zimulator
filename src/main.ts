import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { useI18nStore } from './stores/i18nStore'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
useI18nStore(pinia)
app.mount('#app')
