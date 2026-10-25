// One motion shot: backdrop (or transparent over an illustration), camera, the stage with stacked blocks laid out by
// flexbox (no hand-placed coordinates), optional free layers and particles.
import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, Easing, random} from 'remotion';
import {Backdrop, Scrim} from './Backdrop';
import {GRID, palette, tone} from './theme';
import {Reveal, TimeCtx, Word, clamp01, ramp, sp, useCtx, useT} from './time';
import {Badge, Kicker, Source, Stamp, Text, Title} from './blocks/text';
import {NumberBlock} from './blocks/number';
import {Proverb} from './blocks/proverb';
import {Bars, Checklist, Meter} from './blocks/data';
import {Card, Comment, IconBlock, Sprite, Versus} from './blocks/ui';

const BLOCKS: Record<string, React.FC<any>> = {
  kicker: Kicker, title: Title, text: Text, number: NumberBlock, proverb: Proverb, versus: Versus, bars: Bars, meter: Meter,
  checklist: Checklist, badge: Badge, stamp: Stamp, source: Source, comment: Comment, icon: IconBlock, card: Card, sprite: Sprite,
  spacer: ({h = 40}) => <div style={{height: h}} />,
};

// blocks that animate their own pieces in: the wrapper only reserves their space
const SELF_ANIMATED = new Set(['title', 'versus', 'bars', 'checklist', 'number', 'meter', 'comment']);
const DEFAULT_ENTER: Record<string, string> = {stamp: 'stamp', badge: 'pop', kicker: 'rise', proverb: 'drop', icon: 'pop', sprite: 'rise', card: 'rise', text: 'rise', source: 'fade'};

export const Block: React.FC<{b: any}> = ({b}) => {
  if (b.type === 'swap') return <SwapBlock b={b} />;
  if (b.type === 'row') return (
    <Reveal at={b.at} until={b.until} enter={b.enter ?? 'none'}>
      <div style={{display: 'flex', gap: b.gap ?? 28, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', maxWidth: GRID.maxText}}>
        {(b.items || []).map((c: any, i: number) => <Block key={i} b={c} />)}
      </div>
    </Reveal>
  );
  const C = BLOCKS[b.type];
  if (!C) throw new Error(`motion: unknown block type '${b.type}' (known: ${Object.keys(BLOCKS).join(', ')}, swap, row)`);
  const self = SELF_ANIMATED.has(b.type);
  return (
    <Reveal at={self ? (b.at != null ? b.at - 0.001 : undefined) : b.at} until={b.until} exit={b.exit}
      enter={self ? 'none' : b.enter ?? DEFAULT_ENTER[b.type] ?? 'rise'}>
      <Float spec={b.float}><C {...b} /></Float>
    </Reveal>
  );
};

// several blocks in one cell: each replaces the previous (until / at), no layout jump
const SwapBlock: React.FC<{b: any}> = ({b}) => (
  <div style={{display: 'grid', placeItems: 'center'}}>
    {(b.items || []).map((c: any, i: number) => <div key={i} style={{gridArea: '1 / 1'}}><Block b={c} /></div>)}
  </div>
);

const Float: React.FC<{spec?: any; children: React.ReactNode}> = ({spec, children}) => {
  const t = useT();
  if (!spec) return <>{children}</>;
  const amp = typeof spec === 'number' ? spec : spec.amp ?? 10, f = spec.freq ?? 0.4;
  return <div style={{translate: `0px ${Math.sin(t * Math.PI * 2 * f) * amp}px`, rotate: `${Math.sin(t * Math.PI * 2 * f * 0.7) * (spec.rot ?? 0)}deg`}}>{children}</div>;
};

// free layer: a block at (x, y) moved by spring keys [{at, x, y, rot, scale, opacity}]
const Layer: React.FC<{l: any}> = ({l}) => {
  const t = useT();
  const {fps} = useCtx();
  let x = l.x ?? 540, y = l.y ?? 960, rot = l.rot ?? 0, sc = l.scale ?? 1, op = 1;
  for (const k of l.keys || []) {
    const p = sp(t, k.at, fps, k.spring ?? 'smooth');
    if (k.x != null) x += (k.x - x) * p;
    if (k.y != null) y += (k.y - y) * p;
    if (k.rot != null) rot += (k.rot - rot) * p;
    if (k.scale != null) sc += (k.scale - sc) * p;
    if (k.opacity != null) op += (k.opacity - op) * p;
  }
  return (
    <div style={{position: 'absolute', left: x, top: y, translate: '-50% -50%', rotate: `${rot}deg`, scale: String(sc), opacity: op}}>
      <Block b={{...l, x: undefined, y: undefined, keys: undefined}} />
    </div>
  );
};

// deterministic particles: sparks (burst), dust (float up), confetti (fall), embers
const Particles: React.FC<{p: any}> = ({p}) => {
  const t = useT();
  const {pal} = useCtx();
  const n = p.count ?? 40, [x0, y0, x1, y1] = p.region ?? [0, 0, 1080, 1920];
  const at = p.at ?? -1e9, life = p.life ?? 1.6;
  const cols = (p.colors ?? [p.color ?? 'accent']).map((c: string) => tone(pal, c));
  const items = [];
  for (let i = 0; i < n; i++) {
    const r = (k: number) => random(`${p.kind}${i}${k}`);
    let x = 0, y = 0, a = 0, s = (p.size ?? 8) * (0.5 + r(1));
    if (p.kind === 'sparks' || p.kind === 'burst') {
      const u = t - at - r(2) * 0.08;
      if (u < 0 || u > life) continue;
      const ang = r(3) * Math.PI * 2, v = (p.speed ?? 900) * (0.3 + r(4));
      x = (x0 + x1) / 2 + Math.cos(ang) * v * u; y = (y0 + y1) / 2 + Math.sin(ang) * v * u + 900 * u * u * (p.gravity ?? 1);
      a = clamp01(1 - u / life);
    } else if (p.kind === 'confetti') {
      const u = (t - at) * (0.6 + r(5) * 0.6) + r(2) * 3;
      if (t < at) continue;
      x = x0 + (x1 - x0) * r(3) + Math.sin(u * 3 + i) * 40; y = y0 + ((u * 420) % (y1 - y0 + 200)) - 100;
      a = 1;
    } else {  // dust / embers: slow rise
      const sp2 = (p.speed ?? 40) * (0.5 + r(4));
      x = x0 + (x1 - x0) * r(3) + Math.sin(t * 0.7 + i) * 20; y = y1 - (((t * sp2) + r(2) * (y1 - y0)) % (y1 - y0));
      a = (p.alpha ?? 0.5) * (0.4 + 0.6 * Math.sin(t * 1.3 + i * 1.7) ** 2) * clamp01((t - at) * 2);
    }
    const c = cols[i % cols.length];
    items.push(<div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: p.kind === 'confetti' ? s * 0.5 : s,
      borderRadius: p.kind === 'confetti' ? 2 : s, background: c, opacity: a, rotate: `${(t * 200 * r(6)) % 360}deg`,
      boxShadow: p.kind === 'confetti' ? 'none' : `0 0 ${s * 1.6}px ${c}`}} />);
  }
  return <AbsoluteFill style={{pointerEvents: 'none'}}>{items}</AbsoluteFill>;
};

// The stage: a flex column between the title-safe top and the captions band. If the blocks are taller than the stage,
// the whole column scales down (never up), so nothing ever runs into the captions or off the frame.
const Stage: React.FC<{top: number; bottom: number; align: any; gap: number; children: React.ReactNode}> = ({top, bottom, align, gap, children}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const avail = bottom - top;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = el.scrollHeight, w = el.scrollWidth;
    const nk = Math.min(1, avail / Math.max(1, h), (GRID.W - 2 * GRID.side) / Math.max(1, w));
    if (Math.abs(nk - k) > 0.005) setK(nk);
  });
  return (
    <div style={{position: 'absolute', left: GRID.side, right: GRID.side, top, height: avail, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: k < 1 ? 'center' : align}}>
      <div ref={ref} data-stage="1" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap, scale: String(k), transformOrigin: '50% 50%'}}>{children}</div>
    </div>
  );
};

const Camera: React.FC<{spec?: any; children: React.ReactNode}> = ({spec = {}, children}) => {
  const t = useT();
  const {start, end} = useCtx();
  const [z0, z1] = spec.zoom ?? [1, 1.035];
  const [y0, y1] = spec.y ?? [0, -14];
  const k = ramp(t, start, Math.max(0.1, end - start), Easing.inOut(Easing.sin));
  let sx = 0, sy = 0;
  for (const s of spec.shakes || []) {
    const u = t - s.at;
    if (u < 0 || u > (s.dur ?? 0.35)) continue;
    const d = Math.exp(-u * 9) * (s.amp ?? 12);
    sx += Math.sin(u * 70) * d; sy += Math.cos(u * 55) * d;
  }
  return <AbsoluteFill style={{scale: String(z0 + (z1 - z0) * k), translate: `${sx}px ${y0 + (y1 - y0) * k + sy}px`}}>{children}</AbsoluteFill>;
};

export type ShotProps = {shot: any; fps: number; words: Word[]; pid: string; overlay?: boolean; frames?: number; f0?: number};

export const ShotComp: React.FC<ShotProps> = ({shot, fps, words, pid, overlay, f0 = 0}) => {
  const m = shot.motion || {};
  const pal = palette(m.palette, m.colors);
  const ctx = {t0: f0 / fps, fps, words, pal, pid, start: shot.start, end: shot.end};
  const align = {top: 'flex-start', center: 'center', bottom: 'flex-end', between: 'space-between'}[m.align ?? 'center'] as any;
  const stage = m.stage ?? {};
  return (
    <TimeCtx.Provider value={ctx}>
      <AbsoluteFill style={{background: overlay ? 'transparent' : pal.bg[1]}}>
        {!overlay && <Camera spec={{zoom: [1.02, 1.08], y: [0, -10]}}><Backdrop spec={m.backdrop} /></Camera>}
        {overlay && m.scrim !== false && <Scrim side={m.scrim?.side ?? 'top'} k={m.scrim?.k ?? 0.72} h={m.scrim?.h ?? 46} />}
        <Camera spec={m.camera}>
          {(m.particles || []).filter((p: any) => p.behind).map((p: any, i: number) => <Particles key={i} p={p} />)}
          {(m.layers || []).filter((l: any) => l.behind).map((l: any, i: number) => <Layer key={i} l={l} />)}
          <Stage top={stage.top ?? GRID.stageTop} bottom={stage.bottom ?? GRID.stageBottom} align={align} gap={m.gap ?? GRID.gap}>
            {(m.blocks || []).filter((b: any) => !b.pos).map((b: any, i: number) => <Block key={i} b={b} />)}
          </Stage>
          {(m.blocks || []).filter((b: any) => b.pos).map((b: any, i: number) => (
            <div key={`p${i}`} style={{position: 'absolute', left: 0, right: 0, top: b.pos.y, translate: '0 -50%', display: 'flex', justifyContent: 'center'}}>
              <Block b={b} />
            </div>
          ))}
          {(m.layers || []).filter((l: any) => !l.behind).map((l: any, i: number) => <Layer key={i} l={l} />)}
          {(m.particles || []).filter((p: any) => !p.behind).map((p: any, i: number) => <Particles key={i} p={p} />)}
        </Camera>
      </AbsoluteFill>
    </TimeCtx.Provider>
  );
};

export {sp};
