import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import formCreate from '@form-create/element-ui'
import 'virtual:uno.css'
import App from './App.vue'
import './styles/main.css'

createApp(App).use(ElementPlus).use(formCreate).mount('#app')
