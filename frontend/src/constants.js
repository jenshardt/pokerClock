export const REBUY_MODES = {
  ONE_PER_PLAYER: 'Jeder Spieler max. 1 Rebuy',
  ONE_WHILE_ALL_ELIGIBLE: 'Jeder Spieler max. 1 Rebuy, solange alle noch eligible sind',
  N_WHILE_ALL_ELIGIBLE: 'Jeder Spieler max. n Rebuys, solange alle noch eligible sind',
};

export const DEFAULT_BLIND_LEVELS = [
  { itemType: 'LEVEL', smallBlind: 25, bigBlind: 50, durationMinutes: 20 },
  { itemType: 'LEVEL', smallBlind: 50, bigBlind: 100, durationMinutes: 20 },
  { itemType: 'LEVEL', smallBlind: 100, bigBlind: 200, durationMinutes: 20 },
  { itemType: 'LEVEL', smallBlind: 200, bigBlind: 400, durationMinutes: 20 },
  { itemType: 'BREAK', durationMinutes: 10 },
];

export const initialForm = {
  tournamentName: 'Friday Night Holdem',
  location: 'Vereinsheim Musterstadt',
  startingStack: 10000,
  buyInEuro: 20,
  rebuyEnabled: true,
  rebuyMode: 'ONE_PER_PLAYER',
  rebuyMaxCount: 1,
  reentryPriceEuro: 20,
  reentryStack: 10000,
  tableCount: 2,
  seatsPerTable: 8,
  hasNeutralDealer: false,
  participantsText: 'Alice\nBob\nChris\nDave\nEve\nFrank',
  blindLevels: DEFAULT_BLIND_LEVELS,
};

export const STEP_MUSIC_TRACKS = {
  registration: '/sounds/Happy.mp3',
  preparation: '/sounds/Tischverteilung.mp3',
};

export const AUDIO_TIMING_CONFIG = {
  musicCrossfadeMs: 1800,
  musicFadeInMs: 1200,
  tournamentFadeOutMs: 1000,
};

export const AVAILABLE_SOUND_FILES = [
  'Boom1.mp3',
  'Boom2.mp3',
  'Happy.mp3',
  'LouisDesFunes.mp3',
  'Tadaa.mp3',
  'Tischverteilung.mp3',
  'Tusch.mp3',
  'WompWompWomp.mp3',
];

export const DEFAULT_SPECIAL_SEAT_SOUNDS = [
  { name: 'Chris', sound: '/sounds/Tusch.mp3' },
  { name: 'Jens', sound: '/sounds/LouisDesFunes.mp3' },
];

export const SEAT_OPEN_SOUND = '/sounds/WompWompWomp.mp3';
