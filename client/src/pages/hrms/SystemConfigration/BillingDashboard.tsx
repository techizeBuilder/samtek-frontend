/** @format */

import { useEffect, useState } from "react";
import { 
  CreditCard, 
  Users, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  IndianRupee,
  ShieldCheck,
  ArrowRight,
  Download
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import axiosInstance from "@/api/axiosInstance";
import { toast } from "sonner";

import AdminBillingView from "./AdminBillingView";

interface BillingData {
  name: string;
  subscriptionPlan: "TRIAL" | "ACTIVE" | "EXPIRED";
  subscriptionStatus: "PENDING" | "PAID" | "OVERDUE";
  trialEndDate: string;
  subscriptionEndDate: string | null;
  employeeLimit: number;
  activeUserCount: number; // NEW
  subscriptionAmount: number;
  companyId: string;
  overageCharge: number;   // NEW
  baseCharge: number;      // NEW
  upcomingBill: number;    // NEW
}

interface PaymentHistory {
  _id: string;
  paymentId: string;
  orderId: string;
  amount: number;
  status: string;
  method: string;
  description: string;
  createdAt: string;
}

export default function BillingDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "hrms-admin";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-[var(--background)]">
      {isAdmin ? <AdminBillingView /> : <CompanyBillingView />}
    </div>
  );
}

function CompanyBillingView() {
  const { user, refreshUser } = useAuth();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // 📦 Load Razorpay Script (Robust Version)
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      // Check if already exists
      if (document.getElementById("razorpay-sdk")) {
        console.log("Razorpay SDK already loaded");
        resolve(true);
        return;
      }

      console.log("Loading Razorpay SDK...");
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        console.log("Razorpay SDK loaded successfully");
        resolve(true);
      };
      script.onerror = () => {
        console.error("Failed to load Razorpay SDK");
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const fetchBillingInfo = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/companies/${user?.companyId}`);
      setBilling(res.data);
    } catch (error) {
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user?.companyId) return;
    try {
      setHistoryLoading(true);
      const res = await axiosInstance.get(`/saas/history/${user.companyId}`);
      setHistory(res.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDownloadInvoice = async (paymentId: string) => {
    try {
      toast.loading("Generating Invoice...", { id: "invoice-gen" });
      const response = await axiosInstance.get(`/saas/invoice/${paymentId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${paymentId.slice(-6)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Invoice downloaded successfully!", { id: "invoice-gen" });
    } catch (error) {
      toast.error("Failed to download invoice", { id: "invoice-gen" });
    }
  };

  const handleUpgrade = async () => {
    console.log("Upgrade button clicked for company:", user?.companyId);
    if (!user?.companyId) {
      toast.error("User session missing company ID");
      return;
    }
    
    try {
      setIsActivating(true);

      // 1. Load Razorpay Script
      const resLoad = await loadRazorpay();
      if (!resLoad) {
        toast.error("Razorpay SDK failed to load. Are you online?");
        return;
      }

      // 2. Create Order on Backend
      console.log("Requesting payment order from backend...");
      const orderRes = await axiosInstance.post("/saas/create-order", { 
        companyId: user.companyId 
      });
      
      console.log("Backend Order Response:", orderRes.data);
      const { id: order_id, amount, currency } = orderRes.data;

      if (!order_id) {
        throw new Error("Backend failed to return a valid Order ID");
      }

      // 3. Open Razorpay Checkout
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      
      if (!razorpayKey || razorpayKey === "rzp_test_dummy_key") {
        console.warn("⚠️ Razorpay Key is missing or dummy. Modal might not open.");
        toast.error("Razorpay Key not configured. Please add VITE_RAZORPAY_KEY_ID to your .env file.");
        setIsActivating(false);
        return;
      }

      console.log("Initializing Razorpay Checkout with Key:", razorpayKey);

      const options = {
        key: razorpayKey, 
        amount: amount,
        currency: currency,
        name: "ThinkPro HRMS",
        description: `Subscription Upgrade for ${user.name}`,
        image: "/fancy-logo.jpg", // Ensure this path is correct or use a public URL
        order_id: order_id,
        handler: async (response: any) => {
          console.log("Payment successful from Razorpay, verifying with backend...", response);
          try {
            await axiosInstance.post("/saas/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              companyId: user.companyId
            });

            toast.success("Payment Successful! Subscription Activated.");
            await refreshUser(); // Sync globally
            await fetchBillingInfo(); // Refresh page data
            await fetchHistory(); // Refresh history
          } catch (err: any) {
            console.error("Backend verification failed:", err);
            toast.error(err.response?.data?.message || "Payment verification failed");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: () => {
            console.log("User closed the checkout modal");
            toast.info("Payment cancelled");
            setIsActivating(false);
          }
        }
      };

      // Robust check for window.Razorpay with retry
      let retries = 0;
      const checkAndOpen = () => {
        if ((window as any).Razorpay) {
          console.log("Opening Razorpay Modal...");
          const paymentObject = new (window as any).Razorpay(options);
          paymentObject.open();
        } else if (retries < 5) {
          retries++;
          console.log(`Razorpay SDK not ready, retry ${retries}/5...`);
          setTimeout(checkAndOpen, 300);
        } else {
          console.error("window.Razorpay is still undefined after multiple retries");
          toast.error("Razorpay initialization failed. Please refresh the page.");
          setIsActivating(false);
        }
      };

      setTimeout(checkAndOpen, 100);

    } catch (error: any) {
      console.error("Upgrade initiation failed:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to initiate payment");
    } finally {
      setIsActivating(false);
    }
  };

  useEffect(() => {
    if (user?.companyId) {
      fetchHistory();
      fetchBillingInfo();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!billing) return <div>No billing data found.</div>;

  const now = new Date();
  const isTrial = billing.subscriptionPlan === 'TRIAL';
  const expiryDate = isTrial ? new Date(billing.trialEndDate) : new Date(billing.subscriptionEndDate || billing.trialEndDate);
  const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">Billing & Subscription</h1>
          <p className="text-[var(--muted-foreground)]">Manage your company workspace subscription and billing details.</p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
            variant="outline" 
            className="h-10 border-[var(--primary)] text-[var(--primary)]"
            onClick={() => history.length > 0 && handleDownloadInvoice(history[0]._id)}
            disabled={history.length === 0}
           >
             <Download size={16} className="mr-2" />
             Latest Invoice
           </Button>
           <Button 
            onClick={handleUpgrade}
            disabled={isActivating || billing.subscriptionPlan === 'ACTIVE'}
            className="h-10 bg-[var(--primary)] hover:bg-[var(--primary)]/90 shadow-lg shadow-blue-500/20"
           >
             {isActivating ? (
               <span className="flex items-center gap-2">
                 <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                 Processing...
               </span>
             ) : (
               billing.subscriptionPlan === 'ACTIVE' ? "Active Member" : "Upgrade Plan"
             )}
           </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Plan Status Card */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-gradient-to-br from-[var(--sidebar)] to-slate-800 text-white overflow-hidden relative">
           <div className="absolute top-0 right-0 p-8 opacity-10">
              <TrendingUp size={120} />
           </div>
           <CardHeader className="pb-2">
             <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="text-[var(--primary)]" />
                  Current Subscription Plan
                </CardTitle>
                <div className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest ${billing.subscriptionPlan === 'TRIAL' ? 'bg-orange-500' : 'bg-[var(--primary)]'}`}>
                   {billing.subscriptionPlan} Plan
                </div>
             </div>
             <CardDescription className="text-slate-400">
               Your workspace is currently on the {billing.subscriptionPlan === 'TRIAL' ? 'Free Trial' : 'Enterprise'} plan.
             </CardDescription>
           </CardHeader>
           <CardContent className="pt-6 relative z-10">
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                   <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black italic">₹{billing.subscriptionAmount}</span>
                      <span className="text-slate-400 font-medium">/ month</span>
                   </div>
                   <div className="space-y-4">
                      {/* Badi highlight for Current Plan Quota */}
                      <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Your Active Quota</p>
                         <h2 className="text-2xl font-black text-white flex items-baseline gap-2">
                           {billing.employeeLimit} <span className="text-xs font-medium text-slate-400 italic">User License</span>
                         </h2>
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center justify-between text-sm px-1">
                            <span className="text-slate-300 font-medium">Current System Usage</span>
                            <span className={`font-black ${billing.activeUserCount > billing.employeeLimit ? 'text-orange-400' : 'text-green-400'}`}>
                               {billing.activeUserCount} / {billing.employeeLimit}
                            </span>
                         </div>
                         {/* Progress bar logic if needed */}
                         <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div 
                               className={`h-full transition-all duration-500 rounded-full ${billing.activeUserCount > billing.employeeLimit ? 'bg-orange-500' : 'bg-[var(--primary)]'}`}
                               style={{ width: `${Math.min((billing.activeUserCount / billing.employeeLimit) * 100, 100)}%` }}
                            ></div>
                         </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 pl-1">
                        <Calendar size={14} className="text-slate-500" />
                        <span>Recurring on the <span className="text-white font-bold">{new Date().getDate()}th</span> of every month</span>
                      </div>
                   </div>
                </div>

                 <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 min-w-[240px]">
                    <p className="text-xs uppercase font-bold text-slate-400 mb-2 tracking-widest">
                       {isTrial ? 'Trial Countdown' : 'Subscription Renewal'}
                    </p>
                    <div className="flex items-center justify-between gap-4">
                       <span className={`text-4xl font-black ${isTrial ? 'text-orange-400' : 'text-green-400'}`}>{daysRemaining}</span>
                       <span className="text-sm font-medium leading-tight">Days Remaining<br/><span className="text-slate-400">{isTrial ? 'Trial' : 'Plan'} ends {expiryDate.toLocaleDateString()}</span></span>
                    </div>
                 </div>
             </div>

             <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                   <CheckCircle2 size={16} className="text-green-400" />
                   <span className="text-sm">24/7 Support Active</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg border border-white/5">
                   <CheckCircle2 size={16} className="text-green-400" />
                   <span className="text-sm">Unlimited Data History</span>
                </div>
             </div>
           </CardContent>
        </Card>

        {/* Quick Billing Overview */}
        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
           <CardHeader className="bg-slate-50 dark:bg-white/5 border-b pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Receipt className="text-[var(--primary)]" />
                Summary
              </CardTitle>
           </CardHeader>
           <CardContent className="p-6 space-y-6">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--muted-foreground)]">Base (Next Month)</span>
                    <div className="text-right">
                       <span className="font-bold">₹{billing.baseCharge}</span>
                       <p className="text-[9px] text-slate-400 font-medium tracking-tight">For {billing.activeUserCount} active employees</p>
                    </div>
                 </div>
                 
                 <div className="flex justify-between items-center text-sm">
                    <div className="flex flex-col">
                       <span className="text-[var(--muted-foreground)] flex items-center gap-1">
                         Usage Overage <AlertCircle size={10} className="text-orange-500" />
                       </span>
                    </div>
                    <div className="text-right">
                       <span className="font-bold text-orange-500">+ ₹{billing.overageCharge}</span>
                       <p className="text-[9px] text-orange-400 font-medium italic">Prorated usage fee</p>
                    </div>
                 </div>

                 <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed italic">
                      <b>Why Overage?</b> Since your current limit was <span className="text-slate-900 dark:text-white">{billing.employeeLimit} users</span>, any extra users added mid-month are charged for the exact days they stayed in the system.
                    </p>
                 </div>

                 <div className="pt-4 border-t border-[var(--primary)]/20 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                       <span className="font-bold text-lg">Upcoming Bill</span>
                       <div className="text-right">
                          <span className="font-black text-2xl text-[var(--primary)]">₹{billing.upcomingBill}</span>
                          <p className="text-[10px] text-slate-400">Due {new Date(billing.subscriptionEndDate || billing.trialEndDate).toLocaleDateString()}</p>
                       </div>
                    </div>
                 </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-3">
                 <div className="mt-1">
                    <AlertCircle size={18} className="text-blue-600 dark:text-blue-400" />
                 </div>
                 <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                    Your next automated billing cycle will trigger on {expiryDate.toLocaleDateString()}. Make sure your payment method is verified.
                 </p>
              </div>

              <Button className="w-full h-11 flex items-center gap-2 group">
                 Manage Payment Method
                 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Button>
           </CardContent>
        </Card>

      </div>

      {/* Payment History Placeholder */}
      <Card className="border-none shadow-xl">
         <CardHeader>
            <CardTitle className="text-xl font-bold">Recent Billing History</CardTitle>
            <CardDescription>View and download your previous monthly statements.</CardDescription>
         </CardHeader>
         <CardContent>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : history.length > 0 ? (
              <div className="rounded-md border border-[var(--border)] overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString(undefined, { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-[var(--muted-foreground)]">
                          {item.paymentId}
                        </TableCell>
                        <TableCell className="capitalize text-xs font-medium">
                          {item.method}
                        </TableCell>
                        <TableCell className="font-bold">
                          ₹{item.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                            item.status === 'CAPTURED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:text-[var(--primary)]"
                            onClick={() => handleDownloadInvoice(item._id)}
                            title="Download Invoice"
                          >
                            <Download size={16} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3 grayscale opacity-40">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <CreditCard size={32} />
                </div>
                <p className="font-bold text-slate-500">No payment history available yet</p>
                <p className="text-sm text-slate-400">Billing records will appear here after your first transaction.</p>
              </div>
            )}
         </CardContent>
      </Card>
    </div>
  );
}

// Missing icon from imports
function Receipt({ className, size = 20 }: { className?: string, size?: number }) {
  return <IndianRupee className={className} size={size} />;
}
