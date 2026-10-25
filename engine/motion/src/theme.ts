// Design system of the motion engine: palettes, type scale, layout grid and motion curves.
// Every scene draws from these tokens, so all videos share one careful look. Project YAML picks a palette by name
// (`motion.palette: night`) and may override single tokens (`motion.colors: {accent: "#ffd34d"}`).

export type Palette = {
  bg: [string, string, string]; // backdrop gradient: top, middle, bottom
  glow: string;                 // soft light blobs behind the content
  accent: string;               // the one highlight colour (titles, kickers, numbers)
  pos: string;                  // "yes / better / possible"
  neg: string;                  // "no / worse / risk"
  ink: string;                  // main text
  muted: string;                // secondary text
  card: string;                 // paper cards (proverbs, quotes)
  cardInk: string;
  folk: string;                 // ornament colour on paper cards
  line: string;                 // hairlines, tracks
  panel: string;                // translucent panels on the backdrop
};

export const PALETTES: Record<string, Palette> = {
  night: {
    bg: ['#090b20', '#141a45', '#262c6a'], glow: '#5b4dff', accent: '#ffcf4a', pos: '#b6ff3b', neg: '#ff5a4e',
    ink: '#f6f4ff', muted: '#aab0dc', card: '#f4e8cc', cardInk: '#2b1b10', folk: '#c3283a', line: 'rgba(255,255,255,.16)',
    panel: 'rgba(255,255,255,.07)',
  },
  ember: {
    bg: ['#120806', '#2a140a', '#4b2410'], glow: '#ff7a2e', accent: '#ffc24a', pos: '#c6ff4a', neg: '#ff4b3e',
    ink: '#fff6ec', muted: '#d9b9a0', card: '#f6e7cc', cardInk: '#2b1b10', folk: '#c3283a', line: 'rgba(255,255,255,.16)',
    panel: 'rgba(255,255,255,.07)',
  },
  dusk: {
    bg: ['#0d0718', '#25113d', '#4a1f5e'], glow: '#ff4fa3', accent: '#ffcf4a', pos: '#b6ff3b', neg: '#ff5a4e',
    ink: '#fff4fb', muted: '#cfb3d9', card: '#f4e8cc', cardInk: '#2b1b10', folk: '#c3283a', line: 'rgba(255,255,255,.16)',
    panel: 'rgba(255,255,255,.07)',
  },
  forest: {
    bg: ['#04100c', '#0b2a20', '#174634'], glow: '#2fe0a0', accent: '#ffd34d', pos: '#b6ff3b', neg: '#ff5a4e',
    ink: '#effff7', muted: '#a8d6c2', card: '#f4e8cc', cardInk: '#2b1b10', folk: '#c3283a', line: 'rgba(255,255,255,.16)',
    panel: 'rgba(255,255,255,.07)',
  },
  paper: {
    bg: ['#f7f1e4', '#efe4cd', '#e4d3b2'], glow: '#ffb36b', accent: '#d2342b', pos: '#1f8a4c', neg: '#d2342b',
    ink: '#1d1a2e', muted: '#6b6378', card: '#ffffff', cardInk: '#1d1a2e', folk: '#c3283a', line: 'rgba(29,26,46,.16)',
    panel: 'rgba(29,26,46,.06)',
  },
};

export const FONTS = {
  display: '"Unbounded", "Montserrat", sans-serif',   // titles, numbers, stamps
  body: '"Manrope", "Montserrat", sans-serif',         // running text, labels
  folk: '"Kurale", "Playfair Display", serif',         // proverbs, quotes, old wisdom
  mono: '"JetBrains Mono", monospace',                 // kickers, sources, counters in UI
};

// Type scale (px on the 1080x1920 canvas). Pick by name; the engine shrinks a title to fit, never grows it.
export const TYPE = {
  hero: 132, xl: 112, l: 92, m: 74, s: 58,    // display
  lead: 50, body: 42, label: 36, small: 30,   // body / labels
  number: 230,
};

// Layout grid. Content lives on the stage; the band below it belongs to the captions.
export const GRID = {
  W: 1080, H: 1920,
  side: 72,              // side margin of the stage
  stageTop: 250,         // under the platform's top UI
  stageBottom: 1180,     // captions band starts below (≈1220–1430)
  gap: 40,               // vertical rhythm between blocks
  maxText: 936,          // W - 2*side
};

// Motion curves (Remotion spring configs). Springs instead of linear moves: things arrive with weight and settle.
export const SPRING = {
  pop: {damping: 12, mass: 0.7, stiffness: 170},        // playful arrival with a small overshoot
  snappy: {damping: 18, mass: 0.6, stiffness: 240},     // UI elements, words
  smooth: {damping: 200, mass: 1, stiffness: 100},      // no overshoot: bars, meters, camera
  heavy: {damping: 14, mass: 1.6, stiffness: 140},      // falling boards, stamps
};

export function palette(name?: string, over?: Partial<Palette>): Palette {
  return {...(PALETTES[name || 'night'] || PALETTES.night), ...(over || {})} as Palette;
}

// tone name -> colour
export function tone(p: Palette, t?: string): string {
  if (!t) return p.accent;
  if (t in p) return (p as any)[t];
  return t;
}
