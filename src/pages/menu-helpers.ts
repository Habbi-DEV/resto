export const money = (n: number): string =>
  `€${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

export const selectCountLabel = (count: number): string =>
  count === 1 ? '1 item' : `${count} items`;
