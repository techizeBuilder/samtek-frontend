/** @format */
import axios from "axios";
import { useState } from "react";
import { toast } from "@/pages/Alert/Toast";
const API_BASE = import.meta.env.VITE_API_URL;


const AddExpenseModal = ({
  open,
  onClose,
  onSuccess,
  expense,
  readOnly = false,
}: any) => {
  const token = localStorage.getItem("token");

  const isEdit = !!expense;
  const isView = readOnly;

  const [receipt, setReceipt] = useState<File | null>(null);

  const [form, setForm] = useState({
    expenseType: expense?.expenseType || "",
    subCategory: expense?.subCategory || "",
    billingType: expense?.billingType || "Non-Chargeable",
    amount: expense?.amount || "",
    date: expense?.date
      ? new Date(expense.date).toISOString().split("T")[0]
      : "",
    travelRequestId: expense?.travelRequestId || "",
    remarks: expense?.remarks || "",
  });

  /* ================= SUBMIT ================= */
  const submit = async () => {
    const fd = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (value) fd.append(key, value as string);
    });

    if (receipt) fd.append("receipt", receipt);

    try {
      let res;

      if (isEdit) {
        res = await axios.put(`${API_BASE}/expense-requests/${expense._id}`, fd, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      } else {
        res = await axios.post(`${API_BASE}/expense-requests`, fd, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      toast({
        type: "success",
        title: isEdit ? "Expense Updated" : "Expense Added",
        message:
          res?.data?.message ||
          (isEdit
            ? "Expense updated successfully"
            : "Expense added successfully"),
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Action Failed",
        message:
          error?.response?.data?.message ||
          "Failed to submit expense. Please try again.",
      });
      console.error("Expense submit failed", error);
    }
  };


  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-xl p-6 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">
          {isView ? "View Expense" : isEdit ? "Edit Expense" : "Add Expense"}
        </h3>

        {/* SCROLLABLE CONTENT */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Expense Type */}
          <div>
            <label className="text-sm font-medium">Expense Type</label>
            <select
              disabled={isView}
              className="w-full border rounded-md p-2 text-sm disabled:bg-gray-100"
              value={form.expenseType}
              onChange={(e) =>
                setForm({
                  ...form,
                  expenseType: e.target.value,
                  subCategory: e.target.value === "Travel Expense" ? form.subCategory : ""
                })
              }
            >
              <option value="">Select</option>
              <option value="Travel Expense">Travel Expense</option>
              <option value="Food Expense">Food Expense</option>
              <option value="Hotel Expense">Hotel Expense</option>
              <option value="Other Expense">Other Expense</option>
            </select>
          </div>

          {/* Sub Category for Travel */}
          {form.expenseType === "Travel Expense" && (
            <div>
              <label className="text-sm font-medium">Sub Category (Travel)</label>
              <select
                disabled={isView}
                className="w-full border rounded-md p-2 text-sm disabled:bg-gray-100"
                value={form.subCategory}
                onChange={(e) => setForm({ ...form, subCategory: e.target.value })}
              >
                <option value="">Select</option>
                <option value="Tickets">Tickets</option>
                <option value="Fuel">Fuel</option>
                <option value="Taxi / Auto">Taxi / Auto</option>
                <option value="Misc.">Misc.</option>
              </select>
            </div>
          )}

          {/* Billing Type (Chargeable / Non-Chargeable) */}
          <div>
            <label className="text-sm font-medium block mb-2">Billing Type (Category)</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  disabled={isView}
                  name="billingType"
                  value="Chargeable"
                  checked={form.billingType === "Chargeable"}
                  onChange={(e) => setForm({ ...form, billingType: e.target.value as any })}
                  className="accent-primary"
                />
                Chargeable
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  disabled={isView}
                  name="billingType"
                  value="Non-Chargeable"
                  checked={form.billingType === "Non-Chargeable"}
                  onChange={(e) => setForm({ ...form, billingType: e.target.value as any })}
                  className="accent-primary"
                />
                Non-Chargeable
              </label>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm font-medium">Amount</label>
            <input
              type="number"
              disabled={isView}
              className="w-full border rounded-md p-2 text-sm disabled:bg-gray-100"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium">Expense Date</label>
            <input
              type="date"
              disabled={isView}
              className="w-full border rounded-md p-2 text-sm disabled:bg-gray-100"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          {/* Receipt */}
          <div>
            <label className="text-sm font-medium">Upload Bill</label>

            {expense?.receipt && (
              <a
                href={`${API_BASE.replace("/api", "")}${expense.receipt}`}
                target="_blank"
                className="block text-xs text-primary underline mb-1"
              >
                View Existing Bill
              </a>
            )}

            {!isView && (
              <input
                type="file"
                className="w-full text-sm"
                onChange={(e) =>
                  setReceipt(e.target.files ? e.target.files[0] : null)
                }
              />
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="text-sm font-medium">Remarks</label>
            <textarea
              disabled={isView}
              className="w-full border rounded-md p-2 text-sm disabled:bg-gray-100"
              rows={3}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-sm"
          >
            Close
          </button>

          {!isView && (
            <button
              onClick={submit}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm"
            >
              {isEdit ? "Update Expense" : "Submit Expense"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;
