'use client';

/**
 * Share a link. In the iOS and Android apps: the native share sheet. On the
 * web: the Web Share API where the browser has it, otherwise copy the link.
 * Resolves 'native' | 'shared' | 'copied' | 'cancelled' | 'failed'.
 */
export async function shareLink({ title, url, text }) {
  const href = url || (typeof window !== 'undefined' ? window.location.href : '');
  try {
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url: href, dialogTitle: title });
      return 'native';
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text, url: href });
      return 'shared';
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(href);
      return 'copied';
    }
    return 'failed';
  } catch (err) {
    const msg = String(err?.message || err?.name || '');
    return /abort|cancel/i.test(msg) ? 'cancelled' : 'failed';
  }
}
