// Encode UTF-8 bytes, not JavaScript UTF-16 code units.
export function encode(text) {
  return btoa(Array.from(new TextEncoder().encode(text), byte => String.fromCharCode(byte)).join(''));
}
