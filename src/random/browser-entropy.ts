export function browserEntropy(byteLength = 32): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(byteLength));
}
