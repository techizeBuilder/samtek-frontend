/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical, Search } from "lucide-react";
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
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");

  // ✅ DELETE MODAL STATES
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  // Search + pagination — backend already supports search/page/limit
  // (getCompanies in companyController.js), just wasn't being sent.
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current: 1, total: 1, count: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const limit = 15;

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, selectedCompanyId]);

  /* ================= FETCH COMPANIES (for the filter dropdown — full list, unpaged) ================= */
  const fetchCompanies = async () => {
    const res = await axios.get(`${API_BASE}/companies`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 1000 },
    });
    setCompanies(res.data?.companies || []);
  };

  /* ================= FETCH UNITS FROM COMPANIES ================= */
  const fetchBranches = async () => {
    try {
      setLoading(true);
      const selectedCompanyName = selectedCompanyId === "all"
        ? undefined
        : companies.find((c) => c._id === selectedCompanyId)?.name;
      const res = await axios.get(`${API_BASE}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit, search: search || undefined, name: selectedCompanyName },
      });
      const companiesData = res.data?.companies || [];
      const mappedUnits = companiesData.map((comp: any) => ({
        _id: comp._id,
        companyId: comp._id,
        companyName: comp.name,
        name: comp.unitName || "Unnamed Unit",
        code: comp.locationPin || "-",
        city: comp.city || "-",
        state: comp.state || "-",
        country: "India",
        address: comp.address || "-",
        pincode: comp.locationPin || "-",
        status: comp.isActive ? "Active" : "Inactive",
        createdAt: comp.createdAt,
      }));
      setBranches(mappedUnits);
      setPagination(res.data?.pagination || { current: 1, total: 1, count: 0 });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, selectedCompanyId]);

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;

    try {
      await axios.delete(`${API_BASE}/branches/${branchToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Unit Deleted",
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

  // Company filter + search are both applied server-side now (see fetchBranches),
  // so `branches` already reflects the current page's filtered results.
  const filteredBranches = sortedBranches;

  if (loading && initialLoad) {
    return (
      <div className="relative min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Units</h1>
          <p className="text-sm text-gray-500">System Configuration / Unit</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search units..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#49A7F5]"
          >
            <option value="all">All Companies</option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>


        </div>
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
              <th className="px-4 py-3">Unit Name</th>
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
              filteredBranches.map((branch, i) => (
                <tr key={branch._id} className="border-t">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    {branch.companyName || getCompanyName(branch.companyId)}
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
            Page {pagination.current} of {pagination.total} ({pagination.count} units)
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
