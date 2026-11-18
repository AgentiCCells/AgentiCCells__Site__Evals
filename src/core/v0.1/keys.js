// Key and sign-in helpers, core v0.1. Code Apache-2.0.
//
// A visitor's key stays in their browser. By default it lives in memory only and is gone when the
// tab closes. It goes to localStorage only when the visitor chooses "remember", and forget() wipes
// both. The key is never logged, never put in a URL and never sent anywhere but the provider.
// OpenRouter's own guidance (docs, OAuth PKCE, "Step 3") is not to persist keys in browser
// storage at all; pages must show that warning next to the "remember" choice.

export function createKeyStore({ name, storage = globalThis.localStorage } = {}) {
  if (!name || !/^[a-z0-9-]+$/.test(name)) throw new Error('key store needs a name of a-z, 0-9 and -');
  const slot = `agenticcells.evals.key.${name}`;
  let mem = null;
  const read = () => { try { return storage?.getItem(slot) || null; } catch { return null; } };
  const store = {
    get() { return mem || read(); },
    has() { return !!store.get(); },
    remembered() { return !!read(); },
    set(key, { remember = false } = {}) {
      const k = String(key || '').trim();
      if (!k) throw new Error('empty key');
      mem = k;
      if (remember) { try { storage?.setItem(slot, k); } catch { /* storage blocked: memory only */ } }
      else { try { storage?.removeItem(slot); } catch { /* ignore */ } }
    },
    forget() { mem = null; try { storage?.removeItem(slot); } catch { /* ignore */ } },
    masked() { return mask(store.get()); },
    toString() { return `[key store ${name}: ${store.has() ? 'a key is set' : 'empty'}]`; },
    toJSON() { return { name, hasKey: store.has(), remembered: store.remembered() }; },
  };
  return store;
}

// "sk-or-v1-abc...xyz" -> "sk-or…xyz" style: never more than the first 5 and last 3 characters.
export function mask(key) {
  if (!key) return '';
  const k = String(key);
  return k.length <= 10 ? '•'.repeat(k.length) : `${k.slice(0, 5)}…${k.slice(-3)}`;
}

// Remove any of the given secrets from a string, for error messages and exports.
export function redact(text, secrets = []) {
  let s = String(text ?? '');
  for (const x of secrets) if (x && x.length >= 8) s = s.split(x).join('[redacted]');
  return s;
}

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// PKCE (RFC 7636, S256), as OpenRouter's OAuth PKCE guide asks.
export async function pkcePair() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}

export function randomState() { return b64url(crypto.getRandomValues(new Uint8Array(16))); }
