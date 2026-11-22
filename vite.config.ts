import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/** Runs api/tryon.ts inside `npm run dev`, so try-on works locally without `vercel dev`.
 *  Reads FAL_KEY from .env.local (server side only, never sent to the browser). */
const localApi = (env: Record<string, string>): Plugin => ({
  name: 'korey-local-api',
  configureServer(server) {
    if (env.FAL_KEY) process.env.FAL_KEY = env.FAL_KEY;
    server.middlewares.use('/api/tryon', async (req, res) => {
      try {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const request = new Request(`http://localhost${req.url ?? ''}`, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
        });
        const mod = await server.ssrLoadModule('/api/tryon.ts');
        const out: Response = req.method === 'POST' ? await mod.POST(request) : new Response('Use POST', { status: 405 });
        res.statusCode = out.status;
        out.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await out.arrayBuffer()));
      } catch (e) {
        res.statusCode = 500;
        res.end(`Local try-on error: ${(e as Error).message}`);
      }
    });
  },
});

// `npm run build` makes a normal static site (for Vercel/Netlify).
// `npm run build:single` makes one self-contained HTML file for quick previews.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: mode === 'single' ? [react(), viteSingleFile()] : [react(), localApi(env)],
    build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
  };
});
