import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExchangeCode, mockSetSession } = vi.hoisted(() => {
  import.meta.env.VITE_SUPABASE_URL = 'https://mock.supabase.co';
  import.meta.env.VITE_SUPABASE_ANON_KEY = 'mock-anon-key';

  return {
    mockExchangeCode: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }),
    mockSetSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null })
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: mockExchangeCode,
      setSession: mockSetSession
    }
  }))
}));

import { handleAuthCallbackUrl, supabase } from '../src/supabase';

describe('handleAuthCallbackUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null if url is falsy', async () => {
    const result = await handleAuthCallbackUrl(null);
    expect(result).toBeNull();
  });

  it('exchanges PKCE code for session when code query parameter is present', async () => {
    const url = 'com.devopsbenjamin.simplebodygraph://auth-callback?code=pkce-auth-code-123';
    const result = await handleAuthCallbackUrl(url);

    expect(mockExchangeCode).toHaveBeenCalledWith('pkce-auth-code-123');
    expect(result).toEqual({ session: { user: { id: 'u1' } } });
  });

  it('sets session when access_token and refresh_token are in hash fragment', async () => {
    const url = 'com.devopsbenjamin.simplebodygraph://auth-callback#access_token=mock-access-token&refresh_token=mock-refresh-token&token_type=bearer';
    const result = await handleAuthCallbackUrl(url);

    expect(mockSetSession).toHaveBeenCalledWith({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    });
    expect(result).toEqual({ session: { user: { id: 'u1' } } });
  });

  it('throws an error if error_description parameter is present', async () => {
    const url = 'com.devopsbenjamin.simplebodygraph://auth-callback?error=access_denied&error_description=User+cancelled+the+login';
    await expect(handleAuthCallbackUrl(url)).rejects.toThrow('User cancelled the login');
  });

  it('returns null if url contains neither code nor tokens', async () => {
    const url = 'com.devopsbenjamin.simplebodygraph://auth-callback';
    const result = await handleAuthCallbackUrl(url);
    expect(result).toBeNull();
  });
});
