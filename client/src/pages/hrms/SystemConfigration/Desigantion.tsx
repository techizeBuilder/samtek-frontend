/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical, Search } from "lucide-react";
import DesignationModal from "./DesignationModal";
import DeleteDesignationModal from "./DeleteDesignationModal";
import Loader from "../Loader";
import { toast } from "../../Alert/Toast";
import { usePermissions } from "@/hooks/usePermissions";
const API_BASE = import.meta.env.VITE_API_URL;

export default function Designation() {
  const token = localStorage.getItem("token");
  const { hasFeatureAccess } = usePermissions();
  const canAdd = hasFeatureAccess("hrms", "designations", "add");
  const canEdit = hasFeatureAccess("hrms", "designations", "edit");
  const canDelete = hasFeatureAccess("hrms", "designations", "delete");

  const [data, setData] = useState<any[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"add" | "view" | "edit">("add");
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ DELETE MODAL STATES
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const [initialLoad, setInitialLoad] = useState(true);

  // Search + pagination — backend now supports search/page/limit (opt-in
  // via `page`, see designationController.js getDesignations).
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/designations`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit, search: search || undefined },
      });
      setData(res.data?.data || []);
      setPagination(res.data?.pagination || { current: 1, total: 1, count: 0 });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      await axios.delete(`${API_BASE}/designations/${itemToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Designation Deleted",
        message: `${itemToDelete.name} successfully removed.`,
      });

      setOpenDeleteModal(false);
      setItemToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Delete Failed",
        message: error?.response?.data?.message || "Something went wrong.",
      });
    }
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
          <h1 className="text-2xl font-semibold">Designation</h1>
          <p className="text-sm text-gray-500">
            System Configuration / Designation
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search designations..."
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
              + Add Designation
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded shadow">
        <table className="w-full text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Name</th>
              <th>Department</th>
              <th>Company</th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d._id} className="border-t">
                <td className="p-3">{d.name}</td>
                <td>{d.departmentId?.name}</td>
                <td>{d.companyId?.name}</td>
                <td>
                  <span
                    className={`px-2 py-1 rounded text-xs ${d.status === "Active"
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                      }`}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="text-center relative">
                  <span
                    className="cursor-pointer"
                    onClick={() =>
                      setOpenMenu(openMenu === d._id ? null : d._id)
                    }
                  >
                    <MoreVertical size={18} />
                  </span>
                  {openMenu === d._id && (
                    <div className="absolute right-6 mt-2 w-36 bg-white border rounded-md shadow z-50">
                      <button
                        className="block px-4 py-2 w-full text-left"
                        onClick={() => {
                          setMode("view");
                          setSelected(d);
                          setOpenModal(true);
                          setOpenMenu(null);
                        }}
                      >
                        View
                      </button>
                      {canEdit && (
                        <button
                          className="block px-4 py-2 w-full text-left"
                          onClick={() => {
                            setMode("edit");
                            setSelected(d);
                            setOpenModal(true);
                            setOpenMenu(null);
                          }}
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          className="block px-4 py-2 w-full text-left text-red-500"
                          onClick={() => {
                            setItemToDelete(d);
                            setOpenDeleteModal(true);
                            setOpenMenu(null);
                          }}
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
            Page {pagination.current} of {pagination.total} ({pagination.count} designations)
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

      <DesignationModal
        isOpen={openModal}
        mode={mode}
        designation={selected}
        onClose={() => {
          setOpenModal(false);
          fetchData();
        }}
      />

      <DeleteDesignationModal
        isOpen={openDeleteModal}
        onClose={() => {
          setOpenDeleteModal(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDelete}
        designationName={itemToDelete?.name}
      />
    </div>
  );
}
