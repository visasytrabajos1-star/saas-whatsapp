import { supabase } from './supabaseClient';
const normalize = (url) => (url || '').replace(/\/$/, '');

const RENDER_BACKEND_HINT = import.meta.env.VITE_RENDER_BACKEND_URL || 'https://whatsapp-fullstack-gkm6.onrender.com';
const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 45000);
const FORCE_PRIMARY_BACKEND = import.meta.env.VITE_FORCE_PRIMARY_BACKEND !== 'false';
const ALLOW_ORIGIN_FALLBACK = import.meta.env.VITE_ALLOW_ORIGIN_FALLBACK === 'true';
let lastResolvedApiBase = null;

const getFallbackBases = () => {
  if (typeof window === 'undefined') return [RENDER_BACKEND_HINT];
  const origin = normalize(window.location.origin);
  const hostname = window.location.hostname;
  const fallbacks = [RENDER_BACKEND_HINT];

  // Auto-suffix support for Render/Vercel deployments
  if (hostname.includes('-client.')) {
    fallbacks.push(origin.replace('-client.', '-server.'));
  }
  if (hostname.endsWith('.onrender.com') && hostname !== 'whatsapp-fullstack-gkm6.onrender.com') {
    fallbacks.push('https://whatsapp-fullstack-gkm6.onrender.com');
  }

  fallbacks.push(origin);
  return fallbacks.filter(Boolean);
};

const getApiBases = () => {
  const envBase = normalize(import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL);
  const bases = envBase ? [envBase] : [];

  for (const fallback of getFallbackBases()) {
    if (!bases.includes(fallback)) bases.push(fallback);
  }

  return bases;
};

export const getPreferredApiBase = () => getApiBases()[0] || null;
export const getLastResolvedApiBase = () => lastResolvedApiBase;

const shouldTryNextBase = (response) => {
  if (!response) return true;
  return [404, 502, 503, 504].includes(response.status);
};



export const fetchWithApiFallback = async (path, options = {}) => {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const bases = getApiBases();
  const errors = [];

  // Auto-inject Supabase JWT if available
  let token = null;
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  const headers = {
    ...fetchOptions.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  for (const base of bases) {
    const url = `${base}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok && shouldTryNextBase(response)) {
        errors.push(`${url} → HTTP ${response.status}`);
        continue;
      }

      lastResolvedApiBase = base;
      return response;
    } catch (error) {
      clearTimeout(timeout);
      errors.push(`${url} → ${error.name === 'AbortError' ? `timeout ${timeoutMs}ms` : error.message}`);
    }
  }

  throw new Error(`No se pudo conectar al backend. Intentos: ${errors.join(' | ')}`);
};

export const fetchJsonWithApiFallback = async (path, options = {}) => {
  const response = await fetchWithApiFallback(path, options);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    const bodyPreview = (await response.text()).slice(0, 80).replace(/\s+/g, ' ').trim();
    throw new Error(`El backend respondió sin JSON (HTTP ${response.status}). Preview: ${bodyPreview || 'vacío'}`);
  }

  const data = await response.json();
  return { response, data };
};
