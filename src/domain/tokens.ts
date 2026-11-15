export type RandomBytesSource = (length: number) => Uint8Array;

const PUBLIC_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACCESS_TOKEN_BYTES = 32;
const PUBLIC_CODE_LENGTH = 8;

function defaultRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function generateAccessToken(
  randomBytes: RandomBytesSource = defaultRandomBytes,
): string {
  const bytes = randomBytes(ACCESS_TOKEN_BYTES);
  if (bytes.length < ACCESS_TOKEN_BYTES) {
    throw new Error('La fuente aleatoria no proporcionó suficientes bytes.');
  }
  return toHex(bytes.slice(0, ACCESS_TOKEN_BYTES));
}

export function generatePublicCode(
  randomBytes: RandomBytesSource = defaultRandomBytes,
): string {
  const bytes = randomBytes(PUBLIC_CODE_LENGTH);
  if (bytes.length < PUBLIC_CODE_LENGTH) {
    throw new Error('La fuente aleatoria no proporcionó suficientes bytes.');
  }

  let code = '';
  for (let index = 0; index < PUBLIC_CODE_LENGTH; index += 1) {
    const value = (bytes[index] ?? 0) & 31;
    code += PUBLIC_CODE_ALPHABET[value] ?? 'A';
  }
  return code;
}
