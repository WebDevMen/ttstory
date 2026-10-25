// Composite blocks: versus, icon, card, comment (social UI for calls to action), sprite (image from the project).
import React from 'react';
import {Img, staticFile} from 'remotion';
import * as Icons from 'lucide-react';
import {FONTS, TYPE, tone} from '../theme';
import {Proverb} from './proverb';
import {Title} from './text';
import {clamp01, ramp, sp, useCtx, useT} from '../time';

export const Versus: React.FC<any> = ({a, b, vs = 'VS', vs_at, kind = 'proverb'}) => {
  const t = useT();
  const {fps, pal} = useCtx();
  const pa = sp(t, a?.at, fps, 'snappy'), pb = sp(t, b?.at, fps, 'snappy'), pv = sp(t, vs_at, fps, 'pop');
  const hit = b?.at != null ? Math.exp(-Math.max(0, t - b.at - 0.15) * 7) * (t > b.at + 0.15 ? 1 : 0) : 0;
  const side = (s: any, p: number, dir: number) => (
    <div style={{opacity: clamp01(p * 2), translate: `${(1 - p) * 760 * dir}px ${hit * 10 * dir}px`, position: 'relative'}}>
      {kind === 'proverb' ? <Proverb text={s.text} size={s.size ?? 's'} w={860} rot={s.rot ?? dir * -2} id={`vs${dir}`} strike={s.strike} />
        : <Card {...s} />}
      {s.icon && (
        <div style={{position: 'absolute', [dir < 0 ? 'left' : 'right']: -26, bottom: -40, width: 116, height: 116, borderRadius: 58, display: 'grid', placeItems: 'center',
          background: tone(pal, s.color ?? (dir < 0 ? 'pos' : 'accent')), boxShadow: '0 14px 40px rgba(0,0,0,.45)', rotate: `${dir * 8}deg`}}>
          {React.createElement((Icons as any)[s.icon] ?? Icons.Circle, {size: 64, strokeWidth: 2.6, color: '#14121f'})}
        </div>
      )}
    </div>
  );
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30}}>
      {side(a, pa, -1)}
      <div style={{width: 150, height: 150, borderRadius: 75, display: 'grid', placeItems: 'center', background: pal.accent, color: '#14121f',
        fontFamily: FONTS.display, fontWeight: 900, fontSize: 64, scale: String(Math.max(0, pv) * (1 + 0.15 * hit)), boxShadow: `0 0 ${40 + 60 * hit}px ${pal.accent}aa`,
        border: `6px solid ${pal.bg[1]}`, zIndex: 2}}>{vs}</div>
      {side(b, pb, 1)}
    </div>
  );
};

export const IconBlock: React.FC<any> = ({name = 'Sparkles', size = 160, color = 'accent', ring = true}) => {
  const {pal} = useCtx();
  const c = tone(pal, color);
  const Ic = (Icons as any)[name] ?? Icons.Sparkles;
  return (
    <div style={{width: size * 1.6, height: size * 1.6, borderRadius: '50%', display: 'grid', placeItems: 'center', background: ring ? `${c}22` : 'transparent',
      border: ring ? `4px solid ${c}66` : 'none', boxShadow: ring ? `0 0 60px ${c}44` : 'none'}}>
      <Ic size={size} strokeWidth={2.2} color={c} />
    </div>
  );
};

export const Card: React.FC<any> = ({title, text, icon, color = 'accent', w = 860}) => {
  const {pal} = useCtx();
  const c = tone(pal, color);
  const Ic = icon ? (Icons as any)[icon] : null;
  return (
    <div style={{width: w, display: 'flex', gap: 30, alignItems: 'center', padding: '34px 40px', borderRadius: 30, background: pal.panel,
      border: `2px solid ${pal.line}`, boxShadow: '0 30px 60px rgba(0,0,0,.35)', backdropFilter: 'blur(8px)'}}>
      {Ic && <div style={{width: 110, height: 110, flex: 'none', borderRadius: 26, background: `${c}22`, display: 'grid', placeItems: 'center'}}><Ic size={64} strokeWidth={2.4} color={c} /></div>}
      <div style={{display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0}}>
        {title && <div style={{fontFamily: FONTS.display, fontWeight: 800, fontSize: 46, color: pal.ink, lineHeight: 1.1}}>{title}</div>}
        {text && <div style={{fontFamily: FONTS.body, fontWeight: 700, fontSize: 36, color: pal.muted, lineHeight: 1.25}}>{text}</div>}
      </div>
    </div>
  );
};

// A social-media comment being typed: avatar, name, text appearing letter by letter, a like popping in.
export const Comment: React.FC<any> = ({name = 'ты', text = '', at, cps = 22, placeholder, likes, like_at}) => {
  const t = useT();
  const {fps, pal} = useCtx();
  const n = at == null ? text.length : Math.floor(Math.max(0, t - at) * cps);
  const shown = text.slice(0, n);
  const typing = at != null && n < text.length;
  const lp = sp(t, like_at, fps, 'pop');
  return (
    <div style={{width: 900, display: 'flex', gap: 26, padding: '34px 36px', borderRadius: 34, background: '#ffffff', color: '#14121f', boxShadow: '0 40px 80px rgba(0,0,0,.45)'}}>
      <div style={{width: 96, height: 96, flex: 'none', borderRadius: 48, background: `linear-gradient(135deg, ${pal.accent}, ${pal.neg})`, display: 'grid', placeItems: 'center',
        fontFamily: FONTS.display, fontWeight: 800, fontSize: 40, color: '#14121f'}}>{name.slice(0, 1).toUpperCase()}</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0}}>
        <div style={{fontFamily: FONTS.body, fontWeight: 800, fontSize: 32, color: '#6b6378'}}>{name}</div>
        <div style={{fontFamily: FONTS.body, fontWeight: 700, fontSize: 44, lineHeight: 1.25, minHeight: 55}}>
          {shown || <span style={{color: '#b3aec0'}}>{placeholder ?? ''}</span>}
          {(typing || !shown) && <span style={{display: 'inline-block', width: 4, height: 46, marginLeft: 4, verticalAlign: '-6px', background: pal.neg, opacity: Math.floor(t * 2.4) % 2 ? 1 : 0.15}} />}
        </div>
      </div>
      {likes != null && (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, alignSelf: 'center'}}>
          <Icons.Heart size={54} strokeWidth={2.4} color={lp > 0.05 ? '#ff3b5c' : '#9a94a8'} fill={lp > 0.05 ? '#ff3b5c' : 'none'} style={{scale: String(1 + 0.4 * Math.sin(Math.min(1, lp) * Math.PI))}} />
          <div style={{fontFamily: FONTS.body, fontWeight: 800, fontSize: 28, color: '#6b6378'}}>{lp > 0.05 ? likes : ''}</div>
        </div>
      )}
    </div>
  );
};

export const Sprite: React.FC<any> = ({src, h = 500, w, fit = 'contain', radius = 0, shadow = true}) => {
  const {pid} = useCtx();
  return <Img src={staticFile(`${src}`)} style={{height: h, width: w ?? 'auto', objectFit: fit, borderRadius: radius,
    filter: shadow ? 'drop-shadow(0 30px 40px rgba(0,0,0,.45))' : undefined}} data-pid={pid} />;
};

export {Title, ramp};
