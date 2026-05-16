import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQC } from '@/contexts/QCContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ClipboardList } from 'lucide-react';

const sources = ['Purchase', 'Production', 'Store'];
const categories = ['Machine', 'Raw Material', 'Tool', 'Finished Good'];
const units = ['pcs', 'kg', 'ltr', 'm', 'set', 'lot'];

const defaultChecklist = {
  Machine: [
    { parameter: 'Visual Inspection', standardValue: 'No damage, dents or scratches' },
    { parameter: 'Dimensional Check', standardValue: 'As per drawing' },
    { parameter: 'Electrical Safety', standardValue: 'No exposed wiring, proper earthing' },
    { parameter: 'Performance Test', standardValue: 'As per specification' },
    { parameter: 'Noise & Vibration', standardValue: 'Within acceptable limits' },
  ],
  'Raw Material': [
    { parameter: 'Visual Inspection', standardValue: 'No damage, corrosion or contamination' },
    { parameter: 'Dimensions / Weight', standardValue: 'As per order specification' },
    { parameter: 'Material Certificate', standardValue: 'Certificate present and valid' },
    { parameter: 'Quantity Verification', standardValue: 'Matches purchase order' },
  ],
  Tool: [
    { parameter: 'Visual Inspection', standardValue: 'No damage or wear' },
    { parameter: 'Calibration Check', standardValue: 'Valid calibration certificate' },
    { parameter: 'Functional Test', standardValue: 'Operates as expected' },
  ],
  'Finished Good': [
    { parameter: 'Visual / Cosmetic Check', standardValue: 'No defects, proper finish' },
    { parameter: 'Dimensional Check', standardValue: 'Within tolerance' },
    { parameter: 'Performance Test', standardValue: 'Meets all specs' },
    { parameter: 'Documentation', standardValue: 'Manual & invoice copy present' },
    { parameter: 'Safety Check', standardValue: 'Guards, labels, warnings in place' },
  ],
};

export default function QCInward() {
  const { createJob } = useQC();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    source: '',
    sourceRefId: '',
    sourceDepartment: '',
    sentBy: '',
    itemName: '',
    itemCode: '',
    category: '',
    quantity: 1,
    unit: 'pcs',
    receivedDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [checklist, setChecklist] = useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCategoryChange = (cat) => {
    set('category', cat);
    setChecklist((defaultChecklist[cat] || []).map(c => ({ ...c })));
  };

  const addChecklistItem = () => setChecklist(cl => [...cl, { parameter: '', standardValue: '' }]);
  const removeChecklistItem = (i) => setChecklist(cl => cl.filter((_, idx) => idx !== i));
  const updateChecklistItem = (i, key, val) => setChecklist(cl => cl.map((item, idx) => idx === i ? { ...item, [key]: val } : item));

  const handleSubmit = async () => {
    if (!form.source || !form.itemName || !form.category || !form.receivedDate) {
      toast({ title: 'Validation Error', description: 'Source, Item Name, Category and Received Date are required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const result = await createJob({ ...form, checklist: checklist.filter(c => c.parameter.trim()) });
      toast({ title: 'QC Job Created', description: `${result.data.qcJobId} created successfully` });
      setLocation('/qc/jobs');
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">QC Inward Entry</h1>
        <p className="text-slate-500 text-sm mt-0.5">Register incoming material or machine for quality inspection</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-6 space-y-6">
          {/* Source info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Source Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Source Department <span className="text-red-500">*</span></Label>
                <Select value={form.source} onValueChange={v => set('source', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Source Ref ID (Order/PO/Stock No.)</Label>
                <Input className="mt-1" value={form.sourceRefId} onChange={e => set('sourceRefId', e.target.value)} placeholder="e.g. ORD-2026-001, PO-089" />
              </div>
              <div>
                <Label>Department Name</Label>
                <Input className="mt-1" value={form.sourceDepartment} onChange={e => set('sourceDepartment', e.target.value)} placeholder="e.g. Production, Purchase" />
              </div>
              <div>
                <Label>Sent By</Label>
                <Input className="mt-1" value={form.sentBy} onChange={e => set('sentBy', e.target.value)} placeholder="Person who sent this for QC" />
              </div>
            </div>
          </div>

          {/* Item info */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Item Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Item Name <span className="text-red-500">*</span></Label>
                <Input className="mt-1" value={form.itemName} onChange={e => set('itemName', e.target.value)} placeholder="Full item/product name" />
              </div>
              <div>
                <Label>Item Code</Label>
                <Input className="mt-1" value={form.itemCode} onChange={e => set('itemCode', e.target.value)} placeholder="SKU / part number" />
              </div>
              <div>
                <Label>Category <span className="text-red-500">*</span></Label>
                <Select value={form.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" className="mt-1" value={form.quantity} onChange={e => set('quantity', Number(e.target.value))} min={1} />
              </div>
              <div>
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={v => set('unit', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Received Date <span className="text-red-500">*</span></Label>
                <Input type="date" className="mt-1" value={form.receivedDate} onChange={e => set('receivedDate', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Inspection Checklist
                {form.category && <span className="ml-2 font-normal text-slate-400">(auto-filled for {form.category})</span>}
              </p>
              <button onClick={addChecklistItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            </div>
            {checklist.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
                <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Select a category to auto-fill checklist, or add items manually</p>
              </div>
            ) : (
              <div className="space-y-2">
                {checklist.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Parameter (e.g. RPM, Finish)"
                        value={item.parameter}
                        onChange={e => updateChecklistItem(i, 'parameter', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Standard value / acceptance criteria"
                        value={item.standardValue}
                        onChange={e => updateChecklistItem(i, 'standardValue', e.target.value)}
                        className="text-sm"
                      />
                    </div>
                    <button onClick={() => removeChecklistItem(i)} className="mt-2 text-slate-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Input className="mt-1" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional instructions or remarks..." />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setLocation('/qc/jobs')}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create QC Job'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
