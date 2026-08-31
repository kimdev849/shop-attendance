/**
 * Generate a unique ID without depending on crypto.getRandomValues().
 * Works on React Native, web, and Node.js.
 */
export function generateId(): string {
  const s = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${s()}${s()}-${s()}-${s()}-${s()}-${s()}${s()}${s()}`;
}
