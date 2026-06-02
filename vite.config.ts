import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Cria a ponte para os componentes nativos rodarem na Web
      'react-native': 'react-native-web',
    },
  },
});