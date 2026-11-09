import * as THREE from 'three';
import { SAUCES } from '../data.js';

const P = (x, y) => new THREE.Vector2(x, y);

// 5 oz woozy profile, measured off the product photos (body radius = 1).
function glassProfile() {
  const base = new THREE.SplineCurve([P(0.72, 0), P(0.88, 0.015), P(0.97, 0.09), P(1, 0.26)]).getPoints(18);
  const shoulder = new THREE.SplineCurve([
    P(1, 4.5), P(0.985, 4.78), P(0.9, 5.05), P(0.74, 5.3), P(0.62, 5.55), P(0.555, 5.85), P(0.54, 6.2),
  ]).getPoints(56);
  return [P(0, 0.03), ...base, ...shoulder, P(0.54, 7.02)];
}

const FILL_Y = 5.44;

function sauceProfile() {
  const pts = glassProfile().filter((p) => p.y <= FILL_Y).map((p) => P(p.x * 0.956, Math.max(p.y, 0.05)));
  const last = pts[pts.length - 1];
  return [...pts, P(last.x * 0.7, FILL_Y + 0.015), P(0, FILL_Y)];
}

function capGeometry() {
  const pts = [
    P(0.6, 7.0), P(0.665, 7.01), P(0.67, 7.1), P(0.67, 7.95),
    ...new THREE.SplineCurve([P(0.67, 7.95), P(0.655, 8.08), P(0.58, 8.15), P(0.45, 8.17)]).getPoints(14),
    P(0, 8.17),
  ];
  const geo = new THREE.LatheGeometry(pts, 180);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 7.08 || y > 7.93) continue;
    const a = Math.atan2(pos.getX(i), pos.getZ(i));
    const k = 1 + 0.017 * Math.pow(Math.abs(Math.cos(a * 22)), 0.7);
    pos.setX(i, pos.getX(i) * k);
    pos.setZ(i, pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function shrinkBand() {
  const pts = [P(0.56, 6.32), P(0.575, 6.36), P(0.585, 6.7), P(0.6, 7.03)];
  return new THREE.LatheGeometry(pts, 96);
}

function fleckTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const r = Math.random() * 1.9 + 0.3;
    const v = Math.random();
    x.fillStyle = v > 0.72 ? 'rgba(255,226,170,.5)' : 'rgba(40,14,6,.42)';
    x.beginPath();
    x.arc(Math.random() * 512, Math.random() * 512, r, 0, 6.3);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2.4, 2.4);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function residueAlpha() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#000';
  x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 90; i++) {
    const px = Math.random() * 512;
    const len = 30 + Math.random() * 190;
    const g = x.createLinearGradient(0, 256, 0, 256 - len);
    g.addColorStop(0, 'rgba(255,255,255,.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(px, 256 - len, 2 + Math.random() * 12, len);
  }
  return new THREE.CanvasTexture(c);
}

// White paper wrap. The art covers about 118 degrees of the front; this panel is centred on the back.
function backPanel(s, k) {
  const c = document.createElement('canvas');
  c.width = Math.round(2048 * k);
  c.height = Math.round(1200 * k);
  const x = c.getContext('2d');
  x.scale(k, k);
  const CX = 1024;
  const W = 700;
  const setFit = (font, text, size, width = W) => {
    let s = size;
    x.font = font(s);
    while (s > 18 && x.measureText(text).width > width) x.font = font(--s);
    return s;
  };
  const wrap = (text, width) => {
    const lines = [];
    let line = '';
    text.split(' ').forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (x.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    });
    return [...lines, line];
  };
  // Short lists of confirmed items print big; a full ingredient list wraps to fit.
  const ink = '#17110e';
  const accent = `#${s.c2.toString(16).padStart(6, '0')}`;
  x.fillStyle = '#f4f1ea';
  x.fillRect(0, 0, 2048, 1200);
  x.textAlign = 'center';
  x.textBaseline = 'alphabetic';
  x.fillStyle = ink;
  x.font = '500 28px "Martian Mono Variable"';
  x.fillText("JOHN & TERRY'S VOLCANO SAUCE", CX, 96, W);

  const nameSize = setFit((n) => `900 ${n}px "Big Shoulders Display"`, s.name.toUpperCase(), 138);
  x.fillText(s.name.toUpperCase(), CX, 104 + nameSize * 0.92);
  let y = 104 + nameSize * 0.92 + 30;
  x.fillStyle = accent;
  x.fillRect(CX - W / 2, y, W, 12);
  y += 66;

  x.fillStyle = ink;
  x.font = '700 32px "Martian Mono Variable"';
  x.fillText(s.ingredients ? 'INGREDIENTS' : 'MADE WITH', CX, y);
  y += 30;

  const bottom = 955;
  if (s.ingredients) {
    const text = s.ingredients.join(', ');
    let size = 64;
    let lines;
    do {
      size -= 2;
      x.font = `400 ${size}px "Instrument Serif"`;
      lines = wrap(text, W);
    } while (size > 26 && lines.length * size * 1.08 > bottom - y);
    const lh = size * 1.08;
    lines.forEach((l, i) => x.fillText(l, CX, y + (bottom - y - lines.length * lh) / 2 + lh * (i + 0.8)));
  } else {
    const items = s.made.map((m) => m.toUpperCase());
    const room = (bottom - y) / items.length;
    const size = Math.min(148, Math.floor(room * 0.94), ...items.map((m) => setFit((n) => `800 ${n}px "Big Shoulders Display"`, m, 148)));
    x.font = `800 ${size}px "Big Shoulders Display"`;
    const lh = Math.min(room, size * 1.06);
    const top = y + (bottom - y - lh * items.length) / 2;
    items.forEach((m, i) => x.fillText(m, CX, top + lh * i + size * 0.92));
  }

  x.fillStyle = accent;
  x.fillRect(CX - W / 2, bottom + 14, W, 12);
  x.fillStyle = ink;
  x.font = '400 46px "Instrument Serif"';
  x.fillText('We might burn you with a few.', CX, bottom + 84, W);
  x.font = '500 23px "Martian Mono Variable"';
  x.fillText('VETERAN OWNED  ·  KNOXVILLE, TN  ·  5 OZ (148 ML)', CX, bottom + 132, W);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Product-shot lighting: tall softboxes, a top bank, and lava bouncing up from below.
function buildEnvironment(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020101);
  const box = (w, h, color, power, pos) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  box(3.2, 20, 0xfff2e2, 16, [-11, 1, 7]);
  box(1.4, 20, 0xffe6cc, 11, [12, 1, 5]);
  box(12, 5, 0xfff4ea, 3.5, [0, 13, 2]);
  box(24, 10, 0xff4a10, 1.1, [0, -11, 4]);
  box(5, 16, 0xff3a0c, 2.6, [10, -1, -9]);
  box(5, 16, 0xff5a18, 2.6, [-10, -1, -9]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  return env;
}

export function createBottle(renderer, labelTextures, lowPower) {
  // Phones get the same look without the second specular layer
  const surface = (params) => {
    if (!lowPower) return new THREE.MeshPhysicalMaterial(params);
    const { clearcoat, clearcoatRoughness, specularIntensity, ior, ...rest } = params;
    return new THREE.MeshStandardMaterial(rest);
  };
  const env = buildEnvironment(renderer);
  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = -4.08;
  group.add(inner);

  // Sauce
  const sauceMat = surface({
    color: 0xb03a12, map: fleckTexture(), roughness: 0.42, clearcoat: 0.25, envMap: env, envMapIntensity: 0.5,
    emissive: 0xb03a12, emissiveIntensity: 0.07,
  });
  inner.add(new THREE.Mesh(new THREE.LatheGeometry(sauceProfile(), 96), sauceMat));

  // Film of sauce clinging to the empty neck
  const residueMat = new THREE.MeshStandardMaterial({
    color: 0xb03a12, alphaMap: residueAlpha(), transparent: true, opacity: 0.55, roughness: 0.5, envMap: env,
    envMapIntensity: 0.4, side: THREE.DoubleSide, depthWrite: false,
  });
  const residue = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.56, 0.95, 64, 1, true), residueMat);
  residue.position.y = FILL_Y + 0.46;
  inner.add(residue);

  // Glass: reflections only (additive), so whatever sits behind the neck shows through
  const glassGeo = new THREE.LatheGeometry(glassProfile(), 128);
  const glassMat = surface({
    color: 0x000000, roughness: 0.05, envMap: env, envMapIntensity: 1.5, specularIntensity: 1, ior: 1.52,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.renderOrder = 4;
  inner.add(glass);
  const glassBack = new THREE.Mesh(glassGeo, glassMat.clone());
  glassBack.material.side = THREE.BackSide;
  glassBack.material.envMapIntensity = 0.7;
  glassBack.renderOrder = 3;
  inner.add(glassBack);

  // Faint body so the empty neck reads as glass, not as nothing
  const tintMat = new THREE.MeshBasicMaterial({ color: 0x241a14, transparent: true, opacity: 0.2, depthWrite: false });
  const neckTint = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.56, 1.3, 48, 1, true), tintMat);
  neckTint.position.y = FILL_Y + 0.62;
  neckTint.renderOrder = 2;
  inner.add(neckTint);

  // Cap and shrink seal
  const capMat = surface({ color: 0x060607, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, envMap: env, envMapIntensity: 1.2 });
  inner.add(new THREE.Mesh(capGeometry(), capMat));
  const bandMat = surface({ color: 0x08080a, roughness: 0.5, clearcoat: 0.5, envMap: env, envMapIntensity: 0.9 });
  inner.add(new THREE.Mesh(shrinkBand(), bandMat));

  // Label
  const LABEL_H = 3.74;
  const LABEL_Y = 0.36 + LABEL_H / 2;
  // Every print goes to the GPU up front, so no swap can hitch the scroll
  const backs = SAUCES.map((s) => backPanel(s, lowPower ? 0.6 : 1));
  [...backs, ...labelTextures].forEach((t) => renderer.initTexture(t));
  const paperMat = surface({ map: backs[0], roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.4, envMap: env, envMapIntensity: 0.55 });
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(1.012, 1.012, LABEL_H, 128, 1, true), paperMat);
  paper.position.y = LABEL_Y;
  inner.add(paper);

  const arc = (LABEL_H * (1104 / 1976)) / 1.018;
  const artMat = surface({ map: labelTextures[0], roughness: 0.46, clearcoat: 0.3, clearcoatRoughness: 0.4, envMap: env, envMapIntensity: 0.55 });
  const art = new THREE.Mesh(new THREE.CylinderGeometry(1.018, 1.018, LABEL_H, 72, 1, true, -arc / 2, arc), artMat);
  art.position.y = LABEL_Y;
  inner.add(art);

  const colorA = new THREE.Color();
  const colorB = new THREE.Color();
  let currentLabel = 0;
  let currentBack = 0;

  return {
    group,
    /** Crossfade sauce color from a to b by t. Each print swaps while it faces away: the art at t=.4, the back panel at t=.6. */
    setSauce(a, b, t) {
      colorA.setHex(SAUCES[a].sauce);
      colorB.setHex(SAUCES[b].sauce);
      colorA.lerp(colorB, t);
      sauceMat.color.copy(colorA);
      sauceMat.emissive.copy(colorA);
      residueMat.color.copy(colorA);
      const wantBack = t < 0.6 ? a : b;
      if (wantBack !== currentBack) {
        currentBack = wantBack;
        paperMat.map = backs[wantBack];
      }
      const want = t < 0.4 ? a : b;
      if (want !== currentLabel) {
        currentLabel = want;
        artMat.map = labelTextures[want];
      }
    },
  };
}
