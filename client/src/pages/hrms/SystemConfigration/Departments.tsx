/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical, Search } from "lucide-react";
import DepartmentModal from "./DepartmentModal";
import Loader from "../Loader";
import { toast } from "../../Alert/Toast";
import { usePermissions } from "@/hooks/usePermissions";
const API_BASE = import.meta.env.VITE_API_URL;

export interface Department {
  _id: string;
  name: string;
  companyId: { _id: string; name: string; unitName?: string };
  branchId?: { _id: string; name: string } | null;
  headEmployeeId?: { _id: string; name: string; fullName?: string };
  status: "Active" | "Inactive";
  createdAt: string;
}

export default function DepartmentPage() {
  const token = localStorage.getItem("token");
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess("hrms", "departments", "add");
  const canEdit = hasFeatureAccess("hrms", "departments", "edit");
  const canDelete = hasFeatureAccess("hrms", "departments", "delete");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"add" | "view" | "edit">("add");
  const [selected, setSelected] = useState<Department | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  // Search + pagination — backend now supports search/page/limit (opt-in
  // via `page`, see departmentController.js getDepartments).
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current: 1, total: 1, count: 0 });
  const limit = 15;

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/departments`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit, search: search || undefined },
      });
      setDepartments(res.data?.data || []);
      setPagination(res.data?.pagination || { current: 1, total: 1, count: 0 });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const deleteDepartment = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    await axios.delete(`${API_BASE}/departments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    toast({
      type: "success",
      title: "Department Deleted",
      message: "The department has been deleted successfully.",
    });
    fetchDepartments();
  };
  if (loading && initialLoad) {
    return (
      <div className="relative min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Departments</h1>
          <p className="text-sm text-gray-500">
            System Configuration / Department
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {canAdd && (
            <button
              onClick={() => {
                setMode("add");
                setSelected(null);
                setOpenModal(true);
              }}
              className="bg-[#49A7F5] text-white px-4 py-2 rounded-md font-medium hover:bg-[#3D96E1] shadow-sm transition-all active:scale-95"
            >
              + Add Department
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded shadow">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Unit</th>
              <th className="px-4 py-3">Head</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {departments.map((d, i) => (
              <tr key={d._id} className="border-t">
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3">{d.companyId?.name || "-"}</td>
                <td className="px-4 py-3">{(d.companyId as any)?.unitName || d.branchId?.name || "-"}</td>
                <td className="px-4 py-3">{d.headEmployeeId?.fullName || d.headEmployeeId?.name || "-"}</td>
                <td className="px-4 py-3">
                  {" "}
                  <span
                    className={`px-2 py-1 rounded text-xs ${d.status === "Active"
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                      }`}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 relative">
                  <span
                    className="cursor-pointer"
                    onClick={() => setMenu(menu === d._id ? null : d._id)}
                  >
                    <MoreVertical size={18} />
                  </span>

                  {menu === d._id && (
                    <div className="absolute right-6 mt-2 w-36 bg-white border rounded-md shadow z-50">
                      <button
                        className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                        onClick={() => {
                          setMode("view");
                          setSelected(d);
                          setOpenModal(true);
                          setMenu(null);
                        }}
                      >
                        View
                      </button>
                      {canEdit && (
                        <button
                          className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                          onClick={() => {
                            setMode("edit");
                            setSelected(d);
                            setOpenModal(true);
                            setMenu(null);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="block w-full px-4 py-2 text-left text-red-500 hover:bg-red-50"
                          onClick={() => deleteDepartment(d._id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {pagination.total > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Page {pagination.current} of {pagination.total} ({pagination.count} departments)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pagination.current <= 1}
              className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.total, p + 1))}
              disabled={pagination.current >= pagination.total}
              className="px-3 py-1.5 border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <DepartmentModal
        isOpen={openModal}
        mode={mode}
        department={selected}
        onClose={() => {
          setOpenModal(false);
          fetchDepartments();
        }}
      />
    </div>
  );
}
