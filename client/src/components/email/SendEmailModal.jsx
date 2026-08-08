import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, X, Paperclip, Loader2, FileText, Image as ImageIcon, FileSpreadsheet, FileType } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { emailApi } from '@/api/emailService';

const ACCEPTED_TYPES = '.pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx';
const MAX_FILES = 5;

// Send Email modal reused across Leads / Accounts / Complaints — always sends
// through the department mailbox the Super Admin configured in Admin Settings > SMTP Settings.
export default function SendEmailModal({
  open,
  onOpenChange,
  to,
  department,
  defaultSubject = '',
  defaultMessage = '',
  refModel,
  refId,
}) {
  const { toast } = useToast();
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      setMessage(defaultMessage);
      setFiles([]);
    }
  }, [open, defaultSubject, defaultMessage]);

  const handleFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    if (files.length + picked.length > MAX_FILES) {
      toast({ title: 'Too many files', description: `Aap max ${MAX_FILES} files hi attach kar sakte hain`, variant: 'destructive' });
      return;
    }
    setFiles((prev) => [...prev, ...picked]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!to || !subject.trim()) {
      toast({ title: 'Required', description: 'Subject is required', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await emailApi.send({ to, subject, message, department, files, refModel, refId });
      toast({ title: 'Sent!', description: `Email sent to ${to}` });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Failed to send email', description: error.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !sending && onOpenChange(v)}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-xl border border-gray-100 shadow-xl">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <DialogTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Send Email
          </DialogTitle>
          <button
            onClick={() => !sending && onOpenChange(false)}
            className="hover:bg-gray-100 p-1.5 rounded-full transition-colors text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">To</Label>
            <Input value={to || ''} disabled className="bg-gray-50 text-gray-600" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Message</Label>
            <textarea
              className="w-full min-h-[120px] border border-gray-300 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-gray-700">Attachments</Label>
            <label className="flex items-center gap-2 border border-dashed border-gray-300 rounded-md px-3 py-2 text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-600 transition-colors w-fit">
              <Paperclip className="h-4 w-4" />
              Choose File
              <input type="file" multiple accept={ACCEPTED_TYPES} className="hidden" onChange={handleFileChange} />
            </label>
            <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-0.5">
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> PDF</span>
              <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Image</span>
              <span className="flex items-center gap-1"><FileSpreadsheet className="h-3 w-3" /> Excel</span>
              <span className="flex items-center gap-1"><FileType className="h-3 w-3" /> Word</span>
            </div>

            {files.length > 0 && (
              <div className="space-y-1 pt-1">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-xs text-gray-700">
                    <span className="truncate">{file.name}</span>
                    <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 ml-2 shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending} className="bg-blue-600 hover:bg-blue-700 text-white">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
