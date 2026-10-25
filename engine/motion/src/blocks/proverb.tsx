// Proverb card: aged paper with a folk ornament, the saying in an old-Russian typeface. It can be struck out,
// crack and break in two (the halves fall with gravity) — the visual language of "this wisdom is not a law".
import React from 'react';
import {random} from 'remotion';
import {FONTS, TYPE, tone} from '../theme';
import {layoutWords} from './text';
import {clamp01, ramp, sp, useCtx, useT} from '../time';

const ornament = (c: string, c2: string) => {
  const cell = (x: number) => `<path d='M${x + 14} 4 L${x + 24} 14 L${x + 14} 24 L${x + 4} 14 Z' fill='${c}'/><path d='M${x + 14} 9 L${x + 19} 14 L${x + 14} 19 L${x + 9} 14 Z' fill='${c2}'/>` +
    `<rect x='${x + 26}' y='12' width='4' height='4' fill='${c}'/>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='32' height='28'>${cell(0)}</svg>`)}")`;
};
const paperNoise = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' seed='4'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .33  0 0 0 0 .2  0 0 0 .22 0'/></filter><rect width='300' height='300' filter='url(#n)'/></svg>")}")`;

function crackPoints(seed: string) {
  const pts: [number, number][] = [[50, 0]];
  for (let i = 1; i < 9; i++) pts.push([50 + (random(seed + i) - 0.5) * 9, (100 * i) / 9]);
  pts.push([50, 100]);
  return pts;
}

export const Proverb: React.FC<any> = ({text, w = 900, size = 'm', rot = 0, color, strike, crack, break: brk, dim, quote = true, id = 'p'}) => {
  const t = useT();
  const {fps, pal} = useCtx();
  const base = typeof size === 'number' ? size : (TYPE as any)[size] ?? TYPE.m;
  const L = layoutWords(String(text), {size: base, maxW: w - 150, maxLines: 3, font: FONTS.folk, weight: 400, upper: false, min: 34});
  const ink = pal.cardInk;
  const card = color ? tone(pal, color) : pal.card;
  const pts = crackPoints(id + text);
  const kc = crack == null ? 0 : ramp(t, crack, 0.35);
  const kb = brk == null || t < brk ? 0 : (t - brk);
  const ks = strike == null ? 0 : ramp(t, strike, 0.4);
  const band = 30;
  const face = (
    <div style={{position: 'relative', width: w, padding: `${band + 34}px 70px`, background: card, borderRadius: 22, boxSizing: 'border-box',
      boxShadow: '0 30px 60px rgba(0,0,0,.45), inset 0 0 0 3px rgba(80,50,20,.18), inset 0 0 70px rgba(120,80,30,.25)'}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 22, backgroundImage: paperNoise, opacity: 0.9, mixBlendMode: 'multiply'}} />
      <div style={{position: 'absolute', left: 26, right: 26, top: 16, height: band, backgroundImage: ornament(pal.folk, card), backgroundRepeat: 'repeat-x', backgroundPosition: 'center'}} />
      <div style={{position: 'absolute', left: 26, right: 26, bottom: 16, height: band, backgroundImage: ornament(pal.folk, card), backgroundRepeat: 'repeat-x', backgroundPosition: 'center'}} />
      <div style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONTS.folk, fontSize: L.fs, lineHeight: 1.12, color: ink, opacity: dim ? 0.55 : 1}}>
        {L.lines.map((ln, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {quote && i === 0 && <span style={{color: pal.folk}}>«</span>}
            {ln.map((k) => L.toks[k].text).join(' ')}
            {quote && i === L.lines.length - 1 && <span style={{color: pal.folk}}>»</span>}
          </div>
        ))}
      </div>
      {ks > 0 && (
        <svg style={{position: 'absolute', inset: 0, overflow: 'visible'}} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M6,58 C30,50 60,62 94,46" stroke={pal.neg} strokeWidth={2.2} vectorEffect="non-scaling-stroke" fill="none" strokeLinecap="round"
            pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ks} style={{strokeWidth: 16}} />
        </svg>
      )}
    </div>
  );
  if (kb <= 0) {
    return (
      <div style={{position: 'relative', rotate: `${rot}deg`}}>
        {face}
        {kc > 0 && (
          <svg style={{position: 'absolute', inset: 0, overflow: 'visible'}} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#1b0f08" vectorEffect="non-scaling-stroke"
              style={{strokeWidth: 7}} strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - kc} />
          </svg>
        )}
      </div>
    );
  }
  // broken: two halves fall apart under gravity
  const g = 2600, fall = 0.5 * g * kb * kb, spin = 40 * kb;
  const leftPoly = `polygon(0% 0%, ${pts.map(([x, y]) => `${x}% ${y}%`).join(', ')}, 0% 100%)`;
  const rightPoly = `polygon(100% 0%, ${pts.map(([x, y]) => `${x}% ${y}%`).join(', ')}, 100% 100%)`;
  const fade = clamp01(1 - (kb - 0.45) / 0.3);
  return (
    <div style={{position: 'relative', rotate: `${rot}deg`, opacity: fade}}>
      <div style={{clipPath: leftPoly, translate: `${-90 * kb}px ${fall}px`, rotate: `${-spin}deg`, transformOrigin: '25% 50%'}}>{face}</div>
      <div style={{position: 'absolute', inset: 0, clipPath: rightPoly, translate: `${90 * kb}px ${fall * 1.1}px`, rotate: `${spin * 1.2}deg`, transformOrigin: '75% 50%'}}>{face}</div>
    </div>
  );
};
