import { resolve } from 'node:path';
import { defineConfig } from 'vite';

function rewritePostsIdPath(urlValue) {
  if (!urlValue) {
    return null;
  }

  const url = new URL(urlValue, 'http://localhost');
  const match = url.pathname.match(/^\/posts\/([^/?#]+)\/?$/);
  if (!match) {
    return null;
  }

  const postId = encodeURIComponent(decodeURIComponent(match[1]));
  const suffix = url.search ? `&${url.search.slice(1)}` : '';
  return `/posts/index.html?id=${postId}${suffix}`;
}

function postsIdRoutePlugin() {
  return {
    name: 'posts-id-route-plugin',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const rewritten = rewritePostsIdPath(req.url);
        if (rewritten) {
          req.url = rewritten;
        }

        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const rewritten = rewritePostsIdPath(req.url);
        if (rewritten) {
          req.url = rewritten;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [postsIdRoutePlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      input: {
        home: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login/index.html'),
        register: resolve(__dirname, 'register/index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
        posts: resolve(__dirname, 'posts/index.html'),
        createPost: resolve(__dirname, 'create-post/index.html'),
        favorites: resolve(__dirname, 'favorites/index.html')
      }
    }
  }
});
