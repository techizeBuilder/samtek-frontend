/** @format */

import axios from "axios";
import { useEffect, useState } from "react";
import type { Company } from "./Company";
import { toast } from "../../Alert/Toast";

const API_BASE = import.meta.env.VITE_API_URL;
const IMAGE_BASE = API_BASE.replace("/api", "");

interface Props {
  isOpen: boolean;
  mode: "add" | "view" | "edit";
  company: Company | null;
  onClose: () => void;
}

interface FormDataState {
  name: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  address: string;
  city: string;
  state: string;
  status: "Active" | "Inactive";
  logo: string;
}

export default function CompanyModal({
  isOpen,
  mode,
  company,
  onClose,
}: Props) {
  const token = localStorage.getItem("token");

  const [formData, setFormData] = useState<FormDataState>({
    name: "",
    email: "",
    phone: "",
    website: "",
    industry: "",
    address: "",
    city: "",
    state: "",
    status: "Active",
    logo: "",
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ================= RESET / FILL FORM ================= */
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "add") {
      setFormData({
        name: "",
        email: "",
        phone: "",
        website: "",
        industry: "",
        address: "",
        city: "",
        state: "",
        status: "Active",
        logo: "",
      });
      setLogoFile(null);
      setLogoPreview("");
      setErrors({});
    }

    if ((mode === "edit" || mode === "view") && company) {
      setFormData({
        name: company.name || "",
        email: company.email || "",
        phone: company.phone || "",
        website: company.website || "",
        industry: company.industry || "",
        address: company.address || "",
        city: company.city || "",
        state: company.state || "",
        status: company.status || "Active",
        logo: company.logo || "",
      });
      if (company.logo) {
        setLogoPreview(`${IMAGE_BASE}${company.logo}`);
      } else {
        setLogoPreview("");
      }
      setLogoFile(null);
      setErrors({});
    }
  }, [isOpen, mode, company]);

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Company name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(formData.email))
      newErrors.email = "Invalid email";

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    if (!formData.website.trim()) newErrors.website = "Website is required";

    if (!formData.industry.trim()) newErrors.industry = "Industry is required";

    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.state.trim()) newErrors.state = "State is required";

    if (!formData.logo && !logoFile) {
      newErrors.logo = "Company logo is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    const data = new FormData();
    Object.keys(formData).forEach((key) => {
      if (key !== "logo") {
        data.append(key, (formData as any)[key]);
      }
    });
    if (logoFile) {
      data.append("logo", logoFile);
    }

    try {
      if (mode === "add") {
        await axios.post(`${API_BASE}/companies`, data, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        toast({
          type: "success",
          title: "Company Created",
          message: "Company created successfully!",
        });
      }

      if (mode === "edit" && company) {
        await axios.put(`${API_BASE}/companies/${(company as any)._id}`, data, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });

        toast({
          type: "success",
          title: "Company Updated",
          message: "Company updated successfully!",
        });
      }

      onClose();
    } catch (error: any) {
      toast({
        type: "error",
        title: "Operation Failed",
        message:
          error?.response?.data?.message ||
          (mode === "add"
            ? "Unable to create the company. Please try again."
            : "Unable to update the company. Please try again."),
      });
    } finally {
      setLoading(false);
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
            {mode === "add"
              ? "Add Company"
              : mode === "edit"
                ? "Edit Company"
                : "View Company"}
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto">
          {[
            ["Company Name", "name"],
            ["Email", "email"],
            ["Phone", "phone"],
            ["Website", "website"],
            ["Industry", "industry"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="text-sm font-medium">
                {label} <span className="text-red-500">*</span>
              </label>
              <input
                disabled={isView}
                value={(formData as any)[key]}
                onChange={(e) => {
                  setFormData({ ...formData, [key]: e.target.value });
                  setErrors({ ...errors, [key]: "" });
                }}
                className={`mt-1 w-full border rounded px-3 py-2 ${errors[key] ? "border-red-500" : ""
                  }`}
              />
              {errors[key] && (
                <p className="text-xs text-red-500 mt-1">{errors[key]}</p>
              )}
            </div>
          ))}
          <div>
            <label className="text-sm font-medium">
              City <span className="text-red-500">*</span>
            </label>
            <input
              disabled={isView}
              value={formData.city}
              onChange={(e) => {
                setFormData({ ...formData, city: e.target.value });
                setErrors({ ...errors, city: "" });
              }}
              className={`mt-1 w-full border rounded px-3 py-2 ${errors.city ? "border-red-500" : ""
                }`}
            />
            {errors.city && (
              <p className="text-xs text-red-500 mt-1">{errors.city}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">
              State <span className="text-red-500">*</span>
            </label>
            <input
              disabled={isView}
              value={formData.state}
              onChange={(e) => {
                setFormData({ ...formData, state: e.target.value });
                setErrors({ ...errors, state: "" });
              }}
              className={`mt-1 w-full border rounded px-3 py-2 ${errors.state ? "border-red-500" : ""
                }`}
            />
            {errors.state && (
              <p className="text-xs text-red-500 mt-1">{errors.state}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              disabled={isView}
              value={formData.address}
              onChange={(e) => {
                setFormData({ ...formData, address: e.target.value });
                setErrors({ ...errors, address: "" });
              }}
              className={`mt-1 w-full border rounded px-3 py-2 ${errors.address ? "border-red-500" : ""
                }`}
              rows={3}
            />
            {errors.address && (
              <p className="text-xs text-red-500 mt-1">{errors.address}</p>
            )}
          </div>

          {/* Logo Upload */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Logo (JPG/PNG) <span className="text-red-500">*</span>
            </label>
            <div className={`flex items-center gap-4 p-2 border rounded-md ${errors.logo ? "border-red-500 bg-red-50" : ""}`}>
              {logoPreview && (
                <div className="w-16 h-16 rounded-lg border overflow-hidden bg-gray-50">
                  <img
                    src={logoPreview}
                    alt="Logo Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <input
                disabled={isView}
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                  } else {
                    setLogoFile(null);
                    setLogoPreview("");
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
            </div>
            {errors.logo && (
              <p className="text-xs text-red-500 mt-1">{errors.logo}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="text-sm font-medium">Status</label>
            <select
              disabled={isView}
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as "Active" | "Inactive" })
              }
              className="mt-1 w-full border rounded px-3 py-2"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
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
              disabled={loading}
              className="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}