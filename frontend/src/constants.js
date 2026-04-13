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
