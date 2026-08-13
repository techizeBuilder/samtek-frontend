import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { CheckCircle, AlertCircle, Loader2, Package, Clock, Shield, DollarSign, Send, Building2 } from 'lucide-react';
import { formatDims } from '@/lib/fabricationDims';

export default function VendorBidForm() {
  const { token } = useParams();
  const [rfqData, setRfqData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [unitPrice, setUnitPrice] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [remarks, setRemarks] = useState('');

  const backendUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');

  useEffect(() => {
    fetchBidData();
  }, [token]);

  const fetchBidData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${backendUrl}/api/vendor-bid/${token}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Invalid or expired bid link');
        return;
      }

      setRfqData(data.data);

      // If already submitted, pre-fill existing values
      if (data.data.existingBid) {
        setUnitPrice(String(data.data.existingBid.unitPrice));
        setDeliveryDays(String(data.data.existingBid.deliveryDays));
        setWarrantyMonths(String(data.data.existingBid.warrantyMonths));
        setRemarks(data.data.existingBid.remarks || '');
        if (data.data.bidStatus === 'Submitted') {
          setSubmitted(true);
        }
      }
    } catch (err) {
      setError('Could not load bid details. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!unitPrice || parseFloat(unitPrice) <= 0) {
      alert('Please enter a valid unit price');
      return;
    }
    if (!deliveryDays || parseInt(deliveryDays) <= 0) {
      alert('Please enter a valid delivery time in days');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/vendor-bid/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitPrice: parseFloat(unitPrice),
          deliveryDays: parseInt(deliveryDays),
          warrantyMonths: parseInt(warrantyMonths) || 0,
          remarks
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || 'Failed to submit bid');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit bid. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalValue = unitPrice && rfqData
    ? (parseFloat(unitPrice) * rfqData.quantity).toLocaleString('en-IN', { maximumFractionDigits: 0 })
    : '—';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm w-full">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading RFQ details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md w-full">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-5" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Error</h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  // Already submitted state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-lg w-full">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Bid Submitted Successfully!</h2>
          <p className="text-slate-500 mb-6">
            Thank you <strong>{rfqData?.vendorName}</strong>! Your quotation for <strong>{rfqData?.productName}</strong> has been recorded.
          </p>

          <div className="bg-slate-50 rounded-xl p-5 text-left space-y-2 border border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Submitted Details</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">RFQ Number</span>
              <span className="font-semibold text-slate-800">{rfqData?.rfqNo}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Unit Price</span>
              <span className="font-semibold text-slate-800">₹{parseFloat(unitPrice).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Delivery Time</span>
              <span className="font-semibold text-slate-800">{deliveryDays} Days</span>
            </div>
            {warrantyMonths && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Warranty</span>
                <span className="font-semibold text-slate-800">{warrantyMonths} Months</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-6">
            You will be notified by email if your quotation is selected for the Purchase Order.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-purple-700 rounded-2xl p-6 mb-6 text-white text-center shadow-lg">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl font-bold">Vendor Quotation Form</h1>
          <p className="text-blue-100 text-sm mt-1">Request for Quotation · {rfqData?.rfqNo}</p>
        </div>

        {/* RFQ Info Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase mb-4">RFQ Details</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Product / Item Required</p>
                <p className="font-bold text-slate-800 text-base">{rfqData?.productName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 text-center text-blue-500 font-bold mt-0.5 shrink-0">#</span>
              <div>
                <p className="text-xs text-slate-400">Required Quantity</p>
                <p className="font-bold text-slate-800">{rfqData?.quantity} {rfqData?.quantityUnit || 'Unit(s)'}</p>
              </div>
            </div>
            {rfqData?.fabricationDimensionLines?.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-1">
                <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1.5">This order covers</p>
                <div className="space-y-1">
                  {rfqData.fabricationDimensionLines.map((l, i) => (
                    <div key={i} className="flex justify-between text-xs text-slate-600">
                      <span className="font-mono">{formatDims(l.values)} × {l.quantity}</span>
                      <span>{l.lineWeightKg != null ? `${l.lineWeightKg} kg` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {rfqData?.requiredByDate && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Required By</p>
                  <p className="font-bold text-red-600">
                    {new Date(rfqData.requiredByDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
            {rfqData?.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                <p className="text-xs font-semibold text-amber-700 mb-1">Notes from Buyer</p>
                <p className="text-sm text-amber-800">{rfqData.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bid Form */}
        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase mb-5">Your Quotation</p>
          <p className="text-sm text-slate-500 mb-5">
            Hello <strong className="text-slate-700">{rfqData?.vendorName}</strong>, please fill in your best quotation below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Unit Price */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <DollarSign className="w-4 h-4 inline mr-1 text-green-500" />
                Unit Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
                placeholder="e.g. 25000"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
              {unitPrice && rfqData && (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  Total order value: ₹{totalValue} (for {rfqData.quantity} {rfqData.quantityUnit || 'units'})
                </p>
              )}
            </div>

            {/* Delivery Days */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <Clock className="w-4 h-4 inline mr-1 text-blue-500" />
                Delivery Time (Days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                required
                placeholder="e.g. 7"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            {/* Warranty */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                <Shield className="w-4 h-4 inline mr-1 text-purple-500" />
                Warranty Period (Months)
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                placeholder="e.g. 12 (0 if no warranty)"
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Additional Remarks
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Ready stock available, Brand: XYZ, Special terms..."
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              />
            </div>

            {/* Summary before submit */}
            {unitPrice && deliveryDays && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 uppercase mb-2">Bid Summary</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Unit Price</span>
                    <p className="font-bold text-slate-800">₹{parseFloat(unitPrice).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Value</span>
                    <p className="font-bold text-blue-700">₹{totalValue}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Delivery In</span>
                    <p className="font-bold text-slate-800">{deliveryDays} Days</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Warranty</span>
                    <p className="font-bold text-slate-800">{warrantyMonths || 0} Months</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3.5 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 text-base shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="w-5 h-5" /> Submit Quotation</>
              )}
            </button>

            <p className="text-xs text-center text-slate-400">
              By submitting, you agree that this quotation is valid for 30 days and the prices are firm.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
