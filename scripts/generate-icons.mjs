import { existsSync, readFileSync, writeFileSync } from 'fs';

const sizes = [192, 512];
const allExist = sizes.every((size) => existsSync(`public/icon-${size}.png`));

try {
  const { Resvg } = await import('@resvg/resvg-js');
  const svg = readFileSync('public/icon.svg');
  for (const size of sizes) {
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: size },
      background: '#09090b',
    });
    writeFileSync(`public/icon-${size}.png`, resvg.render().asPng());
    console.log(`wrote public/icon-${size}.png`);
  }
} catch (err) {
  if (allExist) {
    console.warn('[generate-icons] skipped regeneration, using committed PNGs:', err.message);
  } else {
    throw err;
  }
}
