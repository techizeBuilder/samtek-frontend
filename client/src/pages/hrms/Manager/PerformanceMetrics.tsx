/** @format */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { 
  TrendingUp, 
  Users, 
  Award, 
  Star, 
  MoreVertical,
  Search,
  Filter,
  Calendar
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  PieChart,
  Pie
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE = import.meta.env.VITE_API_URL;

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const years = [2024, 2025, 2026];

const PerformanceMetrics = () => {
  const token = localStorage.getItem("token");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ["manager-performance-metrics", selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/performance/team-metrics`, {
        params: { month: selectedMonth, year: selectedYear },
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
  });

  const stats = performanceData?.stats || {
    teamStrength: 0,
    avgAttendance: 0,
    goalProgress: 0,
    topPerformer: "N/A"
  };

  const distribution = performanceData?.distribution || [];
  const report = performanceData?.report || [];

  const filteredMembers = report.filter((m: any) => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prepare data for Top Performers Overview Chart
  const topPerformersChartData = report
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5)
    .map((m: any) => ({
      name: m.name.split(" ")[0],
      "Attendance %": m.attendance.percentage,
      "Goal Progress %": m.goalProgress || 1, 
      "Overall Score": m.score * 10 
    }));

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#F8FAFC] min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Team Performance Analytics</h1>
          <p className="text-slate-500 font-medium">Real-time insights into attendance, goals, and overall efficiency.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] rounded-xl border-slate-200 bg-white">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[120px] rounded-xl border-slate-200 bg-white">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {months.map((m, i) => <SelectItem key={m} value={i.toString()}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Team Strength" 
          value={`${stats.teamStrength}`} 
          subtitle="Active Members"
          icon={Users} 
          color="blue" 
        />
        <MetricCard 
          title="Avg. Attendance" 
          value={`${stats.avgAttendance}%`} 
          subtitle="Overall Presence"
          icon={Calendar} 
          color="emerald" 
        />
        <MetricCard 
          title="Goal Progress" 
          value={`${stats.goalProgress}%`} 
          subtitle="Avg Completion"
          icon={TrendingUp} 
          color="purple" 
        />
        <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 shadow-lg transition-all hover:shadow-indigo-200/50">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <Award size={20} />
            </div>
            <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">Top Performer</p>
          </div>
          <div className="space-y-1 relative z-10">
            <h3 className="text-2xl font-black text-white tracking-tight">{stats.topPerformer}</h3>
            <p className="text-xs font-medium text-white/70 italic">Highest Overall Score</p>
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-125 transition-transform">
             <Award size={120} className="text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Performers Overview Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Top Performers Overview</CardTitle>
            <CardDescription>Comparing Score, Attendance, and Goals for top 5 employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPerformersChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="Attendance %" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="Goal Progress %" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar dataKey="Overall Score" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
               <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-600">Attendance %</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold text-slate-600">Goal Progress %</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-violet-500" />
                  <span className="text-xs font-bold text-slate-600">Overall Score</span>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Distribution Chart */}
        <Card className="lg:col-span-1 border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Performance Distribution</CardTitle>
            <CardDescription>Breakdown of employee ratings</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-8">
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-3xl font-black text-slate-900">{stats.teamStrength}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Members</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full mt-8">
               {distribution.map((item: any) => (
                 <div key={item.name} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-bold text-slate-600">{item.name} ({item.value})</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report Table */}
      <Card className="border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl font-black text-slate-900">Detailed Performance Report</CardTitle>
            <CardDescription>{months[Number(selectedMonth)]} {selectedYear}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search team..." 
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
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 font-bold text-slate-600">Employee</TableHead>
                <TableHead className="font-bold text-slate-600">Attendance</TableHead>
                <TableHead className="font-bold text-slate-600">Leaves</TableHead>
                <TableHead className="font-bold text-slate-600">Goal Progress</TableHead>
                <TableHead className="font-bold text-slate-600">Score</TableHead>
                <TableHead className="font-bold text-slate-600">Rating</TableHead>
                <TableHead className="text-right pr-6 font-bold text-slate-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                      <p className="text-slate-500 font-bold">Analyzing team data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 text-slate-500 italic">
                    No records found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member: any) => (
                  <TableRow key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold group-hover:bg-indigo-100 transition-colors">
                          {member.profilePicture ? (
                            <img src={member.profilePicture} alt="" className="h-full w-full object-cover rounded-2xl" />
                          ) : (
                            member.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{member.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{member.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-black text-rose-500">
                          <span>{member.attendance.percentage}%</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{member.attendance.days}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-slate-700 text-sm">
                      {member.leaves}
                    </TableCell>
                    <TableCell className="w-[150px]">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold text-slate-400">
                          <span>0/0 Goals</span>
                          <span className="text-indigo-600">{member.goalProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${member.goalProgress}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-black text-rose-600 text-lg">
                      {member.score}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`rounded-lg px-2 py-1 border-0 font-bold text-[10px] tracking-tight ${
                          member.rating.includes('A') ? 'bg-emerald-50 text-emerald-600' :
                          member.rating.includes('B') ? 'bg-blue-50 text-blue-600' :
                          member.rating.includes('C') ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {member.rating}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100">
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-slate-200">
                          <DropdownMenuItem className="cursor-pointer gap-2 font-medium">
                            <Star className="h-4 w-4 text-amber-500" /> Add Evaluation
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
    </div>
  );
};

function MetricCard({ title, value, subtitle, icon: Icon, color }: any) {
  const colors: any = {
    blue: "text-blue-500",
    emerald: "text-emerald-500",
    purple: "text-purple-500",
  };
  return (
    <Card className="border-0 shadow-sm rounded-3xl bg-white p-6 group hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className={`p-4 rounded-2xl bg-slate-50 group-hover:scale-110 transition-transform`}>
          <Icon size={24} className={colors[color]} />
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h3>
          <p className="text-[10px] font-bold text-slate-400">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
}

export default PerformanceMetrics;
