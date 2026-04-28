/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical } from "lucide-react";
import DesignationModal from "./DesignationModal";
import DeleteDesignationModal from "./DeleteDesignationModal";
import Loader from "../Loader";
import { toast } from "../../Alert/Toast";
const API_BASE = import.meta.env.VITE_API_URL;

export default function Designation() {
  const token = localStorage.getItem("token");

  const [data, setData] = useState<any[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"add" | "view" | "edit">("add");
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // ✅ DELETE MODAL STATES
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const fetchData = async () => {
    const res = await axios.get(`${API_BASE}/designations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          <h1 className="text-2xl font-semibold">Designation</h1>
          <p className="text-sm text-gray-500">
            System Configuration / Designation
          </p>
        </div>
        <button
          onClick={() => {
            setMode("add");
            setSelected(null);
            setOpenModal(true);
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded"
        >
          + Add Designation
        </button>
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
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
