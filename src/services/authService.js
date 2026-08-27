import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase, handleAuthCallbackUrl } from '../supabase';

let deepLinksConfigured = false;

export async function setupAuthDeepLinks(onSuccessCallback) {
  if (!Capacitor.isNativePlatform() || !supabase) return;

  try {
    // Cold start deep link check
    const launchUrl = await CapApp.getLaunchUrl();
    if (launchUrl?.url && launchUrl.url.includes('auth-callback')) {
      if (Capacitor.isPluginAvailable('Browser')) {
        await Browser.close().catch(() => {});
      }
      await handleAuthCallbackUrl(launchUrl.url);
      if (typeof onSuccessCallback === 'function') {
        onSuccessCallback();
      }
    }

    if (!deepLinksConfigured) {
      deepLinksConfigured = true;
      // Warm / background start deep link listener
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (url && url.includes('auth-callback')) {
          if (Capacitor.isPluginAvailable('Browser')) {
            await Browser.close().catch(() => {});
          }
          try {
            await handleAuthCallbackUrl(url);
            if (typeof onSuccessCallback === 'function') {
              onSuccessCallback();
            }
          } catch (err) {
            console.error('Deep link auth callback failed:', err);
          }
        }
      });
    }
  } catch (e) {
    console.warn('Failed to setup native auth deep links:', e);
  }
}

export async function signInWithGoogleOAuth() {
  if (!supabase) return;
  try {
    const isNative = Capacitor.isNativePlatform();
    const redirectTo = isNative
      ? 'com.devopsbenjamin.simplebodygraph://auth-callback'
      : window.location.origin;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: isNative
      }
    });
    if (error) throw error;

    if (isNative && data?.url) {
      if (Capacitor.isPluginAvailable('Browser')) {
        try {
          await Browser.open({ url: data.url, windowName: '_self' });
        } catch (browserErr) {
          console.warn('Browser.open failed, falling back to window.open:', browserErr);
          window.open(data.url, '_system');
        }
      } else {
        console.warn('Capacitor Browser plugin not compiled into native APK, falling back to window.open');
        window.open(data.url, '_system');
      }
    }
    return data;
  } catch (error) {
    console.error('Google OAuth failed:', error);
    throw error;
  }
}
