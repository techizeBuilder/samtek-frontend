import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Beaker, 
  Lightbulb, 
  Microscope, 
  FileText, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  PlusCircle,
  ArrowRight
} from 'lucide-react';

const stats = [
  { label: 'Active Projects', value: '12', icon: Beaker, color: 'text-blue-600', bg: 'bg-blue-50/50' },
  { label: 'Pending Ideas', value: '45', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50/50' },
  { label: 'Lab Tests Today', value: '8', icon: Microscope, color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
  { label: 'Research Papers', value: '24', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-50/50' },
];

const projects = [
  { name: 'Concrete Mixer Efficiency', status: 'In Progress', progress: 65, color: 'bg-blue-500' },
  { name: 'New Polymer Coating', status: 'Testing', progress: 80, color: 'bg-blue-500' },
  { name: 'Automated Flour Mill V2', status: 'Ideation', progress: 20, color: 'bg-blue-500' },
  { name: 'Solar Powered Crusher', status: 'Review', progress: 95, color: 'bg-blue-500' },
];

export default function RDDashboard() {
  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">R&D Dashboard</h1>
          <p className="text-slate-500 text-sm">Research, Innovation and Development Center</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg shadow-sm border border-slate-200">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="border-none shadow-sm hover:shadow-md transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`${stat.bg} p-2.5 rounded-lg`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Progress */}
        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
            <CardTitle className="text-base font-semibold text-slate-800">Current Research Projects</CardTitle>
            <button className="text-blue-600 text-sm font-medium hover:text-blue-700">View All</button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {projects.map((project, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-700">{project.name}</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-medium uppercase text-slate-500">{project.status}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${project.color} rounded-full transition-all duration-1000`} 
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <span className="text-[10px] font-medium text-slate-400">{project.progress}% Complete</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Recent Activity */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <button className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-sm font-medium flex items-center justify-between group transition-colors">
                <span className="flex items-center gap-3">
                  <PlusCircle className="h-4 w-4 text-blue-500" /> New Idea Submission
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
              <button className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-sm font-medium flex items-center justify-between group transition-colors">
                <span className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-blue-500" /> Lab Report Entry
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
              <button className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-sm font-medium flex items-center justify-between group transition-colors">
                <span className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-blue-500" /> Request Equipment
                </span>
                <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
              </button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-800">Recent Milestone</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100/50">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-semibold text-sm text-emerald-900">Mixer V4 Passed Stress Test</span>
                </div>
                <p className="text-[10px] text-emerald-700/70 ml-6">2 hours ago by R&D Team</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
