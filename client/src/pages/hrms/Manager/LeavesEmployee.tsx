/** @format */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { 
  MoreVertical, 
  Eye, 
  Calendar, 
  User, 
  Briefcase, 
  FileText,
  Clock,
  ArrowRight,
  Filter,
  Search
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE = import.meta.env.VITE_API_URL;

const LeavesEmployee = () => {
  const token = localStorage.getItem("token");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: todayRes, isLoading } = useQuery({
    queryKey: ["manager-today-leaves", debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await axios.get(`${API_BASE}/leaves/manager/today?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
  });
  const leaves = todayRes || [];

  const { data: allRequests = [] } = useQuery({
    queryKey: ["manager-all-leaves"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/leaves/manager`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
  });

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const pendingRequestsCount = allRequests.filter((req: any) => req.status === "PENDING").length;
  const upcomingLeavesCount = allRequests.filter((req: any) => {
    return req.status === "APPROVED" && new Date(req.fromDate) > todayDate;
  }).length;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Search is now applied server-side (see the /leaves/manager/today call above).
  const filteredLeaves = leaves;

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Team Leaves</h1>
          <p className="text-slate-500 font-medium">Overview of team members on leave today</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl border-slate-200 bg-white hover:bg-slate-50">
            View All History
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 transition-all">
            Manage Approvals
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryCard 
          title="On Leave Today" 
          value={leaves.length} 
          icon={User} 
          color="indigo" 
        />
        <SummaryCard 
          title="Upcoming Leaves" 
          value={upcomingLeavesCount} 
          icon={Calendar} 
          color="amber" 
        />
        <SummaryCard 
          title="Pending Requests" 
          value={pendingRequestsCount} 
          icon={Clock} 
          color="rose" 
        />
      </div>

      <Card className="border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Today's Attendance Status</CardTitle>
            <CardDescription>Real-time view of absences</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search employee..." 
                className="pl-9 w-[200px] h-9 rounded-xl border-slate-200 focus-visible:ring-indigo-500" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-slate-200">
              <Filter className="h-4 w-4 text-slate-600" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-6">Employee</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                      <p className="text-slate-500 font-bold tracking-tight">Fetching team data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <div className="flex flex-col items-center gap-4 opacity-40">
                      <div className="p-6 bg-slate-100 rounded-full">
                        <Calendar className="h-12 w-12 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-slate-900 tracking-tight">Everyone is here!</p>
                        <p className="text-sm font-medium text-slate-500">No team members are on leave today.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeaves.map((leave: any) => (
                  <TableRow key={leave._id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold group-hover:bg-indigo-100 transition-colors">
                          {leave.employee?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{leave.employee?.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{leave.employee?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-lg px-2 py-0.5 border-0 bg-slate-100 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                        {leave.employee?.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{leave.totalDays} Days</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 rounded-lg px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider">
                        {leave.leaveType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      <span className="text-slate-600 font-medium text-sm">{leave.reason}</span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100">
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLeave(leave);
                              setIsModalOpen(true);
                            }}
                            className="cursor-pointer gap-2 font-medium"
                          >
                            <Eye className="h-4 w-4 text-indigo-600" />
                            View Full Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-0 shadow-2xl p-0 overflow-hidden">
          <div className="h-32 bg-indigo-600 p-8 relative">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                <FileText size={100} />
             </div>
             <DialogTitle className="text-2xl font-black text-white tracking-tight">
               Leave Details
             </DialogTitle>
             <p className="text-indigo-100 text-sm font-medium">Request overview and specifics</p>
          </div>
          
          {selectedLeave && (
            <div className="p-8 space-y-8">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 mt-[-60px] relative z-10 shadow-sm">
                <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 text-2xl font-black">
                  {selectedLeave.employee?.name?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-900 tracking-tight">{selectedLeave.employee?.name}</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {selectedLeave.employee?.role}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Leave Type</p>
                  <p className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {selectedLeave.leaveType}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                  <p className="font-bold text-slate-800">{selectedLeave.totalDays} Days</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">From Date</p>
                  <p className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-indigo-500" />
                    {formatDate(selectedLeave.fromDate)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">To Date</p>
                  <p className="font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-indigo-500" />
                    {formatDate(selectedLeave.toDate)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reason for absence</p>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 italic text-slate-600 text-sm font-medium leading-relaxed">
                  "{selectedLeave.reason}"
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-900 text-white hover:bg-slate-800 h-12 rounded-2xl font-bold transition-all">
                  Close Window
                </Button>
                <Button variant="outline" className="h-12 w-12 rounded-2xl border-slate-200">
                   <ArrowRight className="h-5 w-5 text-slate-600" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function SummaryCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <Card className="border-0 shadow-sm rounded-3xl bg-white p-6 group hover:shadow-md transition-all">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter">{value}</h3>
        </div>
        <div className={`p-4 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform shadow-sm`}>
          <Icon size={24} />
        </div>
      </div>
    </Card>
  );
}

export default LeavesEmployee;
