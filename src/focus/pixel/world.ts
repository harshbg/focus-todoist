import type { Palette, Sprite } from './sprites';

export interface WorldDetail {
  sprite: Sprite;
  x: number;
  y: number;
}

/** Palette mapping characters used in world details to --px-* CSS variables. */
export const WORLD_PALETTE: Palette = {
  // Brick, stone, and mortar
  m: 'var(--px-mortar)',
  L: 'var(--px-brick-light)',
  b: 'var(--px-brick)',
  d: 'var(--px-brick-dark)',
  s: 'var(--px-stone)',
  // Foliage, flora, trunks, and water
  g: 'var(--px-leaf)',
  D: 'var(--px-leaf-dark)',
  T: 'var(--px-trunk)',
  f: 'var(--px-flower)',
  w: 'var(--px-water)',
  // Light, gold, paper, and ink
  Y: 'var(--px-gold)',
  c: 'var(--px-cloud)',
  p: 'var(--px-paper)',
  k: 'var(--px-ink)',
  F: 'var(--px-frame)',
  u: 'var(--px-ground)',
  U: 'var(--px-ground-dark)',
};

/**
 * One permanent detail per trophy id (all 39 in TROPHIES from ../domain/trophies),
 * each a small sprite at a fixed spot in a 160×90 scene.
 */
export const WORLD_DETAILS: Readonly<Record<string, WorldDetail>> = {
  // =========================================================================
  // Sessions family (8): path stones leading into the clearing & milestone post
  // =========================================================================
  'sessions-1': {
    sprite: [
      '.ss.',
      'ssss',
    ],
    x: 78,
    y: 78,
  },
  'sessions-10': {
    sprite: [
      'ss.',
      '.ss',
    ],
    x: 76,
    y: 74,
  },
  'sessions-25': {
    sprite: [
      '.ss',
      'ss.',
    ],
    x: 74,
    y: 70,
  },
  'sessions-50': {
    sprite: [
      'sss',
      '.s.',
    ],
    x: 78,
    y: 66,
  },
  'sessions-100': {
    sprite: [
      '.ss.',
      'ssss',
    ],
    x: 75,
    y: 62,
  },
  'sessions-250': {
    sprite: [
      'ss.',
      'sss',
    ],
    x: 60,
    y: 64,
  },
  'sessions-500': {
    sprite: [
      '.sss',
      'ssss',
    ],
    x: 52,
    y: 68,
  },
  'sessions-1000': {
    sprite: [
      '.pppp.',
      '.pkkp.',
      '..TT..',
      '..TT..',
      '..TT..',
    ],
    x: 44,
    y: 72,
  },

  // =========================================================================
  // Hours family (15): saplings, trees, village structures, steps, and central lit temple
  // =========================================================================
  'hours-25': {
    sprite: [
      '..g..',
      '.ggg.',
      '..T..',
      '..T..',
    ],
    x: 30,
    y: 42,
  },
  'hours-50': {
    sprite: [
      '.gDg.',
      'ggDgg',
      '..T..',
      '..T..',
    ],
    x: 48,
    y: 44,
  },
  'hours-100': {
    sprite: [
      '...g...',
      '..ggg..',
      '.ggDgg.',
      '..ggg..',
      '.ggDgg.',
      'gggDggg',
      '...T...',
      '...T...',
      '...T...',
      '..TTT..',
    ],
    x: 8,
    y: 30,
  },
  'hours-200': {
    sprite: [
      '...D...',
      '..gDg..',
      '.ggDgg.',
      '..gDg..',
      'gggDggg',
      '...T...',
      '...T...',
      '..TTT..',
    ],
    x: 22,
    y: 34,
  },
  'hours-500': {
    sprite: [
      '..ggg..',
      '.gfgfg.',
      'ggfgggg',
      '.ggggg.',
      '..TTT..',
      '..TTT..',
      '..TTT..',
      '.TTTTT.',
    ],
    x: 36,
    y: 32,
  },
  'hours-1000': {
    sprite: [
      'TTTTTTTT',
      'T......T',
      'T......T',
    ],
    x: 14,
    y: 60,
  },
  'hours-2000': {
    sprite: [
      '..bbbb..',
      '..T..T..',
      '..T..T..',
      '.ssssss.',
      '.swwwss.',
      '.ssssss.',
    ],
    x: 40,
    y: 48,
  },
  'hours-3000': {
    sprite: [
      '....bbbb....',
      '..bbbbbbbb..',
      '.bbbbbbbbbb.',
      'bbbbbbbbbbbb',
      '.TTpTTpTTTT.',
      '.TTpTTpTTTT.',
      '.TTTTTTTTTT.',
      '.TTmmTTTTTT.',
      '.TTmmTTTTTT.',
    ],
    x: 12,
    y: 46,
  },
  'hours-4000': {
    sprite: [
      'T.T.T.T.T.T',
      'TTTTTTTTTTT',
      'T.T.T.T.T.T',
      'TTTTTTTTTTT',
      'T.T.T.T.T.T',
    ],
    x: 26,
    y: 50,
  },
  'hours-5000': {
    sprite: [
      '..ssssssss..',
      '.swwwwwwwws.',
      'swwwwwwwwwws',
      'swwwwwwwwwws',
      '.swwwwwwwws.',
      '..ssssssss..',
    ],
    x: 104,
    y: 48,
  },
  'hours-6000': {
    sprite: [
      'TTTTTTTTTTTT',
      'T..........T',
      'TT........TT',
    ],
    x: 104,
    y: 50,
  },
  'hours-7000': {
    sprite: [
      '..ss..',
      '.sYYs.',
      '.sYYs.',
      '..ss..',
      '..ss..',
      '.ssss.',
    ],
    x: 92,
    y: 52,
  },
  'hours-8000': {
    sprite: [
      'bbbbbbbbbbbbbb',
      '..bb......bb..',
      '..bbbbbbbbbb..',
      '..bb......bb..',
      '..bb......bb..',
      '..bb......bb..',
      '.ssss....ssss.',
    ],
    x: 73,
    y: 54,
  },
  'hours-9000': {
    sprite: [
      '..ssssssssssss..',
      '.ssssssssssssss.',
      'ssssssssssssssss',
    ],
    x: 72,
    y: 50,
  },
  'hours-10000': {
    sprite: [
      '.......YYYY.......',
      '......bbbbbb......',
      '.....bLLLLLLb.....',
      '....bbbbbbbbbb....',
      '...bbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbb..',
      '.bbbbbbbbbbbbbbbb.',
      'bbbbbbbbbbbbbbbbbb',
      '..bb..bb..bb..bb..',
      '..bL..bL..bL..bL..',
      '..bL..YY..YY..bL..',
      '..bL..YY..YY..bL..',
      '..bL..bL..bL..bL..',
      '.ssssssssssssssss.',
      'ssssssssssssssssss',
    ],
    x: 71,
    y: 35,
  },

  // =========================================================================
  // BigWeek family (2): festive pennants and golden trophy statue
  // =========================================================================
  'bigWeek-1200': {
    sprite: [
      'TTTTTTTTTTTT',
      '.f..Y..f..Y.',
      '..f..Y..f..Y',
    ],
    x: 56,
    y: 32,
  },
  'bigWeek-2400': {
    sprite: [
      '..YYYY..',
      '.YYYYYY.',
      '..YYYY..',
      '...YY...',
      '..YYYY..',
      '.ssssss.',
    ],
    x: 120,
    y: 36,
  },

  // =========================================================================
  // StrongWeeks family (4): flower patches, garden bed, ornamental fountain
  // =========================================================================
  'strongWeeks-3': {
    sprite: [
      '.f.f.',
      'gfgfg',
      '.ggg.',
    ],
    x: 96,
    y: 62,
  },
  'strongWeeks-12': {
    sprite: [
      'f.f.f',
      'gfgfg',
      'ggggg',
    ],
    x: 114,
    y: 60,
  },
  'strongWeeks-25': {
    sprite: [
      'ssssssss',
      'sfgfgfgs',
      'ssssssss',
    ],
    x: 102,
    y: 68,
  },
  'strongWeeks-52': {
    sprite: [
      '...ww...',
      '..wwww..',
      '.ssssss.',
      '.swwwws.',
      '.ssssss.',
      '..ssss..',
    ],
    x: 122,
    y: 46,
  },

  // =========================================================================
  // Bright family (4): glowing firefly, sunflower, crystal shrine, beacon
  // =========================================================================
  'bright-10': {
    sprite: [
      '.YY.',
      'YYYY',
      '.YY.',
    ],
    x: 90,
    y: 38,
  },
  'bright-25': {
    sprite: [
      '.YYY.',
      'YYYYY',
      '.YYY.',
      '..g..',
      '.gg..',
      '..T..',
    ],
    x: 138,
    y: 48,
  },
  'bright-100': {
    sprite: [
      '..YY..',
      '.YYYY.',
      'YYYYYY',
      '.ssss.',
      '.ssss.',
    ],
    x: 132,
    y: 38,
  },
  'bright-250': {
    sprite: [
      '..YY..',
      '.YYYY.',
      '..YY..',
      '.ssss.',
      '..ss..',
      '..ss..',
      '.ssss.',
    ],
    x: 144,
    y: 36,
  },

  // =========================================================================
  // Ratings family (3): stepping stones, birdbath, library kiosk
  // =========================================================================
  'ratings-10': {
    sprite: [
      'ss..ss',
      'ss..ss',
    ],
    x: 86,
    y: 72,
  },
  'ratings-50': {
    sprite: [
      '.swws.',
      '..ss..',
      '..ss..',
      '.ssss.',
    ],
    x: 118,
    y: 70,
  },
  'ratings-200': {
    sprite: [
      '.bbbbbb.',
      'TTTTTTTT',
      'TppppppT',
      'TppppppT',
      'TTTTTTTT',
      'T......T',
    ],
    x: 134,
    y: 62,
  },

  // =========================================================================
  // Comebacks family (3): hearth campfire, phoenix roost, eternal brazier
  // =========================================================================
  'comebacks-5': {
    sprite: [
      '..YY..',
      '.YffY.',
      '..TT..',
      '.ssss.',
    ],
    x: 28,
    y: 66,
  },
  'comebacks-25': {
    sprite: [
      '.fff.',
      'ffYff',
      '.fff.',
      '..T..',
      '..T..',
      '.TTT.',
    ],
    x: 16,
    y: 72,
  },
  'comebacks-100': {
    sprite: [
      '.YYYY.',
      'YYYYYY',
      '.YffY.',
      '.ssss.',
      '..ss..',
      '.ssss.',
    ],
    x: 62,
    y: 74,
  },
};
