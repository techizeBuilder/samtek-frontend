import { useEffect, useState } from "react";
import axios from "axios";
import { X, Calendar as CalendarIcon, Type, Save, AlertCircle } from "lucide-react";
import { toast } from "../../../hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

interface Holiday {
  _id?: string;
  title: string;
  date: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  holiday: Holiday | null;
  onSuccess: () => void;
}

const API_BASE = import.meta.env.VITE_API_URL;

const AddHolidayModal = ({
  isOpen,
  onClose,
  mode,
  holiday,
  onSuccess,
}: Props) => {
  const { user: currentUser } = useAuth();
  const token = localStorage.getItem("token");

  const [form, setForm] = useState<Holiday>({
    title: "",
    date: "",
  });

  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && holiday) {
      setForm({
        title: holiday.title,
        date: holiday.date.split("T")[0],
      });
    } else {
      setForm({ title: "", date: "" });
    }

    setErrors({});
  }, [isOpen, mode, holiday]);

  if (!isOpen) return null;

  const validate = () => {
    const e: any = {};
    if (!form.title.trim()) e.title = "Holiday title is required";
    if (!form.date) e.date = "Date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);

      const companyId = typeof currentUser?.companyId === 'string' ? currentUser.companyId : currentUser?.companyId?._id;

      const payload = {
        ...form,
        companyId
      };

      const res =
        mode === "add"
          ? await axios.post(`${API_BASE}/holidays`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          })
          : await axios.put(`${API_BASE}/holidays/${holiday?._id}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });

      toast({
        title: mode === "add" ? "Holiday Added" : "Holiday Updated",
        description: res.data?.message || "Success",
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.response?.data?.message || "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* BACKDROP */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* MODAL */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === "add" ? "Add Holiday" : "Edit Holiday"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <Label className="text-sm font-semibold text-gray-700">
              Holiday Title *
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Enter holiday title"
              className={`rounded-md border-gray-200 focus:border-orange-500 ${errors.title ? "border-red-500" : ""
                }`}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-semibold text-gray-700">
              Date *
            </Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={`rounded-md border-gray-200 focus:border-orange-500 ${errors.date ? "border-red-500" : ""
                }`}
            />
            {errors.date && (
              <p className="text-xs text-red-500">{errors.date}</p>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-md bg-orange-600 hover:bg-orange-700 text-white"
            >
              {loading ? "Saving..." : mode === "add" ? "Save" : "Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddHolidayModal;

