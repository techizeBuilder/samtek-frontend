import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, Calculator, Briefcase, Calendar, Shield } from 'lucide-react';

const stats = [
  { label: 'Total Employees', value: '124', icon: Users, color: 'text-blue-600' },
  { label: 'Present Today', value: '112', icon: Clock, color: 'text-green-600' },
  { label: 'Pending Payroll', value: '2', icon: Calculator, color: 'text-purple-600' },
  { label: 'Open Jobs', value: '5', icon: Briefcase, color: 'text-orange-600' },
];

export default function HRMSDashboard() {
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
            <CardTitle>Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500 text-center py-8">
              Attendance chart or list would go here.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500 text-center py-8">
              Holiday list would go here.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
