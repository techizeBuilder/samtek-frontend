import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Phone, Lock, ShieldCheck, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { cashAccessApi } from '@/api/cashAccessApi';

/**
 * Four-step, 2FA-gated flow for an Accounts user to view a customer's Cash
 * Amount (collected by the salesperson, filled inside their Order Form):
 *   1. Call popup — name, customer ID, a decorative Call button (no-op).
 *   2. Double-click the name → Cash Password (6 digits, set by Company Admin).
 *   3. Enter OTP emailed to the Company Admin.
 *   4. View Cash — the actual total.
 */
export default function CustomerCashAccessModal({ customer, onClose }) {
  const [step, setStep] = useState('call'); // 'call' | 'password' | 'otp' | 'view'
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [requestId, setRequestId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cashData, setCashData] = useState(null);

  const handleVerifyPassword = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await cashAccessApi.verifyPassword(customer._id, password);
      setRequestId(res.requestId);
      setStep('otp');
      setPassword('');
    } catch (e) {
      setError(e.message || 'Incorrect Cash Password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      await cashAccessApi.verifyOtp(requestId, otp);
      const cash = await cashAccessApi.viewCash(requestId);
      setCashData(cash);
      setStep('view');
    } catch (e) {
      setError(e.message || 'Incorrect OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Customer Cash Access</DialogTitle>
        </DialogHeader>

        {step === 'call' && (
          <div className="space-y-4 text-center py-2">
            <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <Phone className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p
                className="font-semibold text-slate-900 text-lg cursor-pointer select-none"
                onDoubleClick={() => setStep('password')}
              >
                {customer.name}
              </p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{customer.customerCode || customer._id}</p>
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => {}}>
              <Phone className="h-4 w-4 mr-2" /> Call
            </Button>
          </div>
        )}

        {step === 'password' && (
          <div className="space-y-4 py-2">
            <div className="text-center">
              <Lock className="h-6 w-6 text-slate-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-900">Enter Cash Password</p>
              <p className="text-xs text-slate-400 mt-0.5">Set by your Company Admin</p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={password} onChange={setPassword}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {error && (
              <p className="text-sm text-red-600 flex items-center justify-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            <Button
              className="w-full"
              disabled={password.length !== 6 || loading}
              onClick={handleVerifyPassword}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
            </Button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4 py-2">
            <div className="text-center">
              <ShieldCheck className="h-6 w-6 text-slate-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-900">Enter OTP</p>
              <p className="text-xs text-slate-400 mt-0.5">Sent to your Company Admin's email</p>
            </div>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {error && (
              <p className="text-sm text-red-600 flex items-center justify-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            <Button
              className="w-full"
              disabled={otp.length !== 6 || loading}
              onClick={handleVerifyOtp}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
            </Button>
          </div>
        )}

        {step === 'view' && cashData && (
          <div className="space-y-4 py-2">
            <div className="text-center">
              <Wallet className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <p className="font-semibold text-slate-900">{cashData.customerName}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{customer.customerCode || customer._id}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-700 font-medium">Total Cash Amount</p>
              <p className="text-2xl font-bold text-emerald-800 mt-1">
                ₹{(cashData.totalCash || 0).toLocaleString('en-IN')}
              </p>
            </div>
            {cashData.breakdown?.length > 0 && (
              <div className="space-y-1.5">
                {cashData.breakdown.map((b, i) => (
                  <div key={i} className="flex justify-between text-sm text-slate-600 px-1">
                    <span>{b.orderCode}</span>
                    <span className="font-medium">₹{b.cashAmount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
