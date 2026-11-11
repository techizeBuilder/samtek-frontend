// Warnings someone has to read before going ahead (serial number work, 2026-11-03
// — serial-tracking-logic-2026-10.md §12): fewer serials picked than pieces, or
// stock held for an earlier order. The server answers 409 and moves nothing. The
// box waits 3 seconds, so it gets read, then the screen sends it again with
// acknowledgeWarnings. Never a block: the person can always go ahead.
import React, { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const WAIT_SECONDS = 3;

function WarningsDialog({ ask, onAnswer }) {
  const [left, setLeft] = useState(WAIT_SECONDS);
  useEffect(() => {
    if (!ask) return undefined;
    setLeft(WAIT_SECONDS);
    const timer = setInterval(() => setLeft(n => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [ask]);
  return (
    <AlertDialog open={!!ask} onOpenChange={(open) => { if (!open) onAnswer(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-5 w-5" />Check this first</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              {(ask?.warnings || []).map((w, i) => <p key={i} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-900">{w}</p>)}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back</AlertDialogCancel>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white" disabled={left > 0} onClick={() => onAnswer(true)}>
            Go ahead{left > 0 ? ` (${left})` : ''}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// apiRequest puts the response's data on the error; axios keeps it under response.
const warningsOf = (e) => (e?.status === 409 ? e.data?.confirmWarnings : null)
  || (e?.response?.status === 409 ? e.response.data?.data?.confirmWarnings : null);

// runChecked((ack) => send(ack)): the result, or null when the person went back
// (nothing happened, keep the form as it is).
export function useConfirmWarnings() {
  const [ask, setAsk] = useState(null);
  const answer = (goAhead) => {
    ask?.resolve(goAhead);
    setAsk(null);
  };
  const runChecked = async (send) => {
    try {
      return await send(false);
    } catch (e) {
      const warnings = warningsOf(e);
      if (!warnings?.length) throw e;
      const goAhead = await new Promise(resolve => setAsk({ warnings, resolve }));
      return goAhead ? send(true) : null;
    }
  };
  return { runChecked, warningDialog: <WarningsDialog ask={ask} onAnswer={answer} /> };
}
