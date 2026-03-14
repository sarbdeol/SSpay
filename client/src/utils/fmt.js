export const fmt = (n) =>
  Math.round(parseFloat(n || 0)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });