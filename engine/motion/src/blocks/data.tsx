// Data blocks: horizontal comparison bars, a meter with a threshold mark, a checklist. All share one track style.
import React from 'react';
import * as Icons from 'lucide-react';
import {FONTS, TYPE, tone} from '../theme';
import {fmtNum} from './number';
import {clamp01, sp, useCtx, useT} from '../time';

const W = 900;

export const Bars: React.FC<any> = ({items = [], max, unit = '', values = true, decimals = 0, h = 84, gap = 46, at}) => {
  const t = useT();
  const {fps, pal} = useCtx();
  const mx = max ?? Math.max(...items.map((i: any) => i.value)) * 1.08;
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap, width: W}}>
      {items.map((it: any, i: number) => {
        const a = it.at ?? at;
        const p = Math.max(0, sp(t, a, fps, 'smooth'));
        const c = tone(pal, it.color ?? (i ? 'pos' : 'neg'));
        const frac = (it.value / mx) * p;
        const lab = sp(t, a, fps, 'snappy');
        return (
          <div key={i} style={{display: 'flex', flexDirection: 'column', gap: 14, opacity: a == null || t >= a - 0.4 ? 1 : 0.0}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: FONTS.body, fontWeight: 800, fontSize: TYPE.label,
              color: pal.ink, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: clamp01(lab * 1.5), translate: `${(1 - Math.min(1, lab)) * -40}px 0px`}}>
              <span>{it.label}</span>
              {it.note && <span style={{color: pal.muted, fontSize: TYPE.small, textTransform: 'none', letterSpacing: 0}}>{it.note}</span>}
            </div>
            <div style={{position: 'relative', height: h, borderRadius: h * 0.24, background: pal.panel, border: `2px solid ${pal.line}`, overflow: 'hidden'}}>
              <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${frac * 100}%`, borderRadius: h * 0.22,
                background: `linear-gradient(90deg, ${c}cc, ${c})`, boxShadow: `0 0 34px ${c}66`}} />
              {values && (
                <div style={{position: 'absolute', top: 0, bottom: 0, display: 'flex', alignItems: 'center', left: `calc(${frac * 100}% - ${frac > 0.3 ? 20 : -20}px)`,
                  translate: frac > 0.3 ? '-100% 0' : '0 0', fontFamily: FONTS.display, fontWeight: 800, fontSize: h * 0.48,
                  color: frac > 0.3 ? '#14121f' : c, opacity: clamp01(p * 3), fontVariantNumeric: 'tabular-nums'}}>
                  {fmtNum(it.value * Math.min(1, p), decimals)}{unit}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Meter: React.FC<any> = ({label, value = 70, at, dur = 1.2, max = 100, unit = '%', color = 'pos', mark, mark_label, mark_at}) => {
  const t = useT();
  const {fps, pal} = useCtx();
  const c = tone(pal, color);
  const p = Math.max(0, sp(t, at, fps, {damping: 26, mass: 1.2, stiffness: 60}));
  const v = value * Math.min(1.02, p);
  const reached = mark != null && v >= mark - 0.5;
  const mk = mark_at != null ? sp(t, mark_at, fps, 'pop') : reached ? 1 : 0;
  const h = 70;
  return (
    <div style={{width: W, display: 'flex', flexDirection: 'column', gap: 18}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: FONTS.body, fontWeight: 800, fontSize: TYPE.label, color: pal.ink, letterSpacing: '0.06em', textTransform: 'uppercase'}}>
        <span>{label}</span>
        <span style={{fontFamily: FONTS.display, color: c, fontVariantNumeric: 'tabular-nums'}}>{Math.round(v)}{unit}</span>
      </div>
      <div style={{position: 'relative', height: h}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: h / 2, background: pal.panel, border: `2px solid ${pal.line}`, overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(v / max) * 100}%`, borderRadius: h / 2, background: `linear-gradient(90deg, ${c}aa, ${c})`, boxShadow: `0 0 30px ${c}77`}} />
          {[...Array(9)].map((_, i) => <div key={i} style={{position: 'absolute', top: 14, bottom: 14, left: `${(i + 1) * 10}%`, width: 2, background: pal.line}} />)}
        </div>
        {mark != null && (
          <div style={{position: 'absolute', left: `${(mark / max) * 100}%`, top: -26, bottom: -26, width: 6, marginLeft: -3, borderRadius: 3,
            background: pal.ink, opacity: clamp01(mk * 2), boxShadow: reached ? `0 0 26px ${pal.ink}` : 'none'}} />
        )}
      </div>
      {mark != null && mark_label && (
        <div style={{position: 'relative', height: TYPE.label * 1.3}}>
          <div style={{position: 'absolute', left: `${(mark / max) * 100}%`, translate: '-50% 0', fontFamily: FONTS.display, fontWeight: 800, fontSize: TYPE.label,
            color: c, whiteSpace: 'nowrap', opacity: clamp01(mk * 2), scale: String(0.6 + 0.4 * Math.min(1.2, mk))}}>{mark_label}</div>
        </div>
      )}
    </div>
  );
};

export const Checklist: React.FC<any> = ({items = [], color = 'pos', size = 'lead'}) => {
  const t = useT();
  const {fps, pal} = useCtx();
  const fs = (TYPE as any)[size] ?? TYPE.lead;
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: fs * 0.55, width: W}}>
      {items.map((it: any, i: number) => {
        const p = sp(t, it.at, fps, 'pop');
        const c = tone(pal, it.color ?? color);
        const Ic = (Icons as any)[it.icon ?? (it.no ? 'X' : 'Check')];
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: fs * 0.5, opacity: clamp01(p * 2), translate: `${(1 - Math.min(1, p)) * -60}px 0px`}}>
            <div style={{width: fs * 1.25, height: fs * 1.25, borderRadius: fs * 0.32, background: c, display: 'grid', placeItems: 'center', flex: 'none', scale: String(Math.max(0, p)), boxShadow: `0 0 24px ${c}66`}}>
              <Ic size={fs * 0.85} strokeWidth={3.2} color="#14121f" />
            </div>
            <div style={{fontFamily: FONTS.body, fontWeight: 800, fontSize: fs, color: pal.ink, lineHeight: 1.15}}>{it.text}</div>
          </div>
        );
      })}
    </div>
  );
};
