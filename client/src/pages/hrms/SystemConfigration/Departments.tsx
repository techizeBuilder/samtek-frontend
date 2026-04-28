/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical } from "lucide-react";
import DepartmentModal from "./DepartmentModal";
import Loader from "../Loader";
import { toast } from "../../Alert/Toast";
const API_BASE = import.meta.env.VITE_API_URL;

export interface Department {
  _id: string;
  name: string;
  companyId: { _id: string; name: string };
  branchId: { _id: string; name: string };
  headEmployeeId?: { _id: string; name: string };
  status: "Active" | "Inactive";
  createdAt: string;
}

export default function DepartmentPage() {
  const token = localStorage.getItem("token");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"add" | "view" | "edit">("add");
  const [selected, setSelected] = useState<Department | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchDepartments = async () => {
    const res = await axios.get(`${API_BASE}/departments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setDepartments(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const deleteDepartment = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    await axios.delete(`${API_BASE}/departments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    toast({
      type: "success",
      title: "Department Deleted",
      message: "The branch has been deleted successfully.",
    });
    fetchDepartments();
  };
  if (loading) {
    return (
      <div className="relative min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Departments</h1>
          <p className="text-sm text-gray-500">
            System Configuration / Department
          </p>
        </div>

        <button
          onClick={() => {
            setMode("add");
            setSelected(null);
            setOpenModal(true);
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded-md"
        >
          + Add Department
        </button>
      </div>

      <div className="bg-white rounded shadow">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3">No</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Branch</th>
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
                <td className="px-4 py-3">{d.branchId?.name || "-"}</td>
                <td className="px-4 py-3">{d.headEmployeeId?.name || "-"}</td>
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
                      <button
                        className="block w-full px-4 py-2 text-left text-red-500 hover:bg-red-50"
                        onClick={() => deleteDepartment(d._id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
