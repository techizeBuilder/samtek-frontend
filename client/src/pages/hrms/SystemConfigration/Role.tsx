/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical } from "lucide-react";
import RoleModal from "./RoleModal";
import Loader from "../../Loader";
import { toast } from "../../Alert/Toast";

const API_BASE = import.meta.env.VITE_API_URL;

export interface Role {
  _id: string;
  name: string;
  description?: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

export default function Role() {
  const token = localStorage.getItem("token");

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"add" | "view" | "edit">("add");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  /* ================= FETCH ROLES ================= */
  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API_BASE}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRoles(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  /* ================= DELETE ================= */
  const deleteRole = async (id: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    await axios.delete(`${API_BASE}/roles/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    toast({
      type: "success",
      title: "Role Deleted",
      message: "Role deleted successfully.",
    });

    fetchRoles();
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
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Roles</h1>
          <p className="text-sm text-gray-500">
            System Configuration / Roles
          </p>
        </div>

        <button
          onClick={() => {
            setMode("add");
            setSelectedRole(null);
            setOpenModal(true);
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600"
        >
          + Add Role
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Role Name</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created On</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {roles.map((role, i) => (
              <tr key={role._id} className="border-t">
                <td className="px-4 py-3">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{role.name}</td>
                <td className="px-4 py-3">
                  {role.description || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      role.status === "Active"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {role.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {new Date(role.createdAt).toLocaleDateString()}
                </td>

                {/* ACTION */}
                <td className="px-4 py-3 relative">
                  <span
                    className="cursor-pointer"
                    onClick={() =>
                      setOpenMenu(openMenu === role._id ? null : role._id)
                    }
                  >
                    <MoreVertical size={18} />
                  </span>

                  {openMenu === role._id && (
                    <div className="absolute right-6 mt-2 w-36 bg-white border rounded-md shadow z-50">
                      <button
                        className="w-full px-4 py-2 text-left hover:bg-gray-100"
                        onClick={() => {
                          setMode("view");
                          setSelectedRole(role);
                          setOpenModal(true);
                          setOpenMenu(null);
                        }}
                      >
                        View
                      </button>

                      <button
                        className="w-full px-4 py-2 text-left hover:bg-gray-100"
                        onClick={() => {
                          setMode("edit");
                          setSelectedRole(role);
                          setOpenModal(true);
                          setOpenMenu(null);
                        }}
                      >
                        Edit
                      </button>

                      <button
                        className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-50"
                        onClick={() => deleteRole(role._id)}
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

      <RoleModal
        isOpen={openModal}
        mode={mode}
        role={selectedRole}
        onClose={() => {
          setOpenModal(false);
          fetchRoles();
        }}
      />
    </div>
  );
}
