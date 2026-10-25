// Text blocks: kicker, title (auto-fit, balanced lines, word-by-word reveal synced to the voice), text, badge, stamp, source.
import React from 'react';
import {measureText} from '@remotion/layout-utils';
import * as Icons from 'lucide-react';
import {FONTS, GRID, TYPE, tone} from '../theme';
import {clamp01, parseMarks, sp, useCtx, useT, wordTime} from '../time';

type Tok = {text: string; tone?: string};

function fontOf(f?: string) {
  return (FONTS as any)[f || 'display'] || f;
}

const widthCache = new Map<string, number>();
function textW(text: string, fontFamily: string, fontSize: number, fontWeight: string | number, letterSpacing = 0) {
  const k = `${text}|${fontFamily}|${fontSize}|${fontWeight}|${letterSpacing}`;
  let w = widthCache.get(k);
  if (w == null) {
    w = measureText({text, fontFamily, fontSize, fontWeight: String(fontWeight), letterSpacing: `${letterSpacing}px`, validateFontIsLoaded: false}).width;
    widthCache.set(k, w);
  }
  return w;
}

// Split into words keeping tone marks, then wrap into at most `maxLines` balanced lines at the largest size that fits.
export function layoutWords(text: string, opt: {size: number; maxW: number; maxLines: number; font: string; weight: number | string; upper?: boolean; letter?: number; min?: number}) {
  const toks: Tok[] = [];
  for (const part of parseMarks(text)) for (const w of part.text.split(/\s+/).filter(Boolean)) toks.push({text: opt.upper ? w.toUpperCase() : w, tone: part.tone});
  const min = opt.min ?? Math.round(opt.size * 0.45);
  for (let fs = opt.size; fs >= min; fs = Math.floor(fs * 0.95)) {
    const ws = toks.map((t) => textW(t.text, opt.font, fs, opt.weight, opt.letter));
    const space = textW(' ', opt.font, fs, opt.weight) + (opt.letter ?? 0);
    if (Math.max(...ws) > opt.maxW) continue;
    const wrap = (W: number) => {
      const lines: number[][] = [[]];
      let cur = 0;
      ws.forEach((w, i) => {
        const add = (lines[lines.length - 1].length ? space : 0) + w;
        if (cur + add > W && lines[lines.length - 1].length) { lines.push([i]); cur = w; } else { lines[lines.length - 1].push(i); cur += add; }
      });
      return lines;
    };
    if (wrap(opt.maxW).length > opt.maxLines) continue;
    // balance: the narrowest width that still gives the same number of lines
    const n = wrap(opt.maxW).length;
    let lo = Math.max(...ws), hi = opt.maxW;
    for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (wrap(mid).length <= n) hi = mid; else lo = mid; }
    return {fs, toks, lines: wrap(hi)};
  }
  const fs = min;
  return {fs, toks, lines: [toks.map((_, i) => i)]};
}

export const Title: React.FC<any> = ({text, size = 'xl', color, upper = true, lines = 3, at, sync, stagger = 0.06, font = 'display', weight = 800,
  width, letter, line_height = 1.04, glow = true, enter = 'rise'}) => {
  const t = useT();
  const {fps, pal, words} = useCtx();
  const ff = fontOf(font);
  const base = typeof size === 'number' ? size : (TYPE as any)[size] ?? TYPE.xl;
  const L = layoutWords(String(text ?? ''), {size: base, maxW: width ?? GRID.maxText, maxLines: lines, font: ff, weight, upper, letter});
  // per-word start times
  let from = at ?? 0;
  const times = L.toks.map((tk, i) => {
    if (at == null) return null;
    if (sync) { const wt = wordTime(words, tk.text, from); if (wt != null) { from = wt + 0.01; return Math.max(at, wt - 0.05); } }
    return at + i * stagger;
  });
  const col = color ? tone(pal, color) : pal.ink;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: L.fs * (line_height - 1)}}>
      {L.lines.map((ln, li) => (
        <div key={li} style={{display: 'flex', gap: `0 ${L.fs * 0.26}px`, justifyContent: 'center', lineHeight: 1}}>
          {ln.map((i) => {
            const tk = L.toks[i];
            const p = sp(t, times[i], fps, enter === 'pop' ? 'pop' : 'snappy');
            const c = tk.tone ? tone(pal, tk.tone) : col;
            const st: React.CSSProperties = enter === 'pop'
              ? {opacity: clamp01(p * 2), scale: String(0.5 + 0.5 * p)}
              : {opacity: clamp01(p * 2), translate: `0px ${(1 - p) * L.fs * 0.55}px`};
            return (
              <span key={i} style={{display: 'inline-block', fontFamily: ff, fontWeight: weight, fontSize: L.fs, color: c, letterSpacing: letter ?? (font === 'display' ? -0.5 : 0),
                textShadow: glow && tk.tone ? `0 0 ${L.fs * 0.35}px ${c}88` : '0 6px 24px rgba(0,0,0,.35)', ...st}}>{tk.text}</span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Kicker: React.FC<any> = ({text, color, icon}) => {
  const {pal} = useCtx();
  const c = tone(pal, color);
  const Ic = icon ? (Icons as any)[icon] : null;
  return (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 16, padding: '14px 28px', borderRadius: 999, background: pal.panel,
      border: `2px solid ${c}55`, fontFamily: FONTS.mono, fontWeight: 700, fontSize: TYPE.small, letterSpacing: '0.16em', color: c, textTransform: 'uppercase'}}>
      {Ic ? <Ic size={30} strokeWidth={2.6} color={c} /> : <span style={{width: 14, height: 14, borderRadius: 7, background: c, boxShadow: `0 0 16px ${c}`}} />}
      {text}
    </div>
  );
};

export const Text: React.FC<any> = ({text, size = 'body', color = 'muted', width, align = 'center', weight = 700, font = 'body'}) => {
  const {pal} = useCtx();
  const fs = typeof size === 'number' ? size : (TYPE as any)[size] ?? TYPE.body;
  return (
    <div style={{maxWidth: width ?? 880, textAlign: align, fontFamily: fontOf(font), fontWeight: weight, fontSize: fs, lineHeight: 1.3, color: tone(pal, color), textWrap: 'balance' as any}}>
      {parseMarks(String(text ?? '')).map((m, i) => <span key={i} style={m.tone ? {color: tone(pal, m.tone), fontWeight: 800} : undefined}>{m.text}</span>)}
    </div>
  );
};

export const Badge: React.FC<any> = ({text, icon, color, style = 'solid', size = 'label'}) => {
  const {pal} = useCtx();
  const c = tone(pal, color);
  const fs = typeof size === 'number' ? size : (TYPE as any)[size] ?? TYPE.label;
  const Ic = icon ? (Icons as any)[icon] : null;
  const solid = style === 'solid';
  return (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: fs * 0.4, padding: `${fs * 0.42}px ${fs * 0.8}px`, borderRadius: fs * 0.5,
      background: solid ? c : 'transparent', border: `${solid ? 0 : 3}px solid ${c}`, color: solid ? '#14121f' : c,
      fontFamily: FONTS.body, fontWeight: 800, fontSize: fs, letterSpacing: '0.02em', textTransform: 'uppercase',
      boxShadow: solid ? `0 10px 40px ${c}55` : 'none'}}>
      {Ic && <Ic size={fs * 1.05} strokeWidth={2.8} />}
      {text}
    </div>
  );
};

export const Stamp: React.FC<any> = ({text, color = 'accent', rot = -5, size = 'l'}) => {
  const {pal} = useCtx();
  const c = tone(pal, color);
  const base = typeof size === 'number' ? size : (TYPE as any)[size] ?? TYPE.l;
  const L = layoutWords(String(text), {size: base, maxW: GRID.maxText - 120, maxLines: 2, font: FONTS.display, weight: 900, upper: true});
  return (
    <div style={{rotate: `${rot}deg`, padding: `${L.fs * 0.22}px ${L.fs * 0.4}px`, border: `${Math.max(6, L.fs * 0.08)}px solid ${c}`, borderRadius: L.fs * 0.2,
      color: c, fontFamily: FONTS.display, fontWeight: 900, fontSize: L.fs, lineHeight: 1.02, textAlign: 'center', textTransform: 'uppercase',
      background: 'rgba(10,10,24,.55)', boxShadow: `0 0 50px ${c}55, inset 0 0 30px ${c}22`, textShadow: `0 0 26px ${c}aa`}}>
      {L.lines.map((ln, i) => <div key={i}>{ln.map((k) => L.toks[k].text).join(' ')}</div>)}
    </div>
  );
};

export const Source: React.FC<any> = ({text}) => {
  const {pal} = useCtx();
  return <div style={{fontFamily: FONTS.mono, fontSize: 26, color: pal.muted, opacity: 0.8, letterSpacing: '0.04em'}}>{text}</div>;
};
