// Time model: every motion shot is rendered on its own, but all times in props are absolute video seconds
// (compile resolves "@word" references), so components ask "where are we in the video" with useT().
import React, {createContext, useContext} from 'react';
import {Easing, interpolate, spring, useCurrentFrame} from 'remotion';
import {SPRING, palette, Palette} from './theme';

export type Word = {text: string; start: number; end: number};
export type Ctx = {t0: number; fps: number; words: Word[]; pal: Palette; pid: string; start: number; end: number};

export const TimeCtx = createContext<Ctx>({t0: 0, fps: 30, words: [], pal: palette(), pid: '', start: 0, end: 1});

export function useCtx(): Ctx {
  return useContext(TimeCtx);
}

export function useT(): number {
  const f = useCurrentFrame();
  const {t0, fps} = useContext(TimeCtx);
  return t0 + f / fps;
}

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// spring progress (0 → 1, may overshoot) that starts at absolute time `at`
export function sp(t: number, at: number | undefined | null, fps: number, cfg: keyof typeof SPRING | object = 'pop', delay = 0): number {
  if (at == null) return 1;
  const c = typeof cfg === 'string' ? SPRING[cfg] : cfg;
  const fr = (t - at - delay) * fps;
  if (fr <= 0) return 0;
  return spring({frame: fr, fps, config: c as any});
}

// eased 0..1 between a and a+dur
export function ramp(t: number, a: number, dur: number, ease: (x: number) => number = Easing.bezier(0.16, 1, 0.3, 1)): number {
  if (dur <= 0) return t >= a ? 1 : 0;
  return interpolate(t, [a, a + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
}

export const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');

// time when `word` is spoken at or after `from` (absolute seconds); null if not found
export function wordTime(words: Word[], word: string, from: number): number | null {
  const n = norm(word);
  if (!n) return null;
  const w = words.find((x) => x.start >= from - 0.35 && (norm(x.text) === n || (n.length > 4 && norm(x.text).startsWith(n.slice(0, -2)))));
  return w ? w.start : null;
}

// ------------------------------------------------------------------ enter / exit presets
export type EnterSpec = string | {type: string; dur?: number; spring?: string; dist?: number};

export function enterStyle(kind: string, p: number, dist = 1): React.CSSProperties {
  const o = clamp01(p * 1.8);
  switch (kind) {
    case 'none': return {};
    case 'fade': return {opacity: clamp01(p)};
    case 'rise': return {opacity: o, translate: `0px ${(1 - p) * 70 * dist}px`};
    case 'drop': return {opacity: o, translate: `0px ${-(1 - p) * 520 * dist}px`};
    case 'left': return {opacity: o, translate: `${-(1 - p) * 700 * dist}px 0px`};
    case 'right': return {opacity: o, translate: `${(1 - p) * 700 * dist}px 0px`};
    case 'pop': return {opacity: o, scale: String(0.55 + 0.45 * p)};
    case 'stamp': return {opacity: clamp01(p * 4), scale: String(1 + 0.9 * (1 - p))};
    case 'zoom': return {opacity: o, scale: String(0.2 + 0.8 * p)};
    case 'wipe': return {clipPath: `inset(0 ${(1 - clamp01(p)) * 100}% 0 0)`};
    case 'blur': return {opacity: o, filter: `blur(${(1 - clamp01(p)) * 24}px)`};
    default: return {opacity: o};
  }
}

const ENTER_SPRING: Record<string, keyof typeof SPRING> = {
  pop: 'pop', stamp: 'heavy', drop: 'heavy', zoom: 'pop', rise: 'snappy', left: 'snappy', right: 'snappy', fade: 'smooth', wipe: 'smooth', blur: 'smooth',
};

// Block wrapper: visible from `at` (space is reserved before, so nothing jumps), leaves at `until`.
export const Reveal: React.FC<{at?: number; until?: number; enter?: EnterSpec; exit?: string; style?: React.CSSProperties; children: React.ReactNode}> = ({
  at, until, enter = 'rise', exit = 'fade', style, children,
}) => {
  const t = useT();
  const {fps} = useCtx();
  const e = typeof enter === 'string' ? {type: enter} : enter;
  const p = sp(t, at, fps, (e.spring as any) || ENTER_SPRING[e.type] || 'snappy');
  let st = at == null ? {} : enterStyle(e.type, p, e.dist ?? 1);
  if (at != null && t < at) st = {...st, opacity: 0};
  if (until != null && t >= until) {
    const q = ramp(t, until, 0.28, Easing.in(Easing.cubic));
    const ex: React.CSSProperties = exit === 'shrink' ? {scale: String(1 - 0.4 * q)} : exit === 'up' ? {translate: `0px ${-q * 120}px`} : exit === 'left' ? {translate: `${-q * 800}px 0px`} : {};
    st = {...st, ...ex, opacity: ((st.opacity as number) ?? 1) * (1 - q)};
  }
  return <div style={{...style, ...st}}>{children}</div>;
};

// light inline markup: **word** → accent, [word](tone) → coloured
export function parseMarks(s: string): {text: string; tone?: string}[] {
  const out: {text: string; tone?: string}[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((\w+|#[0-9a-fA-F]{3,8})\)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({text: s.slice(last, m.index)});
    out.push(m[1] != null ? {text: m[1], tone: 'accent'} : {text: m[2], tone: m[3]});
    last = re.lastIndex;
  }
  if (last < s.length) out.push({text: s.slice(last)});
  return out;
}
