import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  console.log("VITE CONFIG GEMINI_API_KEY: ", process.env.GEMINI_API_KEY);
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        registerType: 'prompt',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5000000
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'MeteorGrade Forecasting',
          short_name: 'MeteorGrade',
          description: 'AI-Powered Atmospheric Intelligence and Prediction Hub',
          theme_color: '#6366f1',
          background_color: '#ffffff',
          icons: [
            {
              src: 'https://img.icons8.com/dotty/192/6366f1/cloud.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://img.icons8.com/dotty/512/6366f1/cloud.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'https://img.icons8.com/dotty/512/6366f1/cloud.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          display: 'standalone',
          orientation: 'portrait'
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 3000,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
