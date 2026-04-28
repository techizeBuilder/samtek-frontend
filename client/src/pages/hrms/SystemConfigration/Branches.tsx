/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical } from "lucide-react";
import BranchModal from "./BranchModal";
import DeleteBranchModal from "./DeleteBranchModal";
import Loader from "../Loader";
import { toast } from "../../Alert/Toast";

const API_BASE = import.meta.env.VITE_API_URL;

export interface Company {
  _id: string;
  name: string;
}

export interface Branch {
  _id: string;
  companyId: string | { _id: string; name: string };
  companyName?: string;
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  address: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

export default function Branch() {
  const token = localStorage.getItem("token");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"add" | "view" | "edit">("add");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // ✅ DELETE MODAL STATES
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  /* ================= FETCH COMPANIES ================= */
  const fetchCompanies = async () => {
    const res = await axios.get(`${API_BASE}/companies`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setCompanies(res.data?.companies || []);
  };

  /* ================= FETCH BRANCHES ================= */
  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${API_BASE}/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBranches(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchBranches();
  }, []);

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;

    try {
      await axios.delete(`${API_BASE}/branches/${branchToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Branch Deleted",
        message: `${branchToDelete.name} successfully removed.`,
      });

      setOpenDeleteModal(false);
      setBranchToDelete(null);
      fetchBranches();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Delete Failed",
        message: error?.response?.data?.message || "Something went wrong.",
      });
    }
  };

  const getCompanyName = (companyId: any) => {
    if (typeof companyId === "object" && companyId?.name) return companyId.name;
    const id = typeof companyId === "string" ? companyId : companyId?._id;
    const company = companies.find((c) => c._id === id);
    return company ? company.name : "-";
  };
  const sortedBranches = [...branches].sort((a, b) => {
    const nameA = getCompanyName(a.companyId).toLowerCase();
    const nameB = getCompanyName(b.companyId).toLowerCase();
    if (sortOrder === "asc") {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

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
          <h1 className="text-2xl font-semibold">Branches</h1>
          <p className="text-sm text-gray-500">System Configuration / Branch</p>
        </div>

        <button
          onClick={() => {
            setMode("add");
            setSelectedBranch(null);
            setOpenModal(true);
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600"
        >
          + Add Branch
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
        <table className="w-full text-sm text-center min-w-[1000px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3">No.</th>
              <th
                className="px-4 py-3 cursor-pointer select-none"
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
              >
                Company Name
                <span className="ml-1 inline-block">
                  {sortOrder === "asc" ? "▲" : "▼"}
                </span>
              </th>
              <th className="px-4 py-3">Branch Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created On</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="text-center py-6">
                  Loading...
                </td>
              </tr>
            )}

            {!loading &&
              sortedBranches.map((branch, i) => (
                <tr key={branch._id} className="border-t">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    {getCompanyName(branch.companyId)}
                  </td>
                  <td className="px-4 py-3">{branch.name}</td>
                  <td className="px-4 py-3">{branch.code}</td>
                  <td className="px-4 py-3">{branch.city}</td>
                  <td className="px-4 py-3">{branch.state}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${branch.status === "Active"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                        }`}
                    >
                      {branch.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(branch.createdAt).toLocaleDateString()}
                  </td>

                  {/* ACTION */}
                  <td className="px-4 py-3 text-center relative">
                    <span
                      className="cursor-pointer"
                      onClick={() =>
                        setOpenMenu(openMenu === branch._id ? null : branch._id)
                      }
                    >
                      <MoreVertical size={18} />
                    </span>

                    {openMenu === branch._id && (
                      <div className="absolute right-6 mt-2 w-36 bg-white border rounded-md shadow z-50">
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-gray-100"
                          onClick={() => {
                            setMode("view");
                            setSelectedBranch(branch);
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
                            setSelectedBranch(branch);
                            setOpenModal(true);
                            setOpenMenu(null);
                          }}
                        >
                          Edit
                        </button>

                        <button
                          className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-50"
                          onClick={() => {
                            setBranchToDelete(branch);
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

      <BranchModal
        isOpen={openModal}
        mode={mode}
        branch={selectedBranch}
        onClose={() => {
          setOpenModal(false);
          fetchBranches();
        }}
      />

      <DeleteBranchModal
        isOpen={openDeleteModal}
        onClose={() => {
          setOpenDeleteModal(false);
          setBranchToDelete(null);
        }}
        onConfirm={handleDeleteBranch}
        branchName={branchToDelete?.name}
      />
    </div>
  );
}
