/** @format */
import { useEffect, useState } from "react";
import axios from "axios";
import AddExpenseModal from "./AddExpenseModal";
import Loader from "../../Loader";
import { toast } from "@/pages/Alert/Toast";
const API_BASE = import.meta.env.VITE_API_URL;

const Expense = () => {
  const token = localStorage.getItem("token");

  const [expenses, setExpenses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [mode, setMode] = useState<"view" | "edit" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /* ================= FETCH ================= */
  const fetchExpenses = async () => {
    const res = await axios.get(`${API_BASE}/expense-requests/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setExpenses(res.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  /* ================= DELETE ================= */
  const confirmDelete = async () => {
    try {
      const res = await axios.delete(`${API_BASE}/expense-requests/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        type: "success",
        title: "Expense Deleted",
        message: res?.data?.message || "Expense deleted successfully",
      });

      setDeleteId(null);
      fetchExpenses();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Delete Failed",
        message:
          error?.response?.data?.message ||
          "Failed to delete expense. Please try again.",
      });
      console.error("Expense delete failed", error);
    }
  };

  if (loading) return <Loader />;
  return (
    <div className="p-4">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Expenses</h2>
          <p className="text-sm text-gray-500">HRMS / Finance / Expenses</p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm"
        >
          + Add Expense
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm text-center">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">Type</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
              <th className="p-3">Bill</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {expenses.map((e) => (
              <tr key={e._id} className="border-t">
                <td className="p-3">
                  {e.expenseType}
                  {e.subCategory && (
                    <span className="text-gray-400 text-xs block">
                      ({e.subCategory})
                    </span>
                  )}
                </td>
                <td className="p-3 font-medium">₹{e.amount}</td>
                <td className="p-3">
                  {new Date(e.date).toLocaleDateString("en-GB")}
                </td>

                <td className="p-3">
                  <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">
                    {e.status}
                  </span>
                </td>

                <td className="p-3">
                  {e.receipt ? (
                    <a
                      href={`${API_BASE.replace("/api", "")}${e.receipt}`}
                      target="_blank"
                      className="text-primary underline text-xs"
                    >
                      View
                    </a>
                  ) : (
                    "-"
                  )}
                </td>

                <td className="p-3">
                  <div className="flex justify-center gap-2 text-xs">
                    <button
                      onClick={() => {
                        setSelectedExpense(e);
                        setMode("view");
                      }}
                      className="text-blue-600"
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        setSelectedExpense(e);
                        setMode("edit");
                      }}
                      className="text-green-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(e._id)}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {expenses.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-gray-500">
                  No expenses submitted yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD */}
      {open && (
        <AddExpenseModal
          open
          onClose={() => setOpen(false)}
          onSuccess={fetchExpenses}
        />
      )}

      {/* VIEW / EDIT */}
      {mode && (
        <AddExpenseModal
          open
          expense={selectedExpense}
          readOnly={mode === "view"}
          onClose={() => setMode(null)}
          onSuccess={fetchExpenses}
        />
      )}

      {/* DELETE MODAL */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Delete Expense</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete this expense?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm"
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

export default Expense;
