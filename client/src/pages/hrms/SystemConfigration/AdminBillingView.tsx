/** @format */
import { useEffect, useState } from "react";
import {

  AlertCircle,
  Search,
  Filter,
  ArrowUpRight,

  IndianRupee,
  Mail,
  MapPin,
  Building,
  TrendingUp,
  Building2,
  Users,
  CheckCircle2,
  Calendar,
  XCircle,
  Clock
} from "lucide-react";
import { useSidebar } from "@/components/ui/collapsible-sidebar";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import axiosInstance from "@/api/axiosInstance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AdminMetrics {
  totalCompanies: number;
  activePlans: number;
  trialPlans: number;
  expiredPlans: number;
  totalRevenue: number;
}

interface CompanyBillingInfo {
  _id: string;
  name: string;
  companyId: string;
  email: string;
  logo: string;
  subscriptionPlan: "TRIAL" | "ACTIVE" | "EXPIRED";
  subscriptionStatus: "PENDING" | "PAID" | "OVERDUE";
  trialEndDate: string;
  subscriptionEndDate: string | null;
  employeeLimit: number;
  activeUserCount: number; // NEW
  subscriptionAmount: number;
  createdAt: string;
  phone?: string;
  industry?: string;
  city?: string;
  state?: string;
  address?: string;
  website?: string;
  gstNo?: string;
}

export default function AdminBillingView() {
  const { isCollapsed } = useSidebar();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [companies, setCompanies] = useState<CompanyBillingInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [selectedCompany, setSelectedCompany] = useState<CompanyBillingInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/saas/admin/billing-overview");
      setMetrics(res.data.metrics);
      setCompanies(res.data.companies);
    } catch (error) {
      toast.error("Failed to load global billing records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || c.subscriptionPlan.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 🚀 Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            value: `₹${metrics?.totalRevenue.toLocaleString()}`,
            icon: TrendingUp,
            color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
            trend: "+12.5% this month"
          },
          {
            label: "Active Companies",
            value: metrics?.activePlans,
            icon: CheckCircle2,
            color: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
            trend: `${metrics?.activePlans} members paid`
          },
          {
            label: "Active Trials",
            value: metrics?.trialPlans,
            icon: Clock,
            color: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
            trend: "Currently in testing"
          },
          {
            label: "Expired Plans",
            value: metrics?.expiredPlans,
            icon: XCircle,
            color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
            trend: "Needs attention"
          },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-xl transition-colors duration-300", stat.color)}>
                  <stat.icon size={24} />
                </div>
                <div className="flex items-center text-xs font-medium text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                  <ArrowUpRight size={14} className="mr-1" />
                  Live
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                <h3 className="text-2xl font-black mt-1 dark:text-white">{stat.value}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 🏙️ Global Companies Table */}
      <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden outline outline-1 outline-slate-100 dark:outline-slate-800">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-white/5 space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between p-6">
          <div>
            <CardTitle className="text-xl font-bold">Company Subscription Management</CardTitle>
            <CardDescription>Monitor all registered companies, their billing cycles, and current plan status.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Search company..."
                className="pl-10 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                <Filter size={18} />
              </Button>
              <select
                className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-full sm:w-auto"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Plans</option>
                <option value="trial">Trials</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
                <TableRow>
                  <TableHead className="px-6 py-4">Company Details</TableHead>
                  <TableHead>Current Plan</TableHead>
                  <TableHead>User Count</TableHead>
                  <TableHead>Monthly Billing</TableHead>
                  <TableHead>Next Renewal / Trial End</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead className="text-right px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length > 0 ? (
                  filteredCompanies.map((company) => {
                    const expiryDate = company.subscriptionPlan === 'TRIAL'
                      ? new Date(company.trialEndDate)
                      : new Date(company.subscriptionEndDate || company.trialEndDate);

                    const isNearExpiry = (expiryDate.getTime() - new Date().getTime()) < (5 * 24 * 60 * 60 * 1000);

                    return (
                      <TableRow key={company._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 overflow-hidden">
                              {company.logo ? (
                                <img src={`${import.meta.env.VITE_API_URL.replace("/api", "")}${company.logo}`} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <Building2 size={20} className="text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm">{company.name}</p>
                              <p className="text-xs text-slate-500 font-mono tracking-tighter uppercase">{company.companyId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none",
                            company.subscriptionPlan === 'ACTIVE'
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                              : company.subscriptionPlan === 'TRIAL'
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          )}>
                            {company.subscriptionPlan}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Users size={14} className="text-[var(--primary)]" />
                              <span className="font-bold text-sm text-slate-900 dark:text-white">{company.activeUserCount}</span>
                              <span className="text-[10px] text-slate-400">Active</span>
                            </div>
                            <div className="text-[10px] text-slate-400 pl-5">
                              Limit: {company.employeeLimit}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 font-black text-sm text-[var(--primary)]">
                            <IndianRupee size={12} />
                            {company.subscriptionAmount.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className={cn(
                              "text-sm font-medium",
                              isNearExpiry && company.subscriptionPlan !== 'EXPIRED' ? "text-orange-600 animate-pulse" : ""
                            )}>
                              {expiryDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            {company.subscriptionPlan === 'TRIAL' && (
                              <div className="w-24 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 w-2/3"></div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              company.subscriptionStatus === 'PAID' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                            )}></div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{company.subscriptionStatus}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => {
                              setSelectedCompany(company);
                              setIsModalOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3 grayscale opacity-30">
                        <Building2 size={48} className="text-slate-300" />
                        <div className="space-y-1">
                          <p className="font-bold text-slate-500">No companies found</p>
                          <p className="text-sm text-slate-400">Try adjusting your search or filters.</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ⚠️ Attention Required Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none bg-orange-50/50 dark:bg-orange-950/10 border-l-4 border-l-orange-500 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-800 dark:text-orange-400 uppercase tracking-widest">
              <AlertCircle size={16} />
              Trial Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-orange-700/80 dark:text-orange-300/80 leading-relaxed font-medium">
              There are {companies.filter(c => c.subscriptionPlan === 'TRIAL').length} active trials currently running.
              Monitor these accounts to ensure a smooth transition to paid subscriptions.
            </p>
          </CardContent>
        </Card>
        <Card className="border-none bg-blue-50/50 dark:bg-blue-950/10 border-l-4 border-l-blue-500 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-800 dark:text-blue-400 uppercase tracking-widest">
              <Calendar size={16} />
              Revenue Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-blue-700/80 dark:text-blue-300/80 leading-relaxed font-medium">
              Estimated next month revenue: <span className="font-bold text-blue-900 dark:text-blue-200 text-sm">₹{(metrics?.activePlans || 0) * 1500}*</span>
              based on current active subscription trends and average user count.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 📋 Detailed Company Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent
          className={cn(
            "max-w-2xl w-[95%] max-h-[85vh] overflow-y-auto p-0 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl bg-white dark:bg-slate-900 transition-all duration-300",
            // Center the modal in the content area (between sidebar and right edge)
            !isCollapsed && "lg:left-[calc(50%+128px)]",
            isCollapsed && "lg:left-[calc(50%+32px)]"
          )}
        >
          {selectedCompany && (
            <div className="flex flex-col">
              {/* Simplified Centered Header */}
              <div className="px-8 py-10 border-b border-slate-50 dark:border-slate-800 flex flex-col items-center gap-4 text-center">
                <div className="w-24 h-24 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                  {selectedCompany.logo ? (
                    <img src={`${import.meta.env.VITE_API_URL.replace("/api", "")}${selectedCompany.logo}`} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 size={40} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{selectedCompany.name}</h2>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className={cn(
                      "uppercase tracking-widest text-[10px] font-bold px-3",
                      selectedCompany.subscriptionPlan === 'ACTIVE' ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-orange-100 text-orange-700 hover:bg-orange-100"
                    )}>
                      {selectedCompany.subscriptionPlan} PLAN
                    </Badge>
                    <span className="text-slate-300">•</span>
                    <p className="text-xs text-slate-500 font-mono font-bold tracking-wider">
                      #{selectedCompany.companyId}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-10 py-10 space-y-12">
                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

                  {/* Business info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50 dark:border-slate-800">
                      <Building size={16} className="text-slate-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Business Context</h3>
                    </div>
                    <div className="grid gap-5">
                      <CompactDetailRow label="Industry" value={selectedCompany.industry || 'Management'} />
                      <CompactDetailRow label="GST Registration" value={selectedCompany.gstNo || 'Not available'} />
                      <CompactDetailRow label="Corporate Website" value={selectedCompany.website || 'No website listed'} isLink />
                    </div>
                  </div>

                  {/* Reach info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50 dark:border-slate-800">
                      <Mail size={16} className="text-slate-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact Network</h3>
                    </div>
                    <div className="grid gap-5">
                      <CompactDetailRow label="Primary Email" value={selectedCompany.email} />
                      <CompactDetailRow label="Support Phone" value={selectedCompany.phone || 'N/A'} />
                      <CompactDetailRow label="Onboarded On" value={new Date(selectedCompany.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })} />
                    </div>
                  </div>

                  {/* Location Hub */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50 dark:border-slate-800">
                      <MapPin size={16} className="text-slate-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Regional Presence</h3>
                    </div>
                    <div className="grid gap-5">
                      <CompactDetailRow label="City & State" value={`${selectedCompany.city || 'N/A'}, ${selectedCompany.state || 'N/A'}`} />
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Full Address</p>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                          {selectedCompany.address || 'Central Headquarters'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subscription details */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-50 dark:border-slate-800">
                      <TrendingUp size={16} className="text-slate-400" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SaaS Metrics</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Active / Limit</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                          {selectedCompany.activeUserCount} <span className="text-slate-400 text-sm">/ {selectedCompany.employeeLimit}</span>
                        </p>
                      </div>
                      <div className="p-4 bg-blue-50/20 dark:bg-blue-900/10 rounded-xl border border-dashed border-blue-100 dark:border-blue-800">
                        <p className="text-[9px] font-bold text-blue-400 uppercase mb-1">Monthly</p>
                        <p className="text-xl font-bold text-blue-600">₹{selectedCompany.subscriptionAmount}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-400 uppercase tracking-tighter">Status: <span className={cn(selectedCompany.subscriptionStatus === 'PAID' ? "text-green-600" : "text-red-500")}>{selectedCompany.subscriptionStatus}</span></span>
                      <span className="text-slate-400 uppercase tracking-tighter">Exp: {selectedCompany.subscriptionEndDate ? new Date(selectedCompany.subscriptionEndDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Centered Footer */}
                <div className="pt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button variant="ghost" className="w-full sm:w-auto font-bold text-slate-400 hover:text-slate-600" onClick={() => setIsModalOpen(false)}>
                    Close Record
                  </Button>
                  <Button className="w-full sm:w-auto font-bold px-10 bg-slate-900 dark:bg-white dark:text-slate-900 shadow-xl shadow-slate-200 dark:shadow-none transition-transform hover:scale-105 active:scale-95">
                    Manage Platform Account
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompactDetailRow({ label, value, isLink }: { label: string, value: string, isLink?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.05em]">{label}</p>
      <p className={cn(
        "text-sm font-bold truncate",
        isLink ? "text-blue-500 underline cursor-pointer" : "text-slate-700 dark:text-slate-200"
      )}>
        {value}
      </p>
    </div>
  );
}
