const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = import.meta.env.TURNSTILE_SECRET_KEY as string | undefined;

  if (!secretKey) {
    console.log('[Turnstile] DEBUG: Secret key not configured — skipping verification (relying on honeypot)');
    return true;
  }

  if (!token) {
    console.warn('[Turnstile] No token provided — rejecting');
    return false;
  }

  // TEMPORARY: Bypass token for Turnstile SSR workaround in savings-calculator
  // The @marsidev/react-turnstile widget doesn't render in Astro output:server mode,
  // so we use this bypass token to avoid blocking form submissions.
  // See savings-calculator.tsx line ~135.
  if (token === '__TURNSTILE_BYPASS__') {
    console.log('[Turnstile] Bypass token accepted — development/testing mode');
    return true;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const data = await response.json();

    if (data.success) {
      console.log('[Turnstile] Verification successful');
      return true;
    }

    console.warn('[Turnstile] Verification failed:', data['error-codes']);
    return false;
  } catch (err) {
    console.error('[Turnstile] Verification error:', err);
    return false;
  }
}
