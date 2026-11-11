import type { AxiosInstance } from 'axios';
import { toast } from '@/hooks/use-toast';

// An action that also sends an email (a meeting invite, a task, a ticket,
// training) is saved even when the department's mailbox isn't set up — the
// server then adds `emailWarning` to its reply (2026-10-29). Shown here once
// for every page, so no page has to remember it.
export function showEmailWarning(body: unknown) {
  const warning = (body as { emailWarning?: unknown } | null)?.emailWarning;
  if (typeof warning === 'string' && warning) {
    toast({ title: 'Saved — but the email was not sent', description: warning, variant: 'destructive' });
  }
}

export function watchEmailWarnings(client: AxiosInstance) {
  client.interceptors.response.use((response) => {
    showEmailWarning(response?.data);
    return response;
  });
}
