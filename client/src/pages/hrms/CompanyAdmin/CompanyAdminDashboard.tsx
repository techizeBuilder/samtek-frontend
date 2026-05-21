/** @format */

import { useAuth } from "@/hooks/useAuth";
import { Building2, Users, Briefcase, MapPin, ShieldCheck, UserCog } from "lucide-react";
import { Link } from "react-router-dom";

export default function CompanyAdminDashboard() {
  const { user } = useAuth() as any;

  const stats = [
    { 
      label: "My Company", 
      value: user?.companyName || "Organization", 
      icon: Building2, 
      color: "bg-blue-50 text-blue-600",
      link: "/hrms/CompanyAdmin/companies"
    },
    { 
      label: "Operating Units", 
      value: user?.unit || "Main Branch", 
      icon: MapPin, 
      color: "bg-emerald-50 text-emerald-600",
      link: "/hrms/CompanyAdmin/branches"
    },
    { 
      label: "Departments", 
      value: "Manage", 
      icon: Users, 
      color: "bg-purple-50 text-purple-600",
      link: "/hrms/CompanyAdmin/departments"
    },
    { 
      label: "Designations", 
      value: "Manage", 
      icon: Briefcase, 
      color: "bg-amber-50 text-amber-600",
      link: "/hrms/CompanyAdmin/designations"
    },
  ];

  const quickActions = [
    {
      title: "Roles & Permissions",
      description: "Manage system access and assign roles to users",
      icon: ShieldCheck,
      link: "/hrms/CompanyAdmin/user-management",
      color: "text-blue-600 bg-blue-50"
    },
    {
      title: "Organization Structure",
      description: "Configure departments, units and overall hierarchy",
      icon: Building2,
      link: "/hrms/CompanyAdmin/departments",
      color: "text-emerald-600 bg-emerald-50"
    },
    {
      title: "Job Roles",
      description: "Create and manage designations across the company",
      icon: Briefcase,
      link: "/hrms/CompanyAdmin/designations",
      color: "text-amber-600 bg-amber-50"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.fullName || user?.name || "Admin"}
          </h1>
          <p className="text-gray-500 mt-1">
            Company Administrator Dashboard • {user?.companyName || "Samtek"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Link
            key={i}
            to={stat.link}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4"
          >
            <div className={`p-3 rounded-lg ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <h3 className="text-xl font-semibold text-gray-900 mt-1 truncate max-w-[150px]">{stat.value}</h3>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <Link
                key={i}
                to={action.link}
                className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className={`p-3 rounded-lg ${action.color}`}>
                  <action.icon size={22} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{action.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{action.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <UserCog size={20} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Account Details</h2>
          </div>
          
          <div className="space-y-4">
            <div className="py-3 border-b border-gray-100">
              <p className="text-sm text-gray-500 font-medium">Tenant</p>
              <p className="font-semibold text-gray-900 mt-1">{user?.companyName || "Samtek HRMS"}</p>
            </div>
            <div className="py-3 border-b border-gray-100">
              <p className="text-sm text-gray-500 font-medium">Administrator</p>
              <p className="font-semibold text-gray-900 mt-1">{user?.fullName || user?.name}</p>
            </div>
            <div className="py-3 border-b border-gray-100">
              <p className="text-sm text-gray-500 font-medium">Email</p>
              <p className="font-semibold text-gray-900 mt-1">{user?.email}</p>
            </div>
            <div className="py-3">
              <p className="text-sm text-gray-500 font-medium">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-gray-900">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
