import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import formCreate from '@form-create/element-ui'
import 'virtual:uno.css'
import App from './App.vue'
import './styles/main.css'

createApp(App).use(ElementPlus, { locale: zhCn }).use(formCreate).mount('#app')
