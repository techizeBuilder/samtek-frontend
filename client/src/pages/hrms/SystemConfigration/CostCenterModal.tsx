/** @format */

import axios from "axios";
import { useEffect, useState } from "react";
import type { CostCenter } from "./CostCenters";
import { toast } from "../../../hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_URL;

interface Props {
    isOpen: boolean;
    mode: "add" | "view" | "edit";
    costCenter: CostCenter | null;
    onClose: () => void;
}

export default function CostCenterModal({
    isOpen,
    mode,
    costCenter,
    onClose,
}: Props) {
    const token = localStorage.getItem("token");

    const [form, setForm] = useState({
        companyId: "",
        branchId: "",
        departmentId: "",
        name: "",
        code: "",
        description: "",
        status: "Active",
    });

    const [companies, setCompanies] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    /* ================= FETCH DEPENDENCIES ================= */
    const fetchCompanies = async () => {
        const res = await axios.get(`${API_BASE}/companies`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data);
    };

    const fetchBranches = async (companyId: string) => {
        const res = await axios.get(`${API_BASE}/branches`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        // Assuming backend supports filtering or we filter frontend
        const filtered = res.data.filter((b: any) => {
            const id = typeof b.companyId === 'object' ? b.companyId._id : b.companyId;
            return id === companyId;
        });
        setBranches(filtered);
    };

    const fetchDepartments = async (branchId: string) => {
        const res = await axios.get(`${API_BASE}/departments`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const filtered = res.data.filter((d: any) => {
            const id = typeof d.branchId === 'object' ? d.branchId._id : d.branchId;
            return id === branchId;
        });
        setDepartments(filtered);
    };

    /* ================= RESET / FILL FORM ================= */
    useEffect(() => {
        if (!isOpen) return;
        fetchCompanies();

        if (mode === "add") {
            setForm({
                companyId: "",
                branchId: "",
                departmentId: "",
                name: "",
                code: "",
                description: "",
                status: "Active",
            });
            setErrors({});
        }

        if ((mode === "edit" || mode === "view") && costCenter) {
            setForm({
                companyId: costCenter.companyId._id,
                branchId: costCenter.branchId._id,
                departmentId: costCenter.departmentId?._id || "",
                name: costCenter.name,
                code: costCenter.code,
                description: costCenter.description || "",
                status: costCenter.status,
            });

            // Load dependencies for initial view
            fetchBranches(costCenter.companyId._id);
            fetchDepartments(costCenter.branchId._id);
            setErrors({});
        }
    }, [isOpen, mode, costCenter]);

    /* ================= HANDLERS ================= */
    const handleCompanyChange = (id: string) => {
        setForm({ ...form, companyId: id, branchId: "", departmentId: "" });
        setBranches([]);
        setDepartments([]);
        if (id) fetchBranches(id);
    };

    const handleBranchChange = (id: string) => {
        setForm({ ...form, branchId: id, departmentId: "" });
        setDepartments([]);
        if (id) fetchDepartments(id);
    };

    /* ================= VALIDATION ================= */
    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!form.companyId) newErrors.companyId = "Company is required";
        if (!form.branchId) newErrors.branchId = "Branch is required";
        if (!form.name.trim()) newErrors.name = "Cost Center name is required";
        if (!form.code.trim()) newErrors.code = "Cost Center code is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            const submissionData = {
                ...form,
                departmentId: form.departmentId === "" ? null : form.departmentId
            };

            if (mode === "add") {
                const res = await axios.post(`${API_BASE}/cost-centers`, submissionData, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                toast({
                    
                    title: "Cost Center Created",
                    description: res.data?.message,
                });
            }

            if (mode === "edit" && costCenter) {
                const res = await axios.put(
                    `${API_BASE}/cost-centers/${costCenter._id}`,
                    submissionData,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                toast({
                    
                    title: "Cost Center Updated",
                    description: res.data?.message,
                });
            }

            onClose();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Operation Failed",
                description: error?.response?.data?.message || "Something went wrong.",
            });
        }
    };

    if (!isOpen) return null;

    const isView = mode === "view";

    return (
        <div
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-8"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-xl rounded-lg shadow-lg flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b shrink-0">
                    <h2 className="text-lg font-semibold">
                        {mode === "add" ? "Add Cost Center" : mode === "edit" ? "Edit Cost Center" : "View Cost Center"}
                    </h2>
                </div>

                {/* Body */}
                <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto">
                    {/* COMPANY */}
                    <div>
                        <label className="text-sm font-medium">Company <span className="text-red-500">*</span></label>
                        <select
                            disabled={isView}
                            value={form.companyId}
                            onChange={(e) => handleCompanyChange(e.target.value)}
                            className={`mt-1 w-full border rounded px-3 py-2 ${errors.companyId ? "border-red-500" : ""}`}
                        >
                            <option value="">Select Company</option>
                            {companies.map((c) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                        </select>
                        {errors.companyId && <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>}
                    </div>

                    {/* BRANCH */}
                    <div>
                        <label className="text-sm font-medium">Branch <span className="text-red-500">*</span></label>
                        <select
                            disabled={isView || !form.companyId}
                            value={form.branchId}
                            onChange={(e) => handleBranchChange(e.target.value)}
                            className={`mt-1 w-full border rounded px-3 py-2 ${errors.branchId ? "border-red-500" : ""}`}
                        >
                            <option value="">Select Branch</option>
                            {branches.map((b) => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                        {errors.branchId && <p className="text-xs text-red-500 mt-1">{errors.branchId}</p>}
                    </div>

                    {/* DEPARTMENT */}
                    <div>
                        <label className="text-sm font-medium">Department (Optional)</label>
                        <select
                            disabled={isView || !form.branchId}
                            value={form.departmentId}
                            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                            className="mt-1 w-full border rounded px-3 py-2"
                        >
                            <option value="">Select Department</option>
                            {departments.map((d) => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* STATUS */}
                    <div>
                        <label className="text-sm font-medium">Status</label>
                        <select
                            disabled={isView}
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="mt-1 w-full border rounded px-3 py-2"
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>

                    {/* NAME */}
                    <div className="col-span-2">
                        <label className="text-sm font-medium">Cost Center Name <span className="text-red-500">*</span></label>
                        <input
                            disabled={isView}
                            value={form.name}
                            onChange={(e) => {
                                setForm({ ...form, name: e.target.value });
                                setErrors({ ...errors, name: "" });
                            }}
                            className={`mt-1 w-full border rounded px-3 py-2 ${errors.name ? "border-red-500" : ""}`}
                            placeholder="e.g. Sales Division"
                        />
                        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    {/* CODE */}
                    <div className="col-span-2">
                        <label className="text-sm font-medium">Cost Center Code <span className="text-red-500">*</span></label>
                        <input
                            disabled={isView}
                            value={form.code}
                            onChange={(e) => {
                                setForm({ ...form, code: e.target.value });
                                setErrors({ ...errors, code: "" });
                            }}
                            className={`mt-1 w-full border rounded px-3 py-2 ${errors.code ? "border-red-500" : ""}`}
                            placeholder="e.g. CC-SALES"
                        />
                        {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                    </div>

                    {/* DESCRIPTION */}
                    <div className="col-span-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            disabled={isView}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="mt-1 w-full border rounded px-3 py-2"
                            rows={3}
                            placeholder="Provide a brief description of the cost center's purpose"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex justify-end gap-2 shrink-0">
                    <button onClick={onClose} className="px-4 py-2 border rounded">
                        Close
                    </button>
                    {mode !== "view" && (
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600 shadow-sm transition-all"
                        >
                            Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

