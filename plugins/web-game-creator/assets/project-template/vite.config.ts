import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({ mode }) => {
  const yoola = loadEnv(mode, process.cwd()).VITE_GAME_PLATFORM === 'yoola';
  return {
    base: './', server: { port: 5173, strictPort: false },
    plugins: [{
      name: 'playables-sdk',
      transformIndexHtml: {
        order: 'post',
        handler: () => yoola ? [{ tag: 'script', attrs: { src: 'https://www.youtube.com/game_api/v1' }, injectTo: 'head-prepend' }] : [],
      },
    }],
  };
});
