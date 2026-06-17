import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Star, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function apiFetch(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Something went wrong');
  return data;
}

const ratingLabel = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };
const ratingColors = { 1: 'text-red-500', 2: 'text-orange-500', 3: 'text-yellow-500', 4: 'text-lime-500', 5: 'text-green-500' };

export default function CustomerFeedbackForm() {
  const { token } = useParams();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comments, setComments] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Fetch order info by token
  const { data, isLoading, error } = useQuery({
    queryKey: ['feedback-token', token],
    queryFn: () => apiFetch('GET', `/api/complaints/feedback/${token}`),
    retry: false
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: ({ rating, comments }) =>
      apiFetch('POST', `/api/complaints/feedback/${token}`, { rating, comments }),
    onSuccess: () => setSubmitted(true)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) return;
    submitMutation.mutate({ rating, comments });
  };

  // --- Loading ---
  if (isLoading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          <p className="text-slate-500">Loading your feedback form...</p>
        </div>
      </PageShell>
    );
  }

  // --- Error / Invalid token ---
  if (error || !data?.success) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
          <AlertCircle className="w-14 h-14 text-red-400" />
          <h2 className="text-xl font-bold text-slate-700">Link Not Valid</h2>
          <p className="text-slate-500 max-w-sm">
            {error?.message || data?.message || 'This feedback link is invalid or has expired.'}
          </p>
        </div>
      </PageShell>
    );
  }

  // --- Already submitted ---
  if (data.alreadySubmitted || submitted) {
    const orderData = data.data || submitMutation.data?.data;
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-14 gap-5 text-center px-6">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h2 className="text-2xl font-bold text-slate-800">Thank You!</h2>
          <p className="text-slate-500 max-w-sm">
            Your feedback has been recorded. We truly appreciate you taking the time!
          </p>
          {orderData?.rating && (
            <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl px-6 py-4">
              <p className="text-sm text-slate-500 mb-2">Your rating</p>
              <div className="flex justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star
                    key={s}
                    className={`w-7 h-7 ${s <= (orderData?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <p className={`text-sm font-semibold ${ratingColors[orderData?.rating] || 'text-slate-600'}`}>
                {orderData?.rating}/5 — {ratingLabel[orderData?.rating]}
              </p>
              {orderData?.comments && (
                <p className="text-xs text-slate-400 mt-2 italic">"{orderData.comments}"</p>
              )}
            </div>
          )}
        </div>
      </PageShell>
    );
  }

  const { customerName, machineName, technicianName } = data.data;
  const displayRating = hovered || rating;

  // --- Feedback Form ---
  return (
    <PageShell>
      <div className="px-6 pt-8 pb-10 max-w-md mx-auto">
        {/* Welcome message */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">How was your experience?</h1>
          <p className="text-slate-500 text-sm">
            Dear <strong>{customerName}</strong>, your <strong>{machineName}</strong> has been installed.
            {technicianName ? ` Installed by ${technicianName}.` : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating */}
          <div className="space-y-3">
            <Label className="text-center block text-slate-600 font-medium">Tap to rate</Label>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  aria-label={`Rate ${star} star`}
                >
                  <Star
                    className={`w-12 h-12 transition-colors ${
                      displayRating >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-200 hover:text-amber-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <p className={`text-center text-base font-semibold transition-colors ${ratingColors[displayRating]}`}>
                {displayRating}/5 — {ratingLabel[displayRating]}
              </p>
            )}
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label className="text-slate-600 font-medium">
              Comments <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              rows={4}
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Tell us about your experience with the installation, product quality, technician service..."
              className="resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full h-12 text-base bg-amber-500 hover:bg-amber-600 text-white font-semibold"
            disabled={rating === 0 || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
              </span>
            ) : (
              'Submit Feedback'
            )}
          </Button>

          {submitMutation.isError && (
            <p className="text-center text-sm text-red-500">{submitMutation.error?.message}</p>
          )}
        </form>
      </div>
    </PageShell>
  );
}

// Shared wrapper with Samtek branding
function PageShell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 flex items-start justify-center pt-10 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">Samtek Machinery</h2>
              <p className="text-amber-100 text-xs">Customer Feedback</p>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
