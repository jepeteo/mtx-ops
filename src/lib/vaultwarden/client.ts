import { createHmac, pbkdf2Sync, createDecipheriv, timingSafeEqual, createPrivateKey, privateDecrypt, constants } from "crypto";
import { env } from "@/lib/env";

export type VaultRevealRequest = {
  vaultItemId: string;
  fieldName: string;
};

// ── Bitwarden crypto helpers ─────────────────────────────────────────────────

type EncString = {
  type: number;
  iv: Buffer;
  ct: Buffer;
  mac: Buffer | null;
};

type RsaEncString = {
  type: 4;
  ct: Buffer;
};

function parseEncString(s: string): EncString | RsaEncString {
  const dotIdx = s.indexOf(".");
  const type = parseInt(s.slice(0, dotIdx), 10);
  const rest = s.slice(dotIdx + 1);
  const parts = rest.split("|");
  if (type === 2) {
    // AesCbc256_HmacSha256_B64
    if (parts.length < 3) throw new Error("EncString type 2 requires 3 parts");
    return {
      type,
      iv: Buffer.from(parts[0]!, "base64"),
      ct: Buffer.from(parts[1]!, "base64"),
      mac: Buffer.from(parts[2]!, "base64"),
    };
  }
  if (type === 0) {
    // AesCbc256_B64 (no MAC)
    if (parts.length < 2) throw new Error("EncString type 0 requires 2 parts");
    return {
      type,
      iv: Buffer.from(parts[0]!, "base64"),
      ct: Buffer.from(parts[1]!, "base64"),
      mac: null,
    };
  }
  if (type === 4) {
    // Rsa2048_OaepSha256_B64
    return { type: 4, ct: Buffer.from(parts[0]!, "base64") };
  }
  throw new Error(`Unsupported Bitwarden EncString type: ${type}`);
}

/**
 * HKDF-Expand (https://tools.ietf.org/html/rfc5869 §2.3)
 * Bitwarden uses expand-only with the master key as PRK directly.
 */
function hkdfExpand(prk: Buffer, info: string, length: number): Buffer {
  const infoBytes = Buffer.from(info, "utf8");
  const hashLen = 32; // SHA-256
  const n = Math.ceil(length / hashLen);
  let t = Buffer.alloc(0);
  const chunks: Buffer[] = [];
  for (let i = 1; i <= n; i++) {
    const hmac = createHmac("sha256", prk);
    hmac.update(t);
    hmac.update(infoBytes);
    hmac.update(Buffer.from([i]));
    t = hmac.digest();
    chunks.push(t);
  }
  return Buffer.concat(chunks).subarray(0, length);
}

function stretchMasterKey(masterKey: Buffer): { encKey: Buffer; macKey: Buffer } {
  return {
    encKey: hkdfExpand(masterKey, "enc", 32),
    macKey: hkdfExpand(masterKey, "mac", 32),
  };
}

function decryptEncString(enc: EncString, encKey: Buffer, macKey: Buffer): Buffer {
  if (enc.mac) {
    const hmac = createHmac("sha256", macKey);
    hmac.update(enc.iv);
    hmac.update(enc.ct);
    const computed = hmac.digest();
    if (!timingSafeEqual(computed, enc.mac)) {
      throw new Error("Vault decrypt failed: MAC mismatch");
    }
  }
  const decipher = createDecipheriv("aes-256-cbc", encKey, enc.iv);
  return Buffer.concat([decipher.update(enc.ct), decipher.final()]);
}

function decryptString(encValue: string, encKey: Buffer, macKey: Buffer): string {
  const parsed = parseEncString(encValue);
  if (parsed.type === 4) throw new Error("Cannot AES-decrypt an RSA-encrypted string");
  return decryptEncString(parsed as EncString, encKey, macKey).toString("utf8");
}

// ── Bitwarden API types ──────────────────────────────────────────────────────

type PreloginResponse = {
  kdf: number;
  kdfIterations: number;
};

type TokenResponse = {
  access_token: string;
};

type ProfileOrganization = {
  id: string;
  key: string; // Encrypted org key (encrypted with user key)
};

type ProfileResponse = {
  key: string; // EncUserKey
  privateKey?: string; // Encrypted RSA private key (PKCS8 DER, AES-encrypted)
  organizations?: ProfileOrganization[];
};

type CipherField = {
  name: string | null;
  value: string | null;
  type: number;
};

type CipherLogin = {
  username?: string | null;
  password?: string | null;
  totp?: string | null;
};

type CipherResponse = {
  id: string;
  type: number;
  name: string;
  notes?: string | null;
  login?: CipherLogin;
  fields?: CipherField[] | null;
  organizationId?: string | null;
};

// ── Main export ──────────────────────────────────────────────────────────────

export async function revealSecret(req: VaultRevealRequest): Promise<{ value: string }> {
  const {
    VAULTWARDEN_URL,
    VAULTWARDEN_EMAIL,
    VAULTWARDEN_MASTER_PASSWORD,
    VAULTWARDEN_CLIENT_ID,
    VAULTWARDEN_CLIENT_SECRET,
  } = env;

  if (
    !VAULTWARDEN_URL ||
    !VAULTWARDEN_EMAIL ||
    !VAULTWARDEN_MASTER_PASSWORD ||
    !VAULTWARDEN_CLIENT_ID ||
    !VAULTWARDEN_CLIENT_SECRET
  ) {
    throw new Error(
      "Vaultwarden not fully configured. Required env vars: " +
        "VAULTWARDEN_URL, VAULTWARDEN_EMAIL, VAULTWARDEN_MASTER_PASSWORD, " +
        "VAULTWARDEN_CLIENT_ID, VAULTWARDEN_CLIENT_SECRET"
    );
  }

  const base = VAULTWARDEN_URL.replace(/\/$/, "");

  // 1. Prelogin — get KDF parameters for this account
  const preloginRes = await fetch(`${base}/identity/accounts/prelogin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: VAULTWARDEN_EMAIL }),
  });
  if (!preloginRes.ok) {
    throw new Error(`Vaultwarden prelogin failed (${preloginRes.status})`);
  }
  const prelogin = (await preloginRes.json()) as PreloginResponse;

  // 2. Derive master key — PBKDF2-SHA256
  if (prelogin.kdf !== 0) {
    throw new Error(
      `Vaultwarden KDF type ${prelogin.kdf} not supported (only PBKDF2=0 is implemented).`
    );
  }
  const masterKey = pbkdf2Sync(
    VAULTWARDEN_MASTER_PASSWORD,
    VAULTWARDEN_EMAIL.toLowerCase(),
    prelogin.kdfIterations,
    32,
    "sha256"
  );

  // 3. Authenticate with API key (client_credentials)
  const tokenRes = await fetch(`${base}/identity/connect/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: VAULTWARDEN_CLIENT_ID,
      client_secret: VAULTWARDEN_CLIENT_SECRET,
      scope: "api",
      // Device info required by some Vaultwarden configurations
      device_type: "21",
      device_identifier: "mtx-ops-server-0001",
      device_name: "mtx-ops-server",
    }).toString(),
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text().catch(() => "");
    throw new Error(`Vaultwarden token request failed (${tokenRes.status}): ${body}`);
  }
  const { access_token: accessToken } = (await tokenRes.json()) as TokenResponse;

  // 4. Fetch user profile — contains the EncUserKey
  const profileRes = await fetch(`${base}/api/accounts/profile`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!profileRes.ok) {
    throw new Error(`Vaultwarden profile fetch failed (${profileRes.status})`);
  }
  const profile = (await profileRes.json()) as ProfileResponse;

  // 5. Derive stretched key pair, then decrypt EncUserKey → user key (64 bytes)
  const { encKey: strEncKey, macKey: strMacKey } = stretchMasterKey(masterKey);
  const userKeyRaw = decryptEncString(parseEncString(profile.key) as EncString, strEncKey, strMacKey);
  if (userKeyRaw.length < 64) {
    throw new Error("Vault: decrypted user key is unexpectedly short");
  }
  const userEncKey = userKeyRaw.subarray(0, 32);
  const userMacKey = userKeyRaw.subarray(32, 64);

  // 6. Fetch the cipher
  const cipherRes = await fetch(`${base}/api/ciphers/${req.vaultItemId}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!cipherRes.ok) {
    throw new Error(`Vault item not found or inaccessible (HTTP ${cipherRes.status})`);
  }
  const cipher = (await cipherRes.json()) as CipherResponse;

  // 7. Determine the correct decryption key (personal or organization)
  let cipherEncKey = userEncKey;
  let cipherMacKey = userMacKey;

  if (cipher.organizationId) {
    const org = profile.organizations?.find((o) => o.id === cipher.organizationId);
    if (!org?.key) {
      throw new Error(`Organization key not found for org ${cipher.organizationId}`);
    }
    if (!profile.privateKey) {
      throw new Error("Profile privateKey is missing — needed to decrypt org key");
    }

    // Decrypt user's RSA private key (AES-encrypted PKCS8 DER)
    const privKeyDer = decryptEncString(
      parseEncString(profile.privateKey) as EncString,
      userEncKey,
      userMacKey
    );
    const rsaPrivateKey = createPrivateKey({
      key: privKeyDer,
      format: "der",
      type: "pkcs8",
    });

    // Org key is RSA-OAEP-SHA1 encrypted (type 4 despite the name Rsa2048_OaepSha256)
    const orgEnc = parseEncString(org.key);
    if (orgEnc.type !== 4) {
      throw new Error(`Expected RSA enc type 4 for org key, got ${orgEnc.type}`);
    }
    const orgKeyRaw = privateDecrypt(
      {
        key: rsaPrivateKey,
        padding: constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha1",
      },
      (orgEnc as RsaEncString).ct
    );
    if (orgKeyRaw.length < 64) {
      throw new Error("Vault: decrypted org key is unexpectedly short");
    }
    cipherEncKey = orgKeyRaw.subarray(0, 32);
    cipherMacKey = orgKeyRaw.subarray(32, 64);
  }

  // 8. Extract and decrypt the requested field
  let encValue: string | null | undefined;

  if (req.fieldName === "login.password") {
    encValue = cipher.login?.password;
  } else if (req.fieldName === "login.username") {
    encValue = cipher.login?.username;
  } else if (req.fieldName === "login.totp") {
    encValue = cipher.login?.totp;
  } else if (req.fieldName === "notes") {
    encValue = cipher.notes;
  } else {
    // Custom field: find by decrypting each field name and comparing
    const fields = cipher.fields ?? [];
    for (const f of fields) {
      if (!f.name || !f.value) continue;
      try {
        const plainName = decryptString(f.name, cipherEncKey, cipherMacKey);
        if (plainName === req.fieldName) {
          encValue = f.value;
          break;
        }
      } catch {
        // Skip fields that fail to decrypt
      }
    }
  }

  if (!encValue) {
    throw new Error(`Field "${req.fieldName}" not found in vault item ${req.vaultItemId}`);
  }

  const value = decryptString(encValue, cipherEncKey, cipherMacKey);
  return { value };
}
