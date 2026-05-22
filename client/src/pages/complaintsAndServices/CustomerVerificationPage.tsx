import React, { useState } from 'react';
// 🔥 FIX: Use 'wouter' instead of 'react-router-dom'
import { useParams } from 'wouter'; 
import { useVerifyCustomerResponse } from '@/hooks/useComplaints';
import { CheckCircle2, XCircle, Loader2, MessageSquare } from 'lucide-react';
// 🔥 Integrated your toast hook
import { useToast } from "@/hooks/use-toast"; 

export default function CustomerVerificationPage() {
  // Wouter's useParams works identically but imports from 'wouter'
  const params = useParams(); 
  const token = params?.token; 
  
  const { mutate: verifyResponse, isPending } = useVerifyCustomerResponse();
  const { toast } = useToast();
  
  const [comments, setComments] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (action: 'approve' | 'reject') => {
    if (action === 'reject' && !comments.trim()) {
      toast({
        variant: "destructive",
        title: "Reason Required",
        description: "Please tell us why you are unsatisfied so we can fix it.",
      });
      return;
    }
    
    if (!token) {
        toast({
            variant: "destructive",
            title: "Invalid Link",
            description: "No verification token found in the URL.",
        });
        return;
    }

    verifyResponse(
      { token, payload: { action, comments } },
      {
        onSuccess: (response) => {
          setIsSuccess(true);
          // Show a nice success toast
          toast({
            title: "Response Submitted",
            description: response.message || "Thank you for your feedback.",
            className: "bg-green-50 border-green-200 text-green-800",
          });
        },
        onError: (error: any) => {
          // Show the error cleanly using the toast
          toast({
            variant: "destructive",
            title: "Submission Failed",
            description: error.response?.data?.message || "Something went wrong.",
          });
        }
      }
    );
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg text-center border border-gray-100">
          <CheckCircle2 size={64} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
          <p className="text-gray-600">Your response has been successfully recorded. You may close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Service Verification</h1>
          <p className="text-sm text-gray-500">Our technician has marked your recent service request as resolved. Are you satisfied with the work?</p>
        </div>

        {!showRejectForm ? (
          <div className="space-y-4">
            <button 
              onClick={() => handleSubmit('approve')}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition disabled:opacity-50"
            >
              {isPending ? <Loader2 className="animate-spin" /> : <><CheckCircle2 /> Yes, I am satisfied</>}
            </button>

            <button 
              onClick={() => setShowRejectForm(true)}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-red-100 hover:border-red-200 hover:bg-red-50 text-red-600 font-bold py-4 px-6 rounded-xl transition"
            >
              <XCircle /> No, the issue persists
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
                <MessageSquare size={16} className="text-red-500" />
                Please tell us what went wrong:
              </label>
              <textarea 
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm bg-gray-50"
                placeholder="e.g., The machine is still making a strange noise..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowRejectForm(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition"
              >
                Back
              </button>
              <button 
                onClick={() => handleSubmit('reject')}
                disabled={isPending || !comments.trim()}
                className="flex-[2] flex justify-center items-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl transition disabled:opacity-50"
              >
                {isPending ? <Loader2 className="animate-spin" /> : 'Submit & Reopen Ticket'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}