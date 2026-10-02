// Generates our own flat, monochrome placeholder product illustrations from
// src/db/demo-catalog.json into public/products/<slug>-1.svg and -2.svg.
// No third-party imagery: every shape is drawn here. Run: node scripts/generate-product-art.mjs
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const catalog = JSON.parse(readFileSync("src/db/demo-catalog.json", "utf8"));
const tones = [
  { P: "#262626", D: "#8c8c8c", L: "#fafafa", bg: "#f5f5f5" },
  { P: "#bcbcbc", D: "#6b6b6b", L: "#fafafa", bg: "#f5f5f5" },
  { P: "#e9e9e9", D: "#9a9a9a", L: "#ffffff", bg: "#f0f0f0" },
  { P: "#4a4a4a", D: "#a3a3a3", L: "#f5f5f5", bg: "#eeeeee" },
  { P: "#8f8f8f", D: "#5a5a5a", L: "#fafafa", bg: "#f7f7f7" },
  { P: "#d4d4d4", D: "#7a7a7a", L: "#ffffff", bg: "#f5f5f5" },
];

const rr = (x, y, w, h, r, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`;
const ell = (cx, cy, rx, ry, fill, extra = "") => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke, w = 6) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;
const stroke = (d, c, w = 14) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const fill = (d, c) => `<path d="${d}" fill="${c}"/>`;
const shadow = (y, w) => ell(400, y, w, 14, "#000", 'opacity="0.07"');

const shapes = {
  headphones: ({ P, D }) => `${shadow(650, 190)}${stroke("M250 470 V380 a150 150 0 0 1 300 0 V470", D, 22)}${rr(205, 430, 90, 170, 40, P)}${rr(505, 430, 90, 170, 40, P)}${rr(190, 450, 36, 130, 18, D)}${rr(574, 450, 36, 130, 18, D)}`,
  speaker: ({ P, D }) => `${shadow(650, 170)}${rr(260, 230, 280, 400, 48, P)}${ell(400, 360, 74, 74, D, 'opacity="0.55"')}${ell(400, 360, 28, 28, P)}${ell(400, 520, 46, 46, D, 'opacity="0.55"')}${ell(400, 520, 16, 16, P)}`,
  earbuds: ({ P, D, L }) => `${shadow(650, 190)}${rr(250, 400, 300, 220, 70, P)}${line(250, 500, 550, 500, D, 5)}${ell(345, 345, 34, 48, L, `stroke="${D}" stroke-width="6"`)}${ell(455, 345, 34, 48, L, `stroke="${D}" stroke-width="6"`)}${ell(400, 560, 8, 8, D)}`,
  box: ({ P, D }) => `${shadow(640, 200)}${rr(210, 370, 380, 240, 28, P)}${rr(250, 430, 70, 24, 6, D)}${rr(340, 430, 70, 24, 6, D)}${ell(520, 442, 16, 16, D)}${line(250, 540, 550, 540, D, 4)}`,
  dripper: ({ P, D, L }) => `${shadow(660, 170)}${rr(300, 440, 200, 200, 34, L, `stroke="${D}" stroke-width="6"`)}${rr(300, 540, 200, 100, 34, D, 'opacity="0.35"')}${fill("M250 210 H550 L480 430 H320 Z", P)}${ell(400, 210, 150, 22, D)}${rr(330, 424, 140, 16, 8, D)}`,
  mug: ({ P, D }) => `${shadow(640, 170)}${rr(260, 330, 240, 290, 36, P)}${stroke("M498 400 q110 0 110 100 t-110 100", P, 34)}${ell(380, 332, 120, 26, D, 'opacity="0.5"')}`,
  board: ({ P, D }) => `${shadow(650, 200)}<g transform="rotate(-8 400 420)">${rr(190, 280, 420, 270, 40, P)}${ell(530, 345, 30, 30, D, 'opacity="0.5"')}${rr(235, 330, 220, 16, 8, D, 'opacity="0.45"')}${rr(235, 365, 220, 16, 8, D, 'opacity="0.45"')}</g>`,
  kettle: ({ P, D }) => `${shadow(650, 190)}${fill("M250 600 Q240 400 330 360 H470 Q560 400 550 600 Z", P)}${stroke("M545 440 q110 -10 80 110 q-10 30 -75 40", P, 26)}${stroke("M262 470 q-70 -120 -10 -170", P, 26)}${rr(360, 320, 80, 40, 14, D)}${ell(400, 316, 18, 18, D)}`,
  bottle: ({ P, D }) => `${shadow(660, 120)}${rr(325, 180, 150, 480, 60, P)}${rr(345, 130, 110, 70, 18, D)}${rr(325, 400, 150, 18, 4, D, 'opacity="0.5"')}`,
  throw: ({ P, D }) => `${shadow(640, 210)}${rr(190, 520, 420, 100, 22, P)}${rr(200, 430, 400, 100, 22, D, 'opacity="0.55"')}${rr(190, 340, 420, 100, 22, P)}${line(215, 380, 585, 380, D, 4)}${line(215, 400, 585, 400, D, 4)}${line(215, 560, 585, 560, D, 4)}`,
  lamp: ({ P, D, L }) => `${shadow(650, 130)}${fill("M290 230 H510 L560 400 H240 Z", L)}${stroke("M290 230 H510 L560 400 H240 Z", D, 6)}${rr(392, 400, 16, 130, 6, D)}${fill("M320 640 Q330 530 400 530 Q470 530 480 640 Z", P)}`,
  candle: ({ P, D, L }) => `${shadow(650, 150)}${rr(280, 330, 240, 300, 28, L, `stroke="${D}" stroke-width="6"`)}${rr(300, 290, 200, 54, 12, D)}${rr(280, 470, 240, 160, 28, P, 'opacity="0.18"')}${line(400, 270, 400, 300, D, 8)}`,
  planter: ({ P, D }) => `${shadow(650, 150)}${fill("M290 470 H510 L480 630 H320 Z", P)}${rr(280, 450, 240, 36, 12, D)}${stroke("M400 450 V300", D, 10)}${ell(350, 300, 52, 26, D, 'transform="rotate(-30 350 300)"')}${ell(450, 280, 52, 26, D, 'transform="rotate(30 450 280)"')}${ell(400, 230, 28, 56, D)}`,
  "lamp-floor": ({ P, D, L }) => `${shadow(670, 110)}${ell(400, 660, 110, 18, P)}${rr(394, 300, 12, 360, 6, D)}${fill("M310 190 H490 L520 310 H280 Z", L)}${stroke("M310 190 H490 L520 310 H280 Z", D, 6)}`,
  keyboard: ({ P, D }) => {
    let keys = "";
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) keys += rr(232 + c * 33, 370 + r * 42, 28, 34, 5, D, 'opacity="0.55"');
    return `${shadow(640, 230)}${rr(200, 340, 400, 210, 22, P)}${keys}`;
  },
  stand: ({ P, D }) => `${shadow(640, 230)}${rr(190, 400, 420, 56, 14, P)}${rr(230, 456, 48, 100, 8, D)}${rr(522, 456, 48, 100, 8, D)}`,
  mouse: ({ P, D }) => `${shadow(650, 130)}${fill("M400 270 Q500 270 520 400 Q535 560 400 620 Q265 560 280 400 Q300 270 400 270 Z", P)}${line(400, 280, 400, 400, D, 5)}${line(285, 400, 515, 400, D, 4)}`,
  mat: ({ P, D }) => `${shadow(600, 250)}${rr(160, 380, 480, 220, 22, P)}<rect x="176" y="396" width="448" height="188" rx="14" fill="none" stroke="${D}" stroke-width="3" stroke-dasharray="10 10"/>`,
  backpack: ({ P, D }) => `${shadow(670, 160)}${stroke("M340 230 q60 -60 120 0", D, 22)}${rr(260, 230, 280, 420, 90, P)}${rr(300, 440, 200, 150, 30, D, 'opacity="0.5"')}${line(300, 340, 500, 340, D, 8)}`,
  cubes: ({ P, D }) => `${shadow(660, 200)}${rr(250, 500, 300, 130, 24, P)}${rr(270, 370, 260, 130, 24, D, 'opacity="0.6"')}${rr(290, 250, 220, 130, 24, P, 'opacity="0.8"')}${line(280, 565, 520, 565, D, 4)}`,
  wallet: ({ P, D }) => `${shadow(630, 190)}${rr(220, 330, 360, 270, 26, P)}<rect x="236" y="346" width="328" height="238" rx="16" fill="none" stroke="${D}" stroke-width="3" stroke-dasharray="9 9"/>${rr(220, 330, 360, 80, 26, D, 'opacity="0.35"')}${rr(370, 450, 60, 24, 12, D)}`,
  suitcase: ({ P, D }) => `${shadow(670, 180)}${stroke("M340 220 v-20 h120 v20", D, 16)}${rr(250, 220, 300, 400, 40, P)}${line(320, 260, 320, 580, D, 6)}${line(400, 260, 400, 580, D, 6)}${line(480, 260, 480, 580, D, 6)}${ell(300, 640, 20, 20, D)}${ell(500, 640, 20, 20, D)}`,
  watch: ({ P, D, L }) => `${shadow(670, 120)}${rr(350, 140, 100, 180, 26, D, 'opacity="0.7"')}${rr(350, 480, 100, 180, 26, D, 'opacity="0.7"')}${ell(400, 400, 150, 150, P)}${ell(400, 400, 118, 118, L)}${line(400, 400, 400, 320, P, 10)}${line(400, 400, 462, 420, P, 8)}${ell(400, 400, 10, 10, P)}`,
  band: ({ P, D, L }) => `${shadow(670, 110)}${rr(345, 130, 110, 540, 50, P)}${rr(360, 300, 80, 200, 26, L)}${rr(375, 330, 50, 6, 3, D)}${rr(375, 350, 36, 6, 3, D)}`,
  sunglasses: ({ P, D }) => `${shadow(560, 230)}${rr(190, 330, 190, 150, 60, P)}${rr(420, 330, 190, 150, 60, P)}${stroke("M380 380 q20 -20 40 0", P, 14)}${line(190, 360, 150, 330, D, 12)}${line(610, 360, 650, 330, D, 12)}`,
  beanie: ({ P, D }) => `${shadow(640, 190)}${fill("M240 520 Q240 280 400 280 Q560 280 560 520 Z", P)}${rr(225, 500, 350, 90, 22, D, 'opacity="0.7"')}${ell(400, 275, 24, 24, D)}`,
};

function svg(inner, bg, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${label}"><rect width="800" height="800" fill="${bg}"/>${inner}</svg>\n`;
}

mkdirSync("public/products", { recursive: true });
for (const p of catalog.products) {
  const tone = tones[p.tone ?? 0];
  const draw = shapes[p.shape];
  if (!draw) throw new Error(`unknown shape ${p.shape}`);
  const main = draw(tone);
  writeFileSync(`public/products/${p.slug}-1.svg`, svg(main, tone.bg, p.title));
  const detail = `<g transform="translate(400 400) scale(1.75) translate(-400 -440)">${main}</g>`;
  writeFileSync(`public/products/${p.slug}-2.svg`, svg(detail, "#ececec", `${p.title}, detail`));
}
console.log(`wrote ${catalog.products.length * 2} curated images`);

// Shared illustrations for the generated catalogue: /products/<shape>-<tone>-<1|2>.svg.
// 2,400 products cannot each have their own files; they reference one of these by shape and tone.
let shared = 0;
for (const [shape, draw] of Object.entries(shapes)) {
  tones.forEach((tone, i) => {
    const main = draw(tone);
    writeFileSync(`public/products/${shape}-${i}-1.svg`, svg(main, tone.bg, "Product illustration"));
    const detail = `<g transform="translate(400 400) scale(1.75) translate(-400 -440)">${main}</g>`;
    writeFileSync(`public/products/${shape}-${i}-2.svg`, svg(detail, "#ececec", "Product illustration, detail"));
    shared += 2;
  });
}
console.log(`wrote ${shared} shared images`);
