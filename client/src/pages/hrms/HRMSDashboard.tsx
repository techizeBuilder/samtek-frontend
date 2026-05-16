import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, Calculator, Briefcase, Calendar, Shield } from 'lucide-react';
import axios from 'axios';
import config from '@/config/environment';
import { format } from 'date-fns';

const API_BASE = config.apiURL || "http://localhost:5000/api";

export default function HRMSDashboard() {
  const [data, setData] = useState({
    totalEmployees: 0,
    presentToday: 0,
    pendingPayroll: 0,
    openJobs: 0,
    recentAttendance: [],
    upcomingHolidays: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_BASE}/hrms-dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch HRMS dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  const stats = [
    { label: 'Total Employees', value: data.totalEmployees, icon: Users, color: 'text-blue-600' },
    { label: 'Present Today', value: data.presentToday, icon: Clock, color: 'text-green-600' },
    { label: 'Pending Payroll', value: data.pendingPayroll, icon: Calculator, color: 'text-purple-600' },
    { label: 'Open Jobs', value: data.openJobs, icon: Briefcase, color: 'text-orange-600' },
  ];

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">HRMS Dashboard</h1>
        <div className="text-sm text-slate-500">Welcome back, HR Admin</div>
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
            <CardTitle>Recent Attendance (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentAttendance.length > 0 ? (
              <div className="space-y-4">
                {data.recentAttendance.map((record: any) => (
                  <div key={record._id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-4">
                      {record.user?.profilePicture ? (
                        <img 
                          src={record.user.profilePicture.startsWith('http') ? record.user.profilePicture : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${record.user.profilePicture}`}
                          alt={record.user?.fullName} 
                          className="w-10 h-10 rounded-full object-cover" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {record.user?.fullName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{record.user?.fullName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{record.user?.employeeId || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 text-center py-8">
                No attendance records for today.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingHolidays.length > 0 ? (
              <div className="space-y-4">
                {data.upcomingHolidays.map((holiday: any) => (
                  <div key={holiday._id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-100 flex flex-col items-center justify-center text-orange-600">
                        <span className="text-xs font-bold uppercase">{format(new Date(holiday.date), 'MMM')}</span>
                        <span className="text-lg font-bold leading-none">{format(new Date(holiday.date), 'dd')}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{holiday.title}</p>
                        <p className="text-xs text-slate-500">{holiday.day}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500 text-center py-8">
                No upcoming holidays found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
