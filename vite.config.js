import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins:[vue()],
  server:{ port:5173, proxy:{ '/api': { target:'http://100.119.3.44:8055/', changeOrigin:true, rewrite:p=>p.replace(/^\/api/,'') } } }
})