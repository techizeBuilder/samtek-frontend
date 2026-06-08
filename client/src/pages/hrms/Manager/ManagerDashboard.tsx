import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, CalendarCheck, BarChart, CheckSquare, Briefcase } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

export default function ManagerDashboard() {
  const { user } = useAuth() as any;
  const token = localStorage.getItem("token");

  const { data: statsData, isLoading } = useQuery({
    queryKey: ["manager-dashboard-stats"],
    queryFn: async () => {
      const res = await axios.get(`${API_BASE}/hrms-dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.data;
    },
  });

  const stats = [
    { label: 'Team Members', value: isLoading ? '...' : String(statsData?.totalEmployees ?? 0), icon: Users, color: 'text-blue-600' },
    { label: 'Present Today', value: isLoading ? '...' : String(statsData?.presentToday ?? 0), icon: Clock, color: 'text-green-600' },
    { label: 'Pending Approvals', value: isLoading ? '...' : String(statsData?.pendingApprovals ?? 0), icon: CheckSquare, color: 'text-orange-600' },
    { label: 'Open Positions', value: isLoading ? '...' : String(statsData?.openJobs ?? 0), icon: Briefcase, color: 'text-purple-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Manager Dashboard</h1>
        <div className="text-sm text-slate-500">Welcome back, {user?.fullName || 'Manager'}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500 text-center py-8">
              Visual overview of your team's attendance status.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>My Team's Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500 text-center py-8">
              Recent leave requests and performance updates.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
