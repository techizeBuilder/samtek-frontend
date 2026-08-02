/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical } from "lucide-react";
import AddHolidayModal from "./AddHolidayModel";
import ViewHolidayModal from "./ViewHolidayModel";
import Loader from "@/pages/hrms/Loader";
import { useAuth } from "@/hooks/useAuth";
interface Holiday {
    _id: string;
    title: string;
    date: string;
    day: string;
}

const API_BASE = import.meta.env.VITE_API_URL;

const Holiday = () => {
    const { user: currentUser } = useAuth();
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [openViewModal, setOpenViewModal] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
    const [mode, setMode] = useState<"add" | "edit">("add");
    const [openFormModal, setOpenFormModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; id: string | null }>({
        open: false,
        id: null,
    });

    const token = localStorage.getItem("token");

    /* ================= FETCH HOLIDAYS ================= */
    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const companyId = typeof currentUser?.companyId === 'string' ? currentUser.companyId : currentUser?.companyId?._id;
            const res = await axios.get(`${API_BASE}/holidays`, {
                params: { companyId },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setHolidays(res.data);
        } catch (error) {
            console.error("Failed to fetch holidays", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHolidays();
    }, []);

    /* ================= DELETE HOLIDAY ================= */
    const handleDelete = async () => {
        if (!deleteModal.id) return;

        try {
            await axios.delete(`${API_BASE}/holidays/${deleteModal.id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setDeleteModal({ open: false, id: null });
            fetchHolidays();
        } catch (error) {
            console.error("Delete failed", error);
        }
    };
    if (loading) {
        return (
            <div className="p-10 flex justify-center">
                <Loader />
            </div>
        );
    }
    return (
        <div className="p-6">
            {/* Page Heading */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">Holiday</h1>

                {(currentUser?.role === 'HR-Admin' || currentUser?.role === 'Hr Admin') && (
                    <button
                        onClick={() => {
                            setMode("add");
                            setSelectedHoliday(null);
                            setOpenFormModal(true);
                        }}
                        className="bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600"
                    >
                        + Add Holiday
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead className="bg-gray-100">
                        <tr className="text-left text-sm font-semibold text-gray-700">
                            <th className="px-4 py-3">No.</th>
                            <th className="px-4 py-3">Holiday</th>
                            <th className="px-4 py-3">Holiday Date</th>
                            <th className="px-4 py-3">Day</th>
                            <th className="px-4 py-3 text-center">Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan={5} className="text-center py-6 text-gray-500">
                                    Loading holidays...
                                </td>
                            </tr>
                        )}

                        {!loading && holidays.length === 0 && (
                            <tr>
                                <td colSpan={5} className="text-center py-6 text-gray-500">
                                    No holidays found
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            holidays.map((holiday, index) => (
                                <tr
                                    key={holiday._id}
                                    className="border-t text-sm hover:bg-gray-50"
                                >
                                    <td className="px-4 py-3">{index + 1}</td>

                                    <td className="px-4 py-3 font-medium text-orange-500">
                                        {holiday.title}
                                    </td>

                                    <td className="px-4 py-3">
                                        {new Date(holiday.date).toLocaleDateString()}
                                    </td>

                                    <td className="px-4 py-3">{holiday.day}</td>

                                    {/* Action */}
                                    <td className="px-4 py-3 text-center relative overflow-visible">
                                        <span
                                            className="inline-block cursor-pointer text-blue-500"
                                            onClick={() =>
                                                setOpenMenu(
                                                    openMenu === holiday._id ? null : holiday._id
                                                )
                                            }
                                        >
                                            <MoreVertical size={18} />
                                        </span>

                                        {/* Dropdown */}
                                        {openMenu === holiday._id && (
                                            <div className="absolute right-6 mt-2 w-32 bg-white border rounded-md shadow-lg z-50">
                                                <button
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                                    onClick={() => {
                                                        setOpenMenu(null);
                                                        setSelectedHoliday(holiday);
                                                        setOpenViewModal(true);
                                                    }}
                                                >
                                                    View
                                                </button>

                                                {(currentUser?.role === 'HR-Admin' || currentUser?.role === 'Hr Admin') && (
                                                    <>
                                                        <button
                                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                                            onClick={() => {
                                                                setOpenMenu(null);
                                                                setMode("edit");
                                                                setSelectedHoliday(holiday);
                                                                setOpenFormModal(true);
                                                            }}
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                                                            onClick={() => {
                                                                setOpenMenu(null);
                                                                setDeleteModal({ open: true, id: holiday._id });
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {/* Add Holiday Modal */}
            <AddHolidayModal
                isOpen={openFormModal}
                mode={mode}
                holiday={selectedHoliday}
                onClose={() => setOpenFormModal(false)}
                onSuccess={fetchHolidays}
            />

            <ViewHolidayModal
                isOpen={openViewModal}
                holiday={selectedHoliday}
                onClose={() => {
                    setOpenViewModal(false);
                    setSelectedHoliday(null);
                }}
            />

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
                        <h3 className="text-lg font-bold mb-2 text-red-600">Delete Holiday</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete this holiday? This action is permanent.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteModal({ open: false, id: null })}
                                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md shadow-sm hover:bg-red-700 transition-all active:scale-95"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Holiday;


