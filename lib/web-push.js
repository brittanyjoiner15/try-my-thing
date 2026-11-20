// Web push encryption and VAPID signing, with node:crypto instead of the web-push package (no new dependency).
// Follows RFC 8291 (message encryption, aes128gcm) and RFC 8292 (VAPID). Kept apart from lib/push.js so it
// has no database imports and can be tested on its own. Server only.
import crypto from "node:crypto";

export const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
export const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
// Push services (Apple especially) want a real contact URL or mailto: here.
const SUBJECT = "https://trymything.app";

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const fromB64url = (str) => Buffer.from(str, "base64url");

// The VAPID private key as a signing key. The public key is the uncompressed point: 0x04 || x || y.
function vapidKey() {
  const pub = fromB64url(PUBLIC_KEY);
  return crypto.createPrivateKey({
    key: { kty: "EC", crv: "P-256", d: PRIVATE_KEY, x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
    format: "jwk",
  });
}

// Signed token that proves the push comes from us. Valid 12 hours, for one push service origin.
export function vapidAuthHeader(endpoint) {
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = b64url(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT }));
  const signature = crypto.sign("sha256", Buffer.from(`${header}.${claims}`), { key: vapidKey(), dsaEncoding: "ieee-p1363" });
  return `vapid t=${header}.${claims}.${b64url(signature)}, k=${PUBLIC_KEY}`;
}

// Encrypts the payload so only that browser can read it (the push service can't). One record, no padding.
export function encryptPayload(payload, { p256dh, auth }) {
  const uaPublic = fromB64url(p256dh);
  const authSecret = fromB64url(auth);
  const ecdh = crypto.createECDH("prime256v1");
  const asPublic = ecdh.generateKeys();
  const shared = ecdh.computeSecret(uaPublic);

  const keyInfo = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = Buffer.from(crypto.hkdfSync("sha256", shared, authSecret, keyInfo, 32));
  const salt = crypto.randomBytes(16);
  const cek = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
  const nonce = Buffer.from(crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  // 0x02 marks the last (and only) record.
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);

  const recordSize = Buffer.alloc(4);
  recordSize.writeUInt32BE(4096);
  return Buffer.concat([salt, recordSize, Buffer.from([asPublic.length]), asPublic, body]);
}
