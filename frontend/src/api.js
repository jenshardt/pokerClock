export const AUTH_TOKEN_KEY = 'pokerclock.authToken';

export function getRandomDelayMs() {
  return 2000 + Math.floor(Math.random() * 2001);
}
