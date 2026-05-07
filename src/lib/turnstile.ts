const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = import.meta.env.TURNSTILE_SECRET_KEY as string | undefined;

  if (!secretKey) {
    console.log('[Turnstile] No secret key configured — skipping verification (relying on honeypot)');
    return true;
  }

  if (!token) {
    console.warn('[Turnstile] No token provided — rejecting');
    return false;
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
