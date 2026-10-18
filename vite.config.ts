import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Electron用の相対パス指定（これで画面やLeafletの画像が正常に読み込めます）
  server: {
    proxy: {
      '/api-gsi': {
        target: 'https://cyberjapandata.gsi.go.jp',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-gsi/, ''),
      },
    },
  },
});
