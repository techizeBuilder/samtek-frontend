/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { MoreVertical } from "lucide-react";
import AddLeaveTypeModal from "./AddLeaveType";
import DeleteLeaveTypeModal from "./DeleteLeaveTypeModal";
import Loader from "../Loader";
import { toast } from "../../Alert/Toast";

interface LeaveType {
  _id: string;
  name: string;
  code: string;
  maxDays: number;
  paid: boolean;
  carryForward: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL;

const LeaveType = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const [selectedLeave, setSelectedLeave] = useState<LeaveType | null>(null);

  const token = localStorage.getItem("token");

  /* ================= FETCH LEAVE TYPES ================= */
  const fetchLeaveTypes = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/leave-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeaveTypes(res.data);
    } catch (error) {
      console.error("Failed to fetch leave types", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    if (!selectedLeave) return;

    try {
      const res = await axios.delete(
        `${API_BASE}/leave-types/${selectedLeave._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      toast({
        type: "success",
        title: "Leave Type Deleted",
        message: res.data?.message || "Leave type has been deleted successfully.",
      });

      setOpenDeleteModal(false);
      setSelectedLeave(null);
      fetchLeaveTypes();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Delete Failed",
        message:
          error?.response?.data?.message ||
          "Unable to delete leave type. Please try again.",
      });
    }
  };


  if (loading) {
    return (
      <div className="relative min-h-[300px]">
        <Loader />
      </div>
    );
  }
  return (
    <div className="p-6">
      {/* Heading */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-black">Leave Types & Rules</h1>

        <button
          onClick={() => {
            setSelectedLeave(null);
            setOpenAddModal(true);
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600"
        >
          + Add Leave Type
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow min-h-[calc(100vh-180px)] overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr className="text-left text-sm font-semibold text-gray-700">
              <th className="px-4 py-3">No.</th>
              <th className="px-4 py-3">Leave Name</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Max Days</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Carry Forward</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && leaveTypes.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500">
                  No leave types found
                </td>
              </tr>
            )}

            {!loading &&
              leaveTypes.map((leave, index) => (
                <tr
                  key={leave._id}
                  className="border-t text-sm hover:bg-gray-50"
                >
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-black">
                    {leave.name}
                  </td>
                  <td className="px-4 py-3">{leave.code}</td>
                  <td className="px-4 py-3">{leave.maxDays}</td>
                  <td className="px-4 py-3">{leave.paid ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">
                    {leave.carryForward ? "Yes" : "No"}
                  </td>

                  {/* ACTION */}
                  <td className="px-4 py-3 text-center relative overflow-visible">
                    <span
                      className="inline-block cursor-pointer text-blue-500"
                      onClick={() =>
                        setOpenMenu(openMenu === leave._id ? null : leave._id)
                      }
                    >
                      <MoreVertical size={18} />
                    </span>

                    {openMenu === leave._id && (
                      <div className="absolute right-6 mt-2 w-36 bg-white border rounded-md shadow-lg z-50">
                        <button
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => {
                            setOpenMenu(null);
                            setSelectedLeave(leave);
                            setOpenAddModal(true);
                          }}
                        >
                          Edit Leave
                        </button>

                        <button
                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                          onClick={() => {
                            setOpenMenu(null);
                            setSelectedLeave(leave);
                            setOpenDeleteModal(true);
                          }}
                        >
                          Delete Leave
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT MODAL */}
      <AddLeaveTypeModal
        isOpen={openAddModal}
        editData={selectedLeave}
        onClose={() => {
          setOpenAddModal(false);
          setSelectedLeave(null);
          fetchLeaveTypes();
        }}
      />

      {/* DELETE MODAL */}
      <DeleteLeaveTypeModal
        isOpen={openDeleteModal}
        onClose={() => {
          setOpenDeleteModal(false);
          setSelectedLeave(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default LeaveType;
