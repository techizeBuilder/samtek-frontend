import { apiRequest } from '@/lib/queryClient';

/**
 * Try sending a WhatsApp message via the Cloud API; if it can't go out
 * automatically (API not configured, or the customer hasn't messaged us
 * within the last 24h so Meta requires an approved Template instead of
 * free text), fall back to opening the wa.me link — the same manual-click
 * flow every "Send WhatsApp" button in this app used before.
 *
 * @param {string} to - raw phone number (any format; digits get cleaned)
 * @param {string} message - message text
 * @returns {Promise<{ sent: boolean, automatic: boolean, reason?: string }>}
 */
export async function sendWhatsApp(to, message) {
  const digits = String(to || '').replace(/\D/g, '');
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const waMeUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message || '')}` : null;

  try {
    const result = await apiRequest('POST', '/api/whatsapp/send', { to, message });
    if (result?.success) {
      return { sent: true, automatic: true };
    }
    window.open(result?.waMeUrl || waMeUrl, '_blank');
    return { sent: false, automatic: false, reason: result?.message };
  } catch (err) {
    // Network/auth error hitting our own backend — still fall back so the
    // send action never just silently dies.
    if (waMeUrl) window.open(waMeUrl, '_blank');
    return { sent: false, automatic: false, reason: err.message };
  }
}

/**
 * Send an approved WhatsApp message Template — works for ANY recipient,
 * even a fresh lead who's never messaged this business number (no 24h
 * window needed, unlike sendWhatsApp above). Falls back to opening a plain
 * wa.me chat (no pre-filled text — template variables can't be reproduced
 * in a deep link) if the API send fails.
 *
 * @param {string} to - raw phone number
 * @param {string} templateName - exact approved template name in Meta
 * @param {string[]} variables - fills {{1}}, {{2}}... body placeholders in order
 * @param {string} [languageCode] - defaults to 'en'
 * @returns {Promise<{ sent: boolean, automatic: boolean, reason?: string }>}
 */
export async function sendWhatsAppTemplate(to, templateName, variables = [], languageCode = 'en') {
  const digits = String(to || '').replace(/\D/g, '');
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const waMeUrl = phone ? `https://wa.me/${phone}` : null;

  try {
    const result = await apiRequest('POST', '/api/whatsapp/send', {
      to,
      template: { name: templateName, languageCode, variables }
    });
    if (result?.success) {
      return { sent: true, automatic: true };
    }
    window.open(result?.waMeUrl || waMeUrl, '_blank');
    return { sent: false, automatic: false, reason: result?.message };
  } catch (err) {
    if (waMeUrl) window.open(waMeUrl, '_blank');
    return { sent: false, automatic: false, reason: err.message };
  }
}
