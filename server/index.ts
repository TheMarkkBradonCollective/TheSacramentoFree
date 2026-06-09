import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPushApp } from './app';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = createPushApp();
const PORT = Number(process.env.PORT || 3001);

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
});
