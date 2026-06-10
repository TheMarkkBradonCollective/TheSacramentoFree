import { readFileSync, writeFileSync } from 'fs';
import { Resvg } from '@resvg/resvg-js';

const svg = readFileSync('public/icon.svg');

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: '#09090b',
  });
  writeFileSync(`public/icon-${size}.png`, resvg.render().asPng());
  console.log(`wrote public/icon-${size}.png`);
}
