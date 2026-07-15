import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { orderFormApi } from '@/api/orderFormApi';
import { leadApi } from '@/api/leadService';
import { buildQuotationNumber } from '@/utils/quotationNumber';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertCircle, Plus, Trash2, Loader2 } from 'lucide-react';

const ACCOUNTS_ROLES = ['Accounts', 'Accounts Head', 'Account Employee', 'Superadmin', 'Super Admin'];
const ORDER_TYPES = ['Customer', 'Dealer', 'New', 'Repeat', 'Replacement'];
const PAYMENT_TYPES = ['Advance Payment', 'Full Payment', 'Partial Payment'];
const WAY_OF_PAYMENT_OPTIONS = ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Other'];

const GST_RATE = 0.18;

// locked=false → every column is manually editable (fallback when the lead has
// no persisted quotation snapshot, or a row the salesperson added by hand)
// hiddenCharge=true → contributes to the totals but is never rendered as its
// own row (additional charges are folded silently into the Quotation Amount)
const blankItem = () => ({
  mcCode: '', itemName: '', specification: '', hsnCode: '',
  qty: '', billAmount: '', gstAmount: '', quotationAmount: '', cashAmount: '', discountAmount: '',
  locked: false, hiddenCharge: false,
});

// Falls back to a plain '-' for any auto-filled field the quotation didn't have
const orDash = (v) => (v === undefined || v === null || v === '') ? '-' : v;

const toDateInput = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt)) return '';
  return dt.toISOString().slice(0, 10);
};

const num = (v) => Number(v) || 0;

// Mirrors generateQuotationPDF.js's buildSpecLines() so the Order Form shows
// the same spec/usage text the customer saw in the quotation.
function buildSpecText(item) {
  if (item.specUsageText) {
    return item.specUsageText.split(' | ').map(s => s.trim()).filter(Boolean).join('; ');
  }
  const parts = [];
  (item.specifications || []).forEach(s => { if (s.key && s.value) parts.push(`${s.key}: ${s.value}`); });
  const apps = item.applications || item.features || [];
  if (apps.length) parts.push(`Usages: ${apps.join(', ')}`);
  return parts.join('; ');
}

// Builds locked (auto-filled, read-only-ish) item rows from the lead's last
// saved quotation snapshot — visible product rows only. Additional charges
// (Installation, Freight, etc.) are NOT shown as their own rows — they're
// folded silently into the Quotation Amount total via hiddenCharge rows.
function itemsFromQuotation(lead) {
  const products = lead?.quotationItems || [];
  const charges = lead?.quotationCharges || [];
  if (!products.length && !charges.length) return null;

  const productRows = products.map(it => ({
    mcCode: orDash(it.code),
    itemName: orDash(it.name),
    specification: orDash(buildSpecText(it)),
    hsnCode: orDash(it.hsn),
    // Per-product quantity from the quotation — legacy snapshots may hold
    // ''/null/NaN here, so coerce and fall back to 1 (never a blank box)
    qty: num(it.quantity) || 1,
    billAmount: '',
    gstAmount: '',
    quotationAmount: num(it.price) * (num(it.quantity) || 1),
    cashAmount: '',
    discountAmount: '',
    locked: true,
    hiddenCharge: false,
  }));

  // Kept in `items` (so totals/submitted totals stay correct) but filtered
  // out of the rendered table entirely — see the `visibleItems` derivation.
  const chargeRows = charges.map(c => ({
    mcCode: '', itemName: c.name || '', specification: '', hsnCode: '',
    qty: '', billAmount: '', gstAmount: '',
    quotationAmount: num(c.price),
    cashAmount: '', discountAmount: '',
    locked: true,
    hiddenCharge: true,
  }));

  return [...productRows, ...chargeRows];
}

/**
 * Digital equivalent of the "SAMTEK MACHINERY — SALES ORDER FORM TO ACCOUNT"
 * paper form. Two entry points:
 *  - Sales flow: pass `orderId` + `order` + `lead` — fills/resubmits.
 *  - Accounts flow: pass `formId` — views an existing submission, with
 *    Edit / Return-for-Correction actions.
 */
export default function OrderFormModal({ open, onOpenChange, orderId, order, lead, formId, onSaved }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAccountsUser = ACCOUNTS_ROLES.includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingForm, setExistingForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showReturnBox, setShowReturnBox] = useState(false);
  const [returnRemark, setReturnRemark] = useState('');

  const [fields, setFields] = useState({});
  const [items, setItems] = useState([blankItem()]);

  // ─── Company stamp (same pattern as Quotation.jsx) ───────────────────────
  const { data: companyResponse } = useQuery({
    queryKey: ['my-company'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const storedUser = userStr ? JSON.parse(userStr) : null;
      const companyId = storedUser?.companyId || storedUser?.company?._id;
      if (!companyId) return null;
      const res = await axios.get(`${import.meta.env.VITE_API_URL || '/api'}/super-admin/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.data;
    },
    staleTime: 1000 * 60 * 10,
    enabled: open,
  });
  const companyStampUrl = companyResponse?.company?.stampUrl
    ? `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace('/api', '')}${companyResponse.company.stampUrl}`
    : null;

  // ─── Quotation Number setting (for prefill, same as Quotation.jsx) ───────
  const { data: adminSettingsData } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      const res = await fetch(`${apiBase}/admin-settings/`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  const prefillFromLead = (l, o) => {
    const settings = adminSettingsData?.settings?.quotationNumberSettings;
    const activeSetting = (settings && settings.length > 0) ? settings[settings.length - 1] : null;
    const today = toDateInput(new Date());
    setFields({
      customerName: l?.contactPerson || l?.companyName || '',
      mobile: l?.mobile || '',
      email: l?.email || '',
      companyName: l?.companyName || '',
      gstNumber: l?.gstNumber || '',
      companyAddress: l?.address || '',
      state: l?.state || '',
      pin: l?.pincode || '',
      quotationNo: l?.leadCode ? buildQuotationNumber(activeSetting, l.leadCode) : '',
      orderType: 'Customer',
      orderFormOrderId: o?.orderCode || '',
      orderDate: today,
      deliveryDate: '',
      issueDate: today,
      receivedAmount: '',
      paymentType: 'Advance Payment',
      balanceAmount: '',
      wayOfPayment: 'Cash',
      paymentReceiverAC: '',
      paymentDate: '',
    });
    setItems(itemsFromQuotation(l) || [blankItem()]);
  };

  const applyExistingForm = (f) => {
    setFields({
      customerName: f.customerName || '',
      mobile: f.mobile || '',
      email: f.email || '',
      companyName: f.companyName || '',
      gstNumber: f.gstNumber || '',
      companyAddress: f.companyAddress || '',
      state: f.state || '',
      pin: f.pin || '',
      quotationNo: f.quotationNo || '',
      orderType: f.orderType || 'Customer',
      orderFormOrderId: f.orderFormOrderId || '',
      orderDate: toDateInput(f.orderDate),
      deliveryDate: toDateInput(f.deliveryDate),
      issueDate: toDateInput(f.issueDate),
      receivedAmount: f.receivedAmount ?? '',
      paymentType: f.paymentType || 'Advance Payment',
      balanceAmount: f.balanceAmount ?? '',
      wayOfPayment: f.wayOfPayment || 'Cash',
      paymentReceiverAC: f.paymentReceiverAC || '',
      paymentDate: toDateInput(f.paymentDate),
    });
    // Editing/viewing a real submission — every field is freely correctable,
    // regardless of whether it originally came from the quotation snapshot.
    // hiddenCharge is preserved so a previously-folded-in additional charge
    // stays hidden on re-view/edit too, not just at first fill.
    setItems(f.items?.length ? f.items.map(it => ({ ...it, locked: false, hiddenCharge: !!it.hiddenCharge })) : [blankItem()]);
  };

  // ─── Load data whenever the modal opens ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setShowReturnBox(false);
    setReturnRemark('');

    (async () => {
      try {
        if (formId) {
          const res = await orderFormApi.getById(formId);
          if (cancelled) return;
          const f = res.orderForm;
          setExistingForm(f);
          applyExistingForm(f);
          setEditing(false);
        } else if (orderId) {
          const res = await orderFormApi.getByOrderId(orderId);
          if (cancelled) return;
          const f = res?.orderForm || null;
          setExistingForm(f);
          if (!f) {
            // The `lead` prop comes from whatever list query rendered the button —
            // it may be a stale cache from before the quotation was last
            // downloaded/printed/emailed. Re-fetch fresh so the item table always
            // reflects the latest saved quotation snapshot.
            let freshLead = lead;
            if (lead?._id) {
              try {
                const leadRes = await leadApi.getById(lead._id);
                if (leadRes?.lead) freshLead = leadRes.lead;
              } catch (e) { console.error('Failed to refresh lead for Order Form prefill:', e); }
            }
            if (cancelled) return;
            prefillFromLead(freshLead, order);
            setEditing(true);
          } else if (f.status === 'Returned') {
            applyExistingForm(f);
            setEditing(true);
          } else {
            applyExistingForm(f);
            setEditing(false);
          }
        }
      } catch (e) {
        toast({ title: 'Error loading Order Form', description: e.message, variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, formId, orderId]);

  const setField = (k, v) => setFields(p => ({ ...p, [k]: v }));
  const setItemField = (idx, k, v) => setItems(prev => prev.map((it, i) => {
    if (i !== idx) return it;
    const updated = { ...it, [k]: v };
    // GST Amount is never typed directly — it's always 18% of Bill Amount
    if (k === 'billAmount') {
      const bill = num(v);
      updated.gstAmount = bill > 0 ? +(bill * GST_RATE).toFixed(2) : '';
    }
    return updated;
  }));
  const addItemRow = () => setItems(prev => [...prev, blankItem()]);
  const removeItemRow = (idx) => setItems(prev => {
    const target = prev[idx];
    if (!target) return prev;
    // Keep at least one *visible* row — hidden charge rows don't count.
    if (!target.hiddenCharge && prev.filter(x => !x.hiddenCharge).length <= 1) return prev;
    return prev.filter((_, i) => i !== idx);
  });

  // Rows never shown in the table (folded-in additional charges) still carry
  // their original array index so field edits/removal target the right row.
  const visibleItems = useMemo(
    () => items.map((it, originalIdx) => ({ it, originalIdx })).filter(({ it }) => !it.hiddenCharge),
    [items]
  );

  const totals = useMemo(() => {
    const t = items.reduce((acc, it) => {
      acc.qty += num(it.qty);
      acc.billAmount += num(it.billAmount);
      acc.gstAmount += num(it.gstAmount);
      acc.quotationAmount += num(it.quotationAmount);
      acc.cashAmount += num(it.cashAmount);
      acc.discountAmount += num(it.discountAmount);
      if (it.hiddenCharge) acc.chargesFolded += num(it.quotationAmount);
      return acc;
    }, { qty: 0, billAmount: 0, gstAmount: 0, quotationAmount: 0, cashAmount: 0, discountAmount: 0, chargesFolded: 0 });
    // Balance Amount = total Bill Amount + its 18% GST + total Cash Amount,
    // across every row (products and the quotation's additional charges alike) —
    // minus the row-wise Discounts and whatever's already been Received.
    t.balance = t.billAmount + t.gstAmount + t.cashAmount - t.discountAmount - num(fields.receivedAmount);
    return t;
  }, [items, fields.receivedAmount]);

  const effectiveOrderId = orderId || existingForm?.orderId?._id || existingForm?.orderId;

  const handleSubmit = async () => {
    if (!fields.customerName?.trim() || !fields.mobile?.trim()) {
      toast({ title: 'Required fields missing', description: 'Customer Name and Mobile are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Balance Amount is always the live-computed total, never the stale typed value
      const payload = { ...fields, balanceAmount: totals.balance, items };
      const res = await orderFormApi.submit(effectiveOrderId, payload);
      toast({ title: 'Order Form submitted' });
      setExistingForm(res.orderForm);
      setEditing(false);
      onSaved?.(res.orderForm);
      if (!isAccountsUser) onOpenChange(false);
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!returnRemark.trim()) {
      toast({ title: 'Remark required', description: 'Please explain what needs to be corrected.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const res = await orderFormApi.returnForCorrection(existingForm._id, returnRemark.trim());
      toast({ title: 'Order Form returned to salesperson' });
      setExistingForm(res.orderForm);
      onSaved?.(res.orderForm);
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const disabled = !editing || saving;
  const displayLead = lead || existingForm?.leadId;
  const displayOrder = order || existingForm?.orderId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Sales Order Form to Account</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="p-0 min-w-0">
            {/* ── Header banner ── */}
            <div className="px-6 pt-7 pb-4 text-center">
              <h2 className="text-4xl font-extrabold tracking-widest">
                <span className="text-navy-900" style={{ color: '#0d3b66' }}>SAMTEK</span>{' '}
                <span style={{ color: '#c0392b' }}>MACHINERY</span>
              </h2>
            </div>
            <div className="text-white text-center font-bold py-2 text-lg" style={{ backgroundColor: '#e8743b' }}>
              SALES ORDER FORM TO ACCOUNT
            </div>

            <div className="p-6 space-y-5 min-w-0">
              {existingForm?.status === 'Returned' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Returned for Correction by Accounts</p>
                    <p>{existingForm.returnRemark}</p>
                  </div>
                </div>
              )}

              {/* ── Customer block ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Customer Name" value={fields.customerName} onChange={v => setField('customerName', v)} disabled={disabled} />
                <Field label="Mobile" value={fields.mobile} onChange={v => setField('mobile', v)} disabled={disabled} />
                <Field label="Email" value={fields.email} onChange={v => setField('email', v)} disabled={disabled} />
                <Field label="Company Name" value={fields.companyName} onChange={v => setField('companyName', v)} disabled={disabled} />
                <Field label="GST No" value={fields.gstNumber} onChange={v => setField('gstNumber', v)} disabled={disabled} />
                <Field label="State" value={fields.state} onChange={v => setField('state', v)} disabled={disabled} />
                <Field label="Company Address" value={fields.companyAddress} onChange={v => setField('companyAddress', v)} disabled={disabled} className="md:col-span-2" />
                <Field label="Pin" value={fields.pin} onChange={v => setField('pin', v)} disabled={disabled} />
              </div>

              <div className="h-px bg-gray-200" />

              {/* ── Order meta block ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field label="Quotation No" value={fields.quotationNo} onChange={v => setField('quotationNo', v)} disabled={disabled} />
                <SelectField label="Order Type" value={fields.orderType} onChange={v => setField('orderType', v)} disabled={disabled} options={ORDER_TYPES} />
                <Field label="Order ID" value={fields.orderFormOrderId} onChange={v => setField('orderFormOrderId', v)} disabled={disabled} />
                <Field type="date" label="Order Date" value={fields.orderDate} onChange={v => setField('orderDate', v)} disabled={disabled} />
                <Field type="date" label="Delivery Date" value={fields.deliveryDate} onChange={v => setField('deliveryDate', v)} disabled={disabled} />
                <Field type="date" label="Issue Date" value={fields.issueDate} onChange={v => setField('issueDate', v)} disabled={disabled} />
              </div>

              <div className="h-px bg-gray-200" />

              {/* ── Payment Details block ── */}
              <p className="text-sm font-semibold text-gray-700">Payment Details</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Field type="number" label="Received Amount (INR)" value={fields.receivedAmount} onChange={v => setField('receivedAmount', v)} disabled={disabled} />
                <SelectField label="Payment Type" value={fields.paymentType} onChange={v => setField('paymentType', v)} disabled={disabled} options={PAYMENT_TYPES} />
                <div>
                  <Field
                    type="number"
                    label="Balance Amount (auto)"
                    value={editing ? totals.balance.toFixed(2) : fields.balanceAmount}
                    onChange={() => {}}
                    disabled
                  />
                  {editing && (
                    <p className="text-[10px] text-gray-400 mt-1">= (Bill Amt + GST + Cash Amount) − Discount − Received Amount</p>
                  )}
                </div>
                <SelectField label="Way of Payment" value={fields.wayOfPayment} onChange={v => setField('wayOfPayment', v)} disabled={disabled} options={WAY_OF_PAYMENT_OPTIONS} />
                <Field label="Payment Receiver (A/C)" value={fields.paymentReceiverAC} onChange={v => setField('paymentReceiverAC', v)} disabled={disabled} />
                <Field type="date" label="Payment Date" value={fields.paymentDate} onChange={v => setField('paymentDate', v)} disabled={disabled} />
              </div>

              <div className="h-px bg-gray-200" />

              {/* ── Item table ── */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Items</p>
                  {editing && items.some(it => it.locked) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Highlighted rows are pulled from the quotation — fill in Bill Amt, Cash Amount &amp; Discount only.
                    </p>
                  )}
                </div>
                {!disabled && (
                  <Button size="sm" variant="outline" onClick={addItemRow}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto border rounded-lg">
                {/* table-fixed + explicit widths on every header cell — otherwise the
                    browser sizes columns off content and the amount inputs end up
                    tiny regardless of the width classes on them. */}
                <Table className="table-fixed" style={{ minWidth: '1520px' }}>
                  <TableHeader>
                    <TableRow>
                      <TableHead style={{ width: 44 }}>S.No</TableHead>
                      <TableHead style={{ width: 140 }}>M/C Code</TableHead>
                      <TableHead style={{ width: 220 }}>Item Name</TableHead>
                      <TableHead style={{ width: 320 }}>Spec.</TableHead>
                      <TableHead style={{ width: 90 }}>HSN Code</TableHead>
                      <TableHead style={{ width: 70 }}>QTY</TableHead>
                      <TableHead style={{ width: 120 }}>Bill Amt</TableHead>
                      <TableHead style={{ width: 120 }}>GST Amt</TableHead>
                      <TableHead style={{ width: 120 }}>Quot. Amount</TableHead>
                      <TableHead style={{ width: 120 }}>Cash Amount</TableHead>
                      <TableHead style={{ width: 120 }}>Discount</TableHead>
                      {!disabled && <TableHead style={{ width: 36 }} />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleItems.map(({ it, originalIdx }, visibleIdx) => {
                      // Rows pulled from the lead's quotation come pre-filled and locked —
                      // only Bill/Cash/Discount are ever manually typed. GST Amount is
                      // always computed (18% of Bill Amount), never a direct input.
                      const lockedDisabled = disabled || it.locked;
                      return (
                        <TableRow key={originalIdx} className={it.locked ? 'bg-blue-50/40' : undefined}>
                          <TableCell className="align-top pt-2.5">{visibleIdx + 1}</TableCell>
                          <TableCell className="align-top"><CellInput value={it.mcCode} onChange={v => setItemField(originalIdx, 'mcCode', v)} disabled={lockedDisabled} /></TableCell>
                          <TableCell className="align-top"><CellInput value={it.itemName} onChange={v => setItemField(originalIdx, 'itemName', v)} disabled={lockedDisabled} /></TableCell>
                          <TableCell className="align-top"><SpecCell value={it.specification} onChange={v => setItemField(originalIdx, 'specification', v)} disabled={lockedDisabled} /></TableCell>
                          <TableCell className="align-top"><CellInput value={it.hsnCode} onChange={v => setItemField(originalIdx, 'hsnCode', v)} disabled={lockedDisabled} size="lg" /></TableCell>
                          <TableCell className="align-top"><CellInput type="number" value={it.qty} onChange={v => setItemField(originalIdx, 'qty', v)} disabled={lockedDisabled} className="text-right" size="lg" /></TableCell>
                          <TableCell className="align-top"><CellInput type="number" value={it.billAmount} onChange={v => setItemField(originalIdx, 'billAmount', v)} disabled={disabled} className="text-right" size="lg" /></TableCell>
                          <TableCell className="align-top"><CellInput type="number" value={it.gstAmount} onChange={() => {}} disabled title="Auto: 18% of Bill Amt" className="text-right" size="lg" /></TableCell>
                          <TableCell className="align-top"><CellInput type="number" value={it.quotationAmount} onChange={v => setItemField(originalIdx, 'quotationAmount', v)} disabled={lockedDisabled} className="text-right" size="lg" /></TableCell>
                          <TableCell className="align-top"><CellInput type="number" value={it.cashAmount} onChange={v => setItemField(originalIdx, 'cashAmount', v)} disabled={disabled} className="text-right" size="lg" /></TableCell>
                          <TableCell className="align-top"><CellInput type="number" value={it.discountAmount} onChange={v => setItemField(originalIdx, 'discountAmount', v)} disabled={disabled} className="text-right" size="lg" /></TableCell>
                          {!disabled && (
                            <TableCell className="align-top pt-2.5">
                              <button type="button" onClick={() => removeItemRow(originalIdx)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-semibold bg-gray-50">
                      <TableCell colSpan={5}>
                        TOTAL
                        {totals.chargesFolded > 0 && (
                          <span className="font-normal text-gray-400 text-xs ml-2">
                            (incl. {totals.chargesFolded.toLocaleString('en-IN')} additional charges)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{totals.qty}</TableCell>
                      <TableCell className="text-right">{totals.billAmount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right">{totals.gstAmount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right">{totals.quotationAmount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right">{totals.cashAmount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-right">{totals.discountAmount.toLocaleString('en-IN')}</TableCell>
                      {!disabled && <TableCell />}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="h-px bg-gray-200" />

              {/* ── Footer: stamps ── */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-2">SALES STAMP &amp; SIGNATURE</p>
                  <div className="h-24 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
                    {companyStampUrl
                      ? <img src={companyStampUrl} alt="Company Stamp" className="h-20 object-contain" />
                      : <span className="text-xs text-gray-300">No stamp uploaded</span>}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-500 mb-2">ACCOUNT STAMP &amp; SIGNATURE</p>
                  <div className="h-24 border border-dashed border-gray-300 rounded-lg" />
                </div>
              </div>

              {/* ── Accounts return-for-correction box ── */}
              {isAccountsUser && showReturnBox && (
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 space-y-2">
                  <Label className="text-sm">Remark for the salesperson</Label>
                  <Textarea rows={2} value={returnRemark} onChange={e => setReturnRemark(e.target.value)} placeholder="What needs to be corrected?" />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setShowReturnBox(false)}>Cancel</Button>
                    <Button size="sm" variant="destructive" disabled={saving} onClick={handleReturn}>
                      {saving ? 'Returning...' : 'Confirm Return'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer actions ── */}
            <div className="px-6 pb-6 pt-2 flex justify-end gap-2 border-t border-gray-100 mt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              {editing && (
                <Button disabled={saving} onClick={handleSubmit}>
                  {saving ? 'Submitting...' : (existingForm ? 'Resubmit Order Form' : 'Submit Order Form')}
                </Button>
              )}
              {!editing && isAccountsUser && existingForm?.status === 'Submitted' && !showReturnBox && (
                <>
                  <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>
                  <Button variant="destructive" onClick={() => setShowReturnBox(true)}>Return for Correction</Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, disabled, type = 'text', className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs text-gray-500">{label}</Label>
      <Input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="h-9 text-sm"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, disabled, options }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-gray-500">{label}</Label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CellInput({ value, onChange, disabled, type = 'text', title, className = '', size = 'sm' }) {
  const sizeClasses = size === 'lg'
    ? 'h-10 text-sm px-2.5 border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200'
    : 'h-8 text-xs px-1.5 border-transparent focus:border-gray-300 disabled:bg-transparent';
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      title={title}
      className={`w-full border rounded ${sizeClasses} ${className}`}
    />
  );
}

// Specification never scrolls horizontally — it wraps onto extra lines
// within the cell instead, so the full text stays visible.
function SpecCell({ value, onChange, disabled }) {
  if (disabled) {
    return (
      <div className="text-xs px-1.5 py-1 whitespace-pre-wrap break-words leading-snug min-h-[2rem]">
        {value || '-'}
      </div>
    );
  }
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      rows={2}
      className="w-full text-xs px-1.5 py-1 border border-transparent focus:border-gray-300 rounded resize-y whitespace-pre-wrap break-words"
    />
  );
}
