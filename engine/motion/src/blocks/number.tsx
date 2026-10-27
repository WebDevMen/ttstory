// Big number: a counter that runs from `from` to `value` and lands with a spring bump. Russian number formatting.
import React from 'react';
import {Easing} from 'remotion';
import {FONTS, TYPE, tone} from '../theme';
import {layoutWords} from './text';
import {ramp, sp, useCtx, useT} from '../time';

export function fmtNum(v: number, decimals = 0, sep = ' ') {
  const s = Math.abs(v).toFixed(decimals);
  const [i, d] = s.split('.');
  const ii = i.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return `${v < 0 ? '−' : ''}${ii}${d ? ',' + d : ''}`;
}

export const NumberBlock: React.FC<any> = ({value = 0, from = 0, prefix = '', suffix = '', decimals = 0, label, color = 'accent', at, dur = 1.0, size = 'number'}) => {
  const t = useT();
  const {fps, pal} = useCtx();
  const c = tone(pal, color);
  const k = at == null ? 1 : ramp(t, at, dur, Easing.out(Easing.cubic));
  const v = from + (value - from) * k;
  const land = at == null ? 0 : sp(t, at + dur, fps, 'pop');
  const bump = 1 + 0.08 * Math.sin(Math.min(1, land) * Math.PI);
  const base = typeof size === 'number' ? size : (TYPE as any)[size] ?? TYPE.number;
  // size from the longest value so the block never changes width while counting
  const longest = `${prefix}${fmtNum(Math.max(Math.abs(value), Math.abs(from)), decimals)}${suffix}`;
  const fit = layoutWords(longest.replace(/\s/g, '_'), {size: base, maxW: 936, maxLines: 1, font: FONTS.display, weight: 800}).fs;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
      <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: fit, lineHeight: 1, color: c, fontVariantNumeric: 'tabular-nums',
        textShadow: `0 0 ${fit * 0.25}px ${c}77`, scale: String(bump), whiteSpace: 'nowrap'}}>
        {prefix && <span style={{fontSize: '0.62em', verticalAlign: '0.28em'}}>{prefix}</span>}
        {fmtNum(v, decimals)}
        {suffix && <span style={{fontSize: '0.45em', marginLeft: '0.12em'}}>{suffix}</span>}
      </div>
      {label && <div style={{fontFamily: FONTS.body, fontWeight: 800, fontSize: TYPE.label, letterSpacing: '0.08em', textTransform: 'uppercase', color: pal.ink, opacity: 0.9}}>{label}</div>}
    </div>
  );
};
