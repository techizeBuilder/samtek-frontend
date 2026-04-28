/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical } from "lucide-react";
import CostCenterModal from "./CostCenterModal";
import DeleteCostCenterModal from "./DeleteCostCenterModal";
import Loader from "@/pages/hrms/Loader";
import { toast } from "../../../hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL;

export interface CostCenter {
    _id: string;
    companyId: { _id: string; name: string };
    branchId: { _id: string; name: string };
    departmentId?: { _id: string; name: string };
    name: string;
    code: string;
    description?: string;
    status: "Active" | "Inactive";
    createdAt: string;
}

export default function CostCenters() {
    const token = localStorage.getItem("token");

    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [loading, setLoading] = useState(false);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const [openModal, setOpenModal] = useState(false);
    const [mode, setMode] = useState<"add" | "view" | "edit">("add");
    const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null);

    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [costCenterToDelete, setCostCenterToDelete] = useState<CostCenter | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const fetchCostCenters = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/cost-centers`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCostCenters(res.data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCostCenters();
    }, []);

    const handleDeleteCostCenter = async () => {
        if (!costCenterToDelete) return;

        try {
            await axios.delete(`${API_BASE}/cost-centers/${costCenterToDelete._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            toast({
                
                title: "Cost Center Deleted",
                description: `${costCenterToDelete.name} successfully removed`,
            });

            setOpenDeleteModal(false);
            setCostCenterToDelete(null);
            fetchCostCenters();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Delete Failed",
                description: "Failed to delete cost center",
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

    const sortedCostCenters = [...costCenters].sort((a, b) => {
        if (sortOrder === "asc") {
            return a.name.localeCompare(b.name);
        } else {
            return b.name.localeCompare(a.name);
        }
    });

    return (
        <div className="p-6">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">Cost Centers</h1>
                    <p className="text-sm text-gray-500">
                        System Configuration / Cost Center
                    </p>
                </div>

                <button
                    onClick={() => {
                        setMode("add");
                        setSelectedCostCenter(null);
                        setOpenModal(true);
                    }}
                    className="bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600"
                >
                    + Add Cost Center
                </button>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-lg shadow h-[70vh] overflow-auto relative">
                <table className="w-full text-sm text-center">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3">No.</th>
                            <th className="px-4 py-3">Company</th>
                            <th className="px-4 py-3">Branch</th>
                            <th
                                className="px-4 py-3 cursor-pointer select-none"
                                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            >
                                Cost Center Name
                                <span className="ml-1 inline-block">
                                    {sortOrder === "asc" ? "▲" : "▼"}
                                </span>
                            </th>
                            <th className="px-4 py-3">Code</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Created On</th>
                            <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {!loading &&
                            sortedCostCenters.map((cc, i) => (
                                <tr key={cc._id} className="border-t">
                                    <td className="px-4 py-3">{i + 1}</td>
                                    <td className="px-4 py-3">{cc.companyId?.name || "-"}</td>
                                    <td className="px-4 py-3">{cc.branchId?.name || "-"}</td>
                                    <td className="px-4 py-3 font-medium">{cc.name}</td>
                                    <td className="px-4 py-3 italic">{cc.code}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`px-2 py-1 rounded text-xs ${cc.status === "Active"
                                                ? "bg-green-100 text-green-600"
                                                : "bg-red-100 text-red-600"
                                                }`}
                                        >
                                            {cc.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {new Date(cc.createdAt).toLocaleDateString()}
                                    </td>

                                    {/* ACTION */}
                                    <td className="px-4 py-3 text-center relative">
                                        <span
                                            className="cursor-pointer"
                                            onClick={() =>
                                                setOpenMenu(openMenu === cc._id ? null : cc._id)
                                            }
                                        >
                                            <MoreVertical size={18} />
                                        </span>

                                        {openMenu === cc._id && (
                                            <div className="absolute right-6 mt-2 w-36 bg-white border rounded-md shadow z-50">
                                                <button
                                                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                                                    onClick={() => {
                                                        setMode("view");
                                                        setSelectedCostCenter(cc);
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
                                                        setSelectedCostCenter(cc);
                                                        setOpenModal(true);
                                                        setOpenMenu(null);
                                                    }}
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-50"
                                                    onClick={() => {
                                                        setCostCenterToDelete(cc);
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

            {/* ADD / VIEW / EDIT MODAL */}
            <CostCenterModal
                isOpen={openModal}
                mode={mode}
                costCenter={selectedCostCenter}
                onClose={() => {
                    setOpenModal(false);
                    fetchCostCenters();
                }}
            />

            {/* DELETE CONFIRM MODAL */}
            <DeleteCostCenterModal
                isOpen={openDeleteModal}
                onClose={() => {
                    setOpenDeleteModal(false);
                    setCostCenterToDelete(null);
                }}
                onConfirm={handleDeleteCostCenter}
                costCenterName={costCenterToDelete?.name}
            />
        </div>
    );
}



