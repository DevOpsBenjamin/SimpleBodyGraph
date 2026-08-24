import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      db: { schema: 'app_simple_body_graph' }
    });
    console.log('Supabase client initialized successfully with schema app_simple_body_graph.');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
  }
} else {
  console.warn('Supabase credentials VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Running in local/offline-only mode.');
}

export { supabase };

/**
 * Parses and processes a deep link URL returned from OAuth provider.
 * Supports both PKCE authorization codes and implicit hash tokens.
 *
 * @param {string} url - Deep link or callback URL
 * @returns {Promise<any>}
 */
export async function handleAuthCallbackUrl(url) {
  if (!url || !supabase) return null;

  try {
    // Normalize custom scheme into a standard parseable URL structure
    const normalizedUrl = url.replace(/^[a-zA-Z0-9._-]+:\/\//, 'https://app.internal/');
    const parsed = new URL(normalizedUrl);

    // Extract query and hash parameters
    const searchParams = parsed.searchParams;
    const hash = parsed.hash.startsWith('#') ? parsed.hash.substring(1) : parsed.hash;
    const hashParams = new URLSearchParams(hash);

    // Check for provider error parameters
    const errorDescription = searchParams.get('error_description')
      || hashParams.get('error_description')
      || searchParams.get('error')
      || hashParams.get('error');

    if (errorDescription) {
      throw new Error(decodeURIComponent(errorDescription));
    }

    // 1. PKCE Authorization Code flow
    const code = searchParams.get('code') || hashParams.get('code');
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return data;
    }

    // 2. Implicit tokens in hash fragment
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) throw error;
      return data;
    }

    return null;
  } catch (error) {
    console.error('Failed to handle OAuth callback URL:', error);
    throw error;
  }
}
