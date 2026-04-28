/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import Loader from "../../Loader";
import { toast } from "../../Alert/Toast";
import { Plus, Trash2, Edit2, ShieldAlert, Zap, Users, Wallet } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;

type ItemType = "EMPLOYEE_CATEGORY" | "EXPENSE_CATEGORY" | "REIMBURSEMENT_CATEGORY";

interface MasterItem {
    _id: string;
    type: ItemType;
    name: string;
    status: "Active" | "Inactive";
}

interface TaxSlab {
    _id: string;
    minIncome: number;
    maxIncome: number;
    percentage: number;
    description?: string;
}

export default function MasterList() {
    const token = localStorage.getItem("token");
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ItemType | "TAX_SLAB">("EMPLOYEE_CATEGORY");

    const [items, setItems] = useState<MasterItem[]>([]);
    const [taxSlabs, setTaxSlabs] = useState<TaxSlab[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [form, setForm] = useState({
        name: "",
        minIncome: "",
        maxIncome: "",
        percentage: "",
        description: "",
        status: "Active"
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            if (activeTab === "TAX_SLAB") {
                const res = await axios.get(`${API_BASE}/master-lists/tax-slabs`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setTaxSlabs(res.data);
            } else {
                const res = await axios.get(`${API_BASE}/master-lists/items?type=${activeTab}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setItems(res.data);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleSubmit = async () => {
        try {
            if (activeTab === "TAX_SLAB") {
                const payload = {
                    minIncome: Number(form.minIncome),
                    maxIncome: Number(form.maxIncome),
                    percentage: Number(form.percentage),
                    description: form.description
                };
                if (editingItem) {
                    await axios.put(`${API_BASE}/master-lists/tax-slabs/${editingItem._id}`, payload, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } else {
                    await axios.post(`${API_BASE}/master-lists/tax-slabs`, payload, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }
            } else {
                const payload = { type: activeTab, name: form.name, status: form.status };
                if (editingItem) {
                    await axios.put(`${API_BASE}/master-lists/items/${editingItem._id}`, payload, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } else {
                    await axios.post(`${API_BASE}/master-lists/items`, payload, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }
            }

            toast({ type: "success", title: "Success", message: "Operation completed successfully" });
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            toast({ type: "error", title: "Error", message: "Action failed" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            const endpoint = activeTab === "TAX_SLAB" ? "tax-slabs" : "items";
            await axios.delete(`${API_BASE}/master-lists/${endpoint}/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({ type: "success", title: "Deleted", message: "Item removed successfully" });
            fetchData();
        } catch (error) {
            toast({ type: "error", title: "Error", message: "Delete failed" });
        }
    };

    if (loading && items.length === 0 && taxSlabs.length === 0) return <Loader />;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Master List Configuration</h1>
                    <p className="text-sm text-gray-500">System Configuration / Master List</p>
                </div>
                <button
                    onClick={() => {
                        setEditingItem(null);
                        setForm({ name: "", minIncome: "", maxIncome: "", percentage: "", description: "", status: "Active" });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600 shadow-sm"
                >
                    <Plus size={18} />
                    Add New
                </button>
            </div>

            {/* TABS */}
            <div className="flex gap-2 mb-6 border-b">
                {[
                    { id: "EMPLOYEE_CATEGORY", label: "Employee Categories", icon: Users },
                    { id: "EXPENSE_CATEGORY", label: "Expense Categories", icon: Zap },
                    { id: "REIMBURSEMENT_CATEGORY", label: "Reimbursements", icon: Wallet },
                    { id: "TAX_SLAB", label: "Tax Slabs", icon: ShieldAlert }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id
                                ? "border-orange-500 text-orange-600 bg-orange-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-sm text-center">
                    <thead className="bg-gray-50">
                        {activeTab === "TAX_SLAB" ? (
                            <tr>
                                <th className="px-4 py-3">Income Range</th>
                                <th className="px-4 py-3">Tax Percentage</th>
                                <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                        ) : (
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {activeTab === "TAX_SLAB" ? (
                            taxSlabs.map((slab) => (
                                <tr key={slab._id} className="border-t hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        ₹{slab.minIncome.toLocaleString()} - {slab.maxIncome === 99999999 ? "Above" : `₹${slab.maxIncome.toLocaleString()}`}
                                    </td>
                                    <td className="px-4 py-3 font-bold text-orange-600">{slab.percentage}%</td>
                                    <td className="px-4 py-3 flex justify-center gap-4">
                                        <Edit2 size={16} className="text-gray-400 hover:text-blue-500 cursor-pointer"
                                            onClick={() => {
                                                setEditingItem(slab);
                                                setForm({ ...form, minIncome: slab.minIncome.toString(), maxIncome: slab.maxIncome.toString(), percentage: slab.percentage.toString(), description: slab.description || "" });
                                                setIsModalOpen(true);
                                            }}
                                        />
                                        <Trash2 size={16} className="text-gray-400 hover:text-red-500 cursor-pointer" onClick={() => handleDelete(slab._id)} />
                                    </td>
                                </tr>
                            ))
                        ) : (
                            items.map((item) => (
                                <tr key={item._id} className="border-t hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium">{item.name}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 flex justify-center gap-4">
                                        <Edit2 size={16} className="text-gray-400 hover:text-blue-500 cursor-pointer"
                                            onClick={() => {
                                                setEditingItem(item);
                                                setForm({ ...form, name: item.name, status: item.status });
                                                setIsModalOpen(true);
                                            }}
                                        />
                                        <Trash2 size={16} className="text-gray-400 hover:text-red-500 cursor-pointer" onClick={() => handleDelete(item._id)} />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {(activeTab === "TAX_SLAB" ? taxSlabs.length : items.length) === 0 && (
                    <div className="p-12 text-center text-gray-400">No records found. Click "Add New" to get started.</div>
                )}
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b bg-gray-50/50">
                            <h3 className="text-lg font-bold">{editingItem ? "Edit Item" : "Add New Item"}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {activeTab === "TAX_SLAB" ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Min Income</label>
                                            <input value={form.minIncome} onChange={e => setForm({ ...form, minIncome: e.target.value })} className="w-full border rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-orange-500" placeholder="0" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase">Max Income</label>
                                            <input value={form.maxIncome} onChange={e => setForm({ ...form, maxIncome: e.target.value })} className="w-full border rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-orange-500" placeholder="9999999" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Percentage (%)</label>
                                        <input value={form.percentage} onChange={e => setForm({ ...form, percentage: e.target.value })} className="w-full border rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-orange-500" placeholder="5" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
                                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-orange-500" rows={2} />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Name</label>
                                        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-orange-500" placeholder="e.g. Contractual" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Status</label>
                                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border rounded-md p-2 text-sm outline-none focus:ring-1 focus:ring-orange-500">
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50/50 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-gray-100">Cancel</button>
                            <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-md hover:bg-orange-700 shadow-sm transition-all active:scale-95">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
