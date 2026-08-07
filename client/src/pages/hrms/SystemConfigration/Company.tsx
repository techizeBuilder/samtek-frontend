/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical, Search } from "lucide-react";
import CompanyModal from "./CompanyModal";
import DeleteCompanyModal from "./DeleteCompanyModel";
import Loader from "../Loader";
import { toast } from "../../Alert/Toast";

const API_BASE = import.meta.env.VITE_API_URL;

export interface Company {
  _id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  address: string;
  city: string;
  state: string;
  logo?: string;
  status: "Active" | "Inactive";
  createdAt: string;
}

export default function Company() {
  const token = localStorage.getItem("token");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<"add" | "view" | "edit">("add");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // ✅ DELETE MODAL STATES
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Search + pagination — backend already supports search/page/limit
  // (getCompanies in companyController.js), just wasn't being sent.
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current: 1, total: 1, count: 0 });
  const [initialLoad, setInitialLoad] = useState(true);
  const limit = 15;

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit, search: search || undefined },
      });
      setCompanies(res.data?.companies || []);
      setPagination(res.data?.pagination || { current: 1, total: 1, count: 0 });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  // ✅ ACTUAL DELETE API
  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;

    try {
      await axios.delete(`${API_BASE}/companies/${companyToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Company Deleted",
        message: `${companyToDelete.name} successfully removed`,
      });

      setOpenDeleteModal(false);
      setCompanyToDelete(null);
      fetchCompanies();
    } catch (error) {
      toast({
        type: "error",
        title: "Delete Failed",
        message: "Company deleted Sucessfully",
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
  const sortedCompanies = [...companies].sort((a, b) => {
    if (sortOrder === "asc") {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });


  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="text-sm text-gray-500">
            System Configuration / Company
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, city, state..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* <button
          onClick={() => {
            setMode("add");
            setSelectedCompany(null);
            setOpenModal(true);
          }}
          className="bg-[#49A7F5] text-white px-4 py-2 rounded-md font-medium hover:bg-[#3D96E1] shadow-sm transition-all active:scale-95"
        >
          + Add Company
        </button> */}
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow h-[70vh] overflow-auto relative">

        <table className="w-full text-sm text-center">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3 min-w-[130px] whitespace-nowrap text-center">
                Company ID
              </th>   {/* NEW */}
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

              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">City</th>         {/* NEW */}
              <th className="px-4 py-3">State</th>        {/* NEW */}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created On</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>


          <tbody>
            {!loading &&
              sortedCompanies.map((company, i) => (
                <tr key={company._id} className="border-t">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-xs">
                    {company.companyId}
                  </td>
                  <td className="px-4 py-3 font-medium min-w-[220px] whitespace-nowrap">
                    {company.name}
                  </td>
                  <td className="px-4 py-3">{company.email}</td>
                  <td className="px-4 py-3">{company.phone}</td>
                  <td className="px-4 py-3">{company.industry}</td>
                  <td className="px-4 py-3">{company.city}</td>
                  <td className="px-4 py-3">{company.state}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${company.status === "Active"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                        }`}
                    >
                      {company.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </td>

                  {/* ACTION */}
                  <td className="px-4 py-3 text-center relative">
                    <span
                      className="cursor-pointer"
                      onClick={() =>
                        setOpenMenu(
                          openMenu === company._id ? null : company._id
                        )
                      }
                    >
                      <MoreVertical size={18} />
                    </span>

                    {openMenu === company._id && (
                      <div className="absolute right-6 mt-2 w-36 bg-white border rounded-md shadow z-50">
                        <button
                          className="w-full px-4 py-2 text-left hover:bg-gray-100"
                          onClick={() => {
                            setMode("view");
                            setSelectedCompany(company);
                            setOpenModal(true);
                            setOpenMenu(null);
                          }}
                        >
                          View
                        </button>

                        {/* <button
                          className="w-full px-4 py-2 text-left hover:bg-gray-100"
                          onClick={() => {
                            setMode("edit");
                            setSelectedCompany(company);
                            setOpenModal(true);
                            setOpenMenu(null);
                          }}
                        >
                          Edit
                        </button> */}

                        <button
                          className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-50"
                          onClick={() => {
                            setCompanyToDelete(company);
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

      {/* PAGINATION */}
      {pagination.total > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>
            Page {pagination.current} of {pagination.total} ({pagination.count} companies)
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

      {/* ADD / VIEW / EDIT MODAL */}
      <CompanyModal
        isOpen={openModal}
        mode={mode}
        company={selectedCompany}
        onClose={() => {
          setOpenModal(false);
          fetchCompanies();
        }}
      />

      {/* DELETE CONFIRM MODAL */}
      <DeleteCompanyModal
        isOpen={openDeleteModal}
        onClose={() => {
          setOpenDeleteModal(false);
          setCompanyToDelete(null);
        }}
        onConfirm={handleDeleteCompany}
        companyName={companyToDelete?.name}
      />
    </div>
  );
}