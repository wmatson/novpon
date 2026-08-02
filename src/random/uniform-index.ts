async function digest(bytes: Uint8Array): Promise<Uint8Array> { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); }
export async function uniformIndex(corpusLength: number, entropy: Uint8Array): Promise<number> {
  if (!corpusLength) throw new Error('Cannot select from an empty corpus.');
  const limit = Math.floor(0x1_0000_0000 / corpusLength) * corpusLength;
  let counter = 0; let source = entropy;
  for (;;) {
    for (let offset = 0; offset + 4 <= source.length; offset += 4) {
      const value = new DataView(source.buffer, source.byteOffset + offset, 4).getUint32(0);
      if (value < limit) return value % corpusLength;
    }
    const next = new Uint8Array(source.length + 4); next.set(entropy); new DataView(next.buffer).setUint32(entropy.length, counter++); source = await digest(next);
  }
}
