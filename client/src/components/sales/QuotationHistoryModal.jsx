import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { leadApi } from '@/api/leadService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Eye, RefreshCw, FileText } from 'lucide-react';

// Every past "Send Email" (first send or Update Quotation resend) for a
// lead, newest first — Lead.quotation itself only ever holds the latest one
// (unchanged), this reads the separate LeadQuotationHistory log instead.
export default function QuotationHistoryModal({ leadId, leadCode, open, onOpenChange }) {
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['lead-quotation-history', leadId],
    queryFn: () => leadApi.getQuotationHistory(leadId),
    enabled: open && !!leadId,
  });
  const history = data?.history || [];

  const openEntry = async (historyId) => {
    // Open window FIRST (must be synchronous during click) so the browser
    // doesn't block it as a popup — same trick as the Leads.jsx View button.
    const win = window.open('', '_blank');
    if (!win) {
      toast({ title: 'Popup Blocked', description: 'Please allow popups for this site and try again.', variant: 'destructive' });
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>Loading Quotation...</title><style>body{display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#555;background:#f9f9f9;}</style></head><body><p>⏳ Loading quotation, please wait...</p></body></html>`);
    try {
      const res = await leadApi.getQuotationHistoryItem(leadId, historyId);
      let base64String = res.quotation;
      if (!base64String) throw new Error('No quotation data returned');
      if (!base64String.startsWith('data:')) {
        base64String = `data:application/pdf;base64,${base64String}`;
      }
      win.document.open();
      win.document.write(`<!DOCTYPE html><html><head><title>Quotation - ${leadCode || ''}</title><style>*{margin:0;padding:0;box-sizing:border-box}body,html{height:100%;overflow:hidden}</style></head><body><iframe src="${base64String}" frameborder="0" style="width:100%;height:100vh;border:none;display:block;"></iframe></body></html>`);
      win.document.close();
    } catch (error) {
      console.error('Failed to load quotation history item', error);
      win.document.open();
      win.document.write(`<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:red;"><p>❌ Failed to load quotation. Please close this tab and try again.</p></body></html>`);
      win.document.close();
      toast({ title: 'Error', description: 'Failed to load quotation. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quotation History{leadCode ? ` — ${leadCode}` : ''}</DialogTitle>
          <DialogDescription>Every quotation sent for this lead, newest first.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10"><RefreshCw className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No quotations sent yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {history.map((entry, idx) => (
              <button
                key={entry._id}
                onClick={() => openEntry(entry._id)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">
                    Quotation {history.length - idx} {idx === 0 && <span className="text-[10px] font-semibold text-blue-600 ml-1">LATEST</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(entry.sentAt).toLocaleString()}
                    {entry.quotationFinalAmount ? ` · ₹${entry.quotationFinalAmount.toLocaleString('en-IN')}` : ''}
                  </p>
                  {entry.sentTo && <p className="text-xs text-gray-400 truncate">to {entry.sentTo}</p>}
                </div>
                <Eye className="h-4 w-4 text-blue-500 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
