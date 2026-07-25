import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { CheckCircle, AlertCircle, Loader2, Package, RotateCcw, Send, Building2 } from 'lucide-react';

export default function PurchaseExchangeAccept() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const backendUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${backendUrl}/api/purchase-exchange/token/${token}`);
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || 'Invalid or expired link');
        return;
      }
      setData(body.data);
    } catch (err) {
      setError('Could not load details. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/purchase-exchange/token/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const body = await res.json();
      if (!res.ok) {
        alert(body.message || 'Failed to confirm replacement');
        return;
      }
      setAccepted(true);
    } catch (err) {
      alert('Failed to confirm replacement. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-sm w-full">
          <Loader2 className="w-10 h-10 animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading details...</p>
        </div>
      </div>
    );
  }

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

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-lg w-full">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Replacement Confirmed!</h2>
          <p className="text-slate-500 mb-6">
            Thank you <strong>{data?.vendorName}</strong>! We've recorded your confirmation for{' '}
            <strong>{data?.exchangeQty} {data?.purchaseUnit}</strong> of <strong>{data?.itemName}</strong>. Our Store
            team will follow up when the replacement shipment arrives.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-purple-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-gradient-to-r from-red-700 to-purple-700 rounded-2xl p-6 mb-6 text-white text-center shadow-lg">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-90" />
          <h1 className="text-2xl font-bold">Purchase Exchange Request</h1>
          <p className="text-red-100 text-sm mt-1">Replacement for a QC-rejected shipment</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase mb-4">Replacement Details</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Item</p>
                <p className="font-bold text-slate-800 text-base">{data?.itemName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <RotateCcw className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Quantity to Replace</p>
                <p className="font-bold text-slate-800">{data?.exchangeQty} {data?.purchaseUnit || 'Unit(s)'}</p>
              </div>
            </div>
            {data?.reason && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                <p className="text-xs font-semibold text-amber-700 mb-1">QC Rejection Reason</p>
                <p className="text-sm text-amber-800">{data.reason}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100">
          <p className="text-sm text-slate-500 mb-5">
            Hello <strong className="text-slate-700">{data?.vendorName}</strong>, please confirm that you can send a
            replacement for the quantity above. Once confirmed, our Store team will expect the replacement shipment.
          </p>
          <button
            onClick={handleAccept}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-red-600 to-purple-600 text-white font-bold py-3.5 rounded-xl hover:from-red-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 text-base shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Confirming...</>
            ) : (
              <><Send className="w-5 h-5" /> Confirm Replacement</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
