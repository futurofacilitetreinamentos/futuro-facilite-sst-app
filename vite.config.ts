import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base relativa: funciona em qualquer caminho do GitHub Pages (usuario.github.io/repositorio/)
export default defineConfig({
  base: './',
  plugins: [react()],
})
