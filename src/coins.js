// Hercules' six coins land on Chi (Χ) or Omicron (Ο). A pot is named by how
// the six coins fall: Ο = 0 and Χ = 1, first coin most significant, so the
// first three coins pick the row and the last three pick the column.

// Shown with the Latin letters O and X, which look identical to the Greek
// capitals Omicron and Chi and exist in the game's pixel font.
export const FACES = ['O', 'X'];

export function coinsFor(index) {
  const out = [];
  for (let i = 5; i >= 0; i--) out.push((index >> i) & 1);
  return out;
}

export function patternFor(index) {
  return coinsFor(index).map((b) => FACES[b]).join('');
}

export function indexFor(coins) {
  return coins.reduce((acc, b) => acc * 2 + b, 0);
}
