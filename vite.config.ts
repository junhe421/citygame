import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Setup Proxy for Node.js process if configured
  const envProxy = env.HTTPS_PROXY || env.HTTP_PROXY;
  if (envProxy) {
    process.env.HTTPS_PROXY = envProxy;
    process.env.HTTP_PROXY = envProxy;
    console.log(`[Vite] Using Proxy: ${envProxy}`);
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/gemini-api': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/gemini-api/, ''),
          secure: false
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_BASE_URL': JSON.stringify(env.GEMINI_API_BASE_URL),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
