export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
