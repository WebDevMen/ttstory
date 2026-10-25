// Backdrop: palette gradient + slow light blobs + optional pattern + film grain + vignette. Deterministic in time.
import React from 'react';
import {AbsoluteFill, random} from 'remotion';
import {useCtx, useT} from './time';

export type BackdropSpec = {
  pattern?: 'none' | 'folk' | 'grid' | 'dots' | 'rays';
  glow?: number;        // strength of the light blobs (0..1.5)
  light?: [number, number]; // main light position in % (x, y)
  grain?: number;
};

const folkTile = (c: string) =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='${c}' stroke-width='3'>` +
  `<path d='M60 14 L88 42 L60 70 L32 42 Z'/><path d='M60 28 L74 42 L60 56 L46 42 Z'/><path d='M0 100 L20 80 L40 100 L20 120 Z'/><path d='M80 100 L100 80 L120 100 L100 120 Z'/></g></svg>`;

export const Backdrop: React.FC<{spec?: BackdropSpec}> = ({spec = {}}) => {
  const t = useT();
  const {pal} = useCtx();
  const g = spec.glow ?? 1;
  const [lx, ly] = spec.light ?? [50, 30];
  const blobs = [0, 1, 2].map((i) => {
    const r = (k: number) => random(`blob${i}${k}`);
    const x = 15 + 70 * r(1) + Math.sin(t * (0.13 + 0.07 * r(2)) + i * 2) * 9;
    const y = 15 + 70 * r(3) + Math.cos(t * (0.11 + 0.06 * r(4)) + i) * 7;
    const s = 620 + 380 * r(5);
    return {x, y, s, a: (0.18 + 0.14 * r(6)) * g};
  });
  let pattern = '';
  if (spec.pattern === 'folk') pattern = `url("data:image/svg+xml;utf8,${encodeURIComponent(folkTile('rgba(255,255,255,0.05)'))}")`;
  return (
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${pal.bg[0]} 0%, ${pal.bg[1]} 55%, ${pal.bg[2]} 100%)`, overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `radial-gradient(60% 40% at ${lx}% ${ly}%, ${pal.glow}55 0%, transparent 70%)`, opacity: g}} />
      {blobs.map((b, i) => (
        <div key={i} style={{position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: b.s, height: b.s, marginLeft: -b.s / 2, marginTop: -b.s / 2,
          borderRadius: '50%', background: i === 1 ? pal.accent : pal.glow, opacity: b.a * (i === 1 ? 0.35 : 1), filter: 'blur(140px)'}} />
      ))}
      {pattern && <AbsoluteFill style={{backgroundImage: pattern, backgroundSize: '120px 120px', backgroundPosition: `0px ${(t * 6) % 120}px`,
        maskImage: 'radial-gradient(70% 55% at 50% 45%, black 0%, transparent 100%)', WebkitMaskImage: 'radial-gradient(70% 55% at 50% 45%, black 0%, transparent 100%)'}} />}
      {spec.pattern === 'grid' && <AbsoluteFill style={{backgroundImage: `linear-gradient(${pal.line} 1px, transparent 1px), linear-gradient(90deg, ${pal.line} 1px, transparent 1px)`,
        backgroundSize: '90px 90px', opacity: 0.35, maskImage: 'radial-gradient(70% 60% at 50% 45%, black, transparent)', WebkitMaskImage: 'radial-gradient(70% 60% at 50% 45%, black, transparent)'}} />}
      {spec.pattern === 'dots' && <AbsoluteFill style={{backgroundImage: `radial-gradient(${pal.line} 2px, transparent 2.5px)`, backgroundSize: '44px 44px', opacity: 0.5,
        maskImage: 'radial-gradient(70% 60% at 50% 45%, black, transparent)', WebkitMaskImage: 'radial-gradient(70% 60% at 50% 45%, black, transparent)'}} />}
      {spec.pattern === 'rays' && <AbsoluteFill style={{background: `repeating-conic-gradient(from ${t * 4}deg at 50% 38%, ${pal.glow}14 0deg 9deg, transparent 9deg 18deg)`,
        maskImage: 'radial-gradient(60% 45% at 50% 38%, black, transparent)', WebkitMaskImage: 'radial-gradient(60% 45% at 50% 38%, black, transparent)'}} />}
      <Vignette />
    </AbsoluteFill>
  );
};

export const Vignette: React.FC<{k?: number}> = ({k = 0.55}) => (
  <AbsoluteFill style={{background: `radial-gradient(120% 85% at 50% 45%, transparent 55%, rgba(0,0,0,${k}) 100%)`, pointerEvents: 'none'}} />
);

// Darkens the part of an illustration where text sits (overlay mode over plates)
export const Scrim: React.FC<{side?: 'top' | 'bottom' | 'both'; k?: number; h?: number}> = ({side = 'top', k = 0.7, h = 46}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {(side === 'top' || side === 'both') && <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: `${h}%`,
      background: `linear-gradient(180deg, rgba(5,6,18,${k}) 0%, rgba(5,6,18,${k * 0.55}) 55%, transparent 100%)`}} />}
    {(side === 'bottom' || side === 'both') && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${h}%`,
      background: `linear-gradient(0deg, rgba(5,6,18,${k}) 0%, rgba(5,6,18,${k * 0.55}) 55%, transparent 100%)`}} />}
  </AbsoluteFill>
);
