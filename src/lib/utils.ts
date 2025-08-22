
export function safeInt(v: string) {
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}
