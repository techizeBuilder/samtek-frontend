/** @format */
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Building2, MapPin, FileText, Globe, Mail, Facebook, Instagram,
  Linkedin, Twitter, Youtube, Link2, Edit2, Save, X, Upload,
  Plus, Trash2, CheckCircle, Image as ImageIcon, Lock, Eye, EyeOff
} from "lucide-react";
import { toast } from "../../Alert/Toast";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const IMG_BASE = API_BASE.replace("/api", "");

type SocialType = "website" | "email" | "facebook" | "instagram" | "linkedin" | "twitter" | "youtube" | "other";

interface SocialLink {
  _id?: string;
  type: SocialType;
  label?: string;
  url: string;
}

interface CompanyData {
  _id: string;
  unitName?: string;
  name?: string;
  legalName?: string;
  companyType?: string;
  mobile?: string;
  email?: string;
  address?: string;
  locationPin?: string;
  city?: string;
  state?: string;
  pan?: string;
  gst?: string;
  website?: string;
  stampUrl?: string;
  socialLinks?: SocialLink[];
  isActive?: boolean;
}

const SOCIAL_ICONS: Record<SocialType, JSX.Element> = {
  website:   <Globe      className="w-4 h-4 text-blue-500" />,
  email:     <Mail       className="w-4 h-4 text-red-500" />,
  facebook:  <Facebook   className="w-4 h-4 text-blue-700" />,
  instagram: <Instagram  className="w-4 h-4 text-pink-500" />,
  linkedin:  <Linkedin   className="w-4 h-4 text-blue-600" />,
  twitter:   <Twitter    className="w-4 h-4 text-sky-500" />,
  youtube:   <Youtube    className="w-4 h-4 text-red-600" />,
  other:     <Link2      className="w-4 h-4 text-gray-500" />,
};

const SOCIAL_OPTIONS: { value: SocialType; label: string }[] = [
  { value: "website",   label: "Website" },
  { value: "email",     label: "Email" },
  { value: "facebook",  label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin",  label: "LinkedIn" },
  { value: "twitter",   label: "Twitter / X" },
  { value: "youtube",   label: "YouTube" },
  { value: "other",     label: "Other" },
];

// ─── Read-only info row ───────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value || <span className="text-gray-400 italic">—</span>}</span>
    </div>
  );
}

// ─── Editable field ───────────────────────────────────────────────────────────
function EditField({
  label, name, value, onChange, type = "text", required
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string; required?: boolean;
}) {
  const base = "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent";
  if (type === "textarea") {
    return (
      <div>
        <label className="text-xs font-medium text-gray-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
        <textarea name={name} value={value} onChange={onChange} rows={3} className={`${base} resize-none`} />
      </div>
    );
  }
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} name={name} value={value} onChange={onChange} className={base} />
    </div>
  );
}

// ─── 6-digit boxed input (for the Cash Password) ─────────────────────────────
function SixDigitInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const setDigit = (idx: number, ch: string) => {
    const clean = ch.replace(/\D/g, "").slice(-1);
    const next = digits.slice();
    next[idx] = clean;
    onChange(next.join(""));
    if (clean && idx < 5) refs.current[idx + 1]?.focus();
  };

  const onKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      e.preventDefault();
      onChange(pasted);
      refs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          className="w-10 h-11 text-center text-lg font-bold border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MyCompany() {
  const token = localStorage.getItem("token");

  const [company, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // form state (only used while editing)
  const [form, setForm] = useState<Partial<CompanyData>>({});
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // stamp
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [stampPreview, setStampPreview] = useState<string | null>(null);
  const [stampUploading, setStampUploading] = useState(false);
  const stampRef = useRef<HTMLInputElement>(null);

  // Cash Password — gates Accounts' access to customers' Cash Amounts.
  // Stored server-side encrypted; only the Company Admin can set/view it here.
  const [cashPwd, setCashPwd] = useState<{ isSet: boolean; password: string | null } | null>(null);
  const [showCashPwd, setShowCashPwd] = useState(false);
  const [editingCashPwd, setEditingCashPwd] = useState(false);
  const [cashPwdInput, setCashPwdInput] = useState("");
  const [savingCashPwd, setSavingCashPwd] = useState(false);

  const fetchCashPwd = async (companyId: string) => {
    try {
      const res = await axios.get(`${API_BASE}/companies/${companyId}/cash-password`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCashPwd({ isSet: !!res.data?.isSet, password: res.data?.password || null });
    } catch {
      setCashPwd(null); // e.g. not authorized — card will show nothing sensitive
    }
  };

  const saveCashPwd = async () => {
    if (!company || !/^\d{6}$/.test(cashPwdInput)) {
      toast({ type: "error", title: "Invalid", message: "Cash Password must be exactly 6 digits" });
      return;
    }
    setSavingCashPwd(true);
    try {
      await axios.put(`${API_BASE}/companies/${company._id}/cash-password`, { password: cashPwdInput }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast({ type: "success", title: "Saved", message: "Cash Password saved successfully" });
      setEditingCashPwd(false);
      setCashPwdInput("");
      setShowCashPwd(false);
      await fetchCashPwd(company._id);
    } catch (err: any) {
      toast({ type: "error", title: "Save Failed", message: err?.response?.data?.message || "Could not save Cash Password" });
    } finally {
      setSavingCashPwd(false);
    }
  };

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchCompany = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list: CompanyData[] = res.data?.companies || [];
      if (list.length > 0) {
        setCompany(list[0]);
        fetchCashPwd(list[0]._id);
      }
    } catch {
      toast({ type: "error", title: "Error", message: "Failed to load company data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompany(); }, []);

  // ── start editing ──────────────────────────────────────────────────────────
  const startEdit = () => {
    if (!company) return;
    setForm({ ...company });
    setSocialLinks(company.socialLinks?.length ? [...company.socialLinks] : []);
    setStampFile(null);
    setStampPreview(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setStampFile(null);
    setStampPreview(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  // ── social link helpers ────────────────────────────────────────────────────
  const addSocialLink = () => {
    setSocialLinks((s) => [...s, { type: "website", url: "", label: "" }]);
  };

  const updateSocialLink = (idx: number, field: keyof SocialLink, value: string) => {
    setSocialLinks((s) => s.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const removeSocialLink = (idx: number) => {
    setSocialLinks((s) => s.filter((_, i) => i !== idx));
  };

  // ── stamp ──────────────────────────────────────────────────────────────────
  const handleStampFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStampFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setStampPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadStamp = async (companyId: string) => {
    if (!stampFile) return;
    setStampUploading(true);
    const fd = new FormData();
    fd.append("stamp", stampFile);
    try {
      const res = await axios.put(`${API_BASE}/companies/${companyId}/stamp`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.stampUrl;
    } finally {
      setStampUploading(false);
    }
  };

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!company) return;
    setSaving(true);
    try {
      const payload = { ...form, socialLinks };
      delete (payload as any)._id;
      delete (payload as any).__v;

      await axios.put(`${API_BASE}/companies/${company._id}`, payload, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });

      let newStampUrl = company.stampUrl;
      if (stampFile) {
        newStampUrl = await uploadStamp(company._id);
      }

      toast({ type: "success", title: "Saved", message: "Company details updated successfully" });
      await fetchCompany();
      setEditing(false);
      setStampFile(null);
      setStampPreview(null);
    } catch (err: any) {
      toast({ type: "error", title: "Save Failed", message: err?.response?.data?.message || "Could not save changes" });
    } finally {
      setSaving(false);
    }
  };

  // ── stamp URL helper ───────────────────────────────────────────────────────
  const stampSrc = stampPreview || (company?.stampUrl ? `${IMG_BASE}${company.stampUrl}` : null);

  // ── loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500 text-sm">
        No company data found.
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Company</h1>
          <p className="text-sm text-gray-500 mt-0.5">System Configuration / My Company</p>
        </div>
        {!editing ? (
          <button
            onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-all active:scale-95 shadow-sm"
          >
            <Edit2 className="w-4 h-4" /> Edit Details
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || stampUploading}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all active:scale-95 shadow-sm disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving || stampUploading ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {/* ── Company Identity Card ─────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 flex items-center gap-6">
        {/* Stamp / Logo */}
        <div className="flex-shrink-0">
          {stampSrc ? (
            <div className="w-24 h-24 rounded-xl border-2 border-orange-200 bg-white overflow-hidden shadow-sm flex items-center justify-center">
              <img src={stampSrc} alt="Company Stamp" className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-xl border-2 border-dashed border-orange-300 bg-white flex flex-col items-center justify-center gap-1 text-orange-300">
              <ImageIcon className="w-8 h-8" />
              <span className="text-[10px] font-medium">No Stamp</span>
            </div>
          )}
          {editing && (
            <div className="mt-2 text-center">
              <input ref={stampRef} type="file" accept="image/*" className="hidden" onChange={handleStampFile} />
              <button
                type="button"
                onClick={() => stampRef.current?.click()}
                className="text-xs text-orange-600 underline hover:text-orange-800 flex items-center gap-1 mx-auto"
              >
                <Upload className="w-3 h-3" />
                {company.stampUrl ? "Replace Stamp" : "Upload Stamp"}
              </button>
              {stampFile && (
                <p className="text-[10px] text-green-600 mt-0.5">{stampFile.name}</p>
              )}
            </div>
          )}
        </div>
        {/* Identity */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <EditField label="Unit Name" name="unitName" value={form.unitName || ""} onChange={handleChange} required />
              <EditField label="Company Name" name="name" value={form.name || ""} onChange={handleChange} required />
              <EditField label="Legal Name" name="legalName" value={form.legalName || ""} onChange={handleChange} />
              <div>
                <label className="text-xs font-medium text-gray-600">Company Type</label>
                <select name="companyType" value={form.companyType || ""} onChange={handleChange}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">— Select —</option>
                  {["Private Limited","Public Limited","LLP","Partnership","Proprietorship","OPC","Other"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-gray-800 truncate">{company.name || company.unitName}</h2>
              {company.legalName && <p className="text-sm text-gray-500">{company.legalName}</p>}
              <div className="flex flex-wrap gap-2 mt-2">
                {company.companyType && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{company.companyType}</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${company.isActive !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {company.isActive !== false ? "Active" : "Inactive"}
                </span>
              </div>
              {company.unitName && company.unitName !== company.name && (
                <p className="text-xs text-gray-400 mt-1">Unit: {company.unitName}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Contact & Location ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-700 text-sm">Contact Information</h3>
          </div>
          {editing ? (
            <div className="space-y-3">
              <EditField label="Mobile" name="mobile" value={form.mobile || ""} onChange={handleChange} />
              <EditField label="Email" name="email" type="email" value={form.email || ""} onChange={handleChange} />
              <EditField label="Website" name="website" value={form.website || ""} onChange={handleChange} />
            </div>
          ) : (
            <div className="space-y-3">
              <InfoRow label="Mobile" value={company.mobile} />
              <InfoRow label="Email" value={company.email} />
              <InfoRow label="Website" value={company.website} />
            </div>
          )}
        </div>

        {/* Location */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-700 text-sm">Location</h3>
          </div>
          {editing ? (
            <div className="space-y-3">
              <EditField label="Address" name="address" type="textarea" value={form.address || ""} onChange={handleChange} />
              <div className="grid grid-cols-3 gap-2">
                <EditField label="PIN Code" name="locationPin" value={form.locationPin || ""} onChange={handleChange} />
                <EditField label="City" name="city" value={form.city || ""} onChange={handleChange} required />
                <EditField label="State" name="state" value={form.state || ""} onChange={handleChange} required />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <InfoRow label="Address" value={company.address} />
              <div className="grid grid-cols-3 gap-2">
                <InfoRow label="PIN" value={company.locationPin} />
                <InfoRow label="City" value={company.city} />
                <InfoRow label="State" value={company.state} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Legal Information ────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-700 text-sm">Legal Information</h3>
        </div>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EditField label="PAN Number" name="pan" value={form.pan || ""} onChange={handleChange} />
            <EditField label="GST Number" name="gst" value={form.gst || ""} onChange={handleChange} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="PAN Number" value={company.pan} />
            <InfoRow label="GST Number" value={company.gst} />
          </div>
        )}
      </div>

      {/* ── Cash Password ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Lock className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-700 text-sm">Cash Password</h3>
          </div>
          {!editingCashPwd && (
            <button
              type="button"
              onClick={() => { setCashPwdInput(""); setEditingCashPwd(true); }}
              className="flex items-center gap-1.5 text-xs text-orange-600 border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition font-medium"
            >
              <Edit2 className="w-3.5 h-3.5" />
              {cashPwd?.isSet ? "Change Password" : "Set Password"}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-4">
          A 6-digit password only you (the Company Admin) know. Accounts must enter it — plus a one-time
          code emailed to you — before they can view any customer's collected Cash Amount.
        </p>

        {!editingCashPwd ? (
          cashPwd?.isSet ? (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-bold tracking-[0.4em] text-gray-800">
                {showCashPwd ? cashPwd.password : "••••••"}
              </span>
              <button
                type="button"
                onClick={() => setShowCashPwd((s) => !s)}
                className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
                title={showCashPwd ? "Hide" : "View"}
              >
                {showCashPwd ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-gray-500" />}
              </button>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Set
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">Not set yet. Click "Set Password" to create one.</p>
          )
        ) : (
          <div className="space-y-3">
            <SixDigitInput value={cashPwdInput} onChange={setCashPwdInput} />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveCashPwd}
                disabled={cashPwdInput.length !== 6 || savingCashPwd}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all active:scale-95 shadow-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingCashPwd ? "Saving…" : "Save Password"}
              </button>
              <button
                type="button"
                onClick={() => { setEditingCashPwd(false); setCashPwdInput(""); }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Social & Online Presence ─────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
              <Globe className="w-4 h-4 text-pink-600" />
            </div>
            <h3 className="font-semibold text-gray-700 text-sm">Online Presence & Social Links</h3>
          </div>
          {editing && (
            <button
              type="button"
              onClick={addSocialLink}
              className="flex items-center gap-1.5 text-xs text-orange-600 border border-orange-300 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add Link
            </button>
          )}
        </div>

        {/* View mode */}
        {!editing && (
          <>
            {(!company.socialLinks || company.socialLinks.length === 0) ? (
              <p className="text-sm text-gray-400 italic">No social links added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {company.socialLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.type === "email" ? `mailto:${link.url}` : link.url}
                    target={link.type === "email" ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 group transition"
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition">
                      {SOCIAL_ICONS[link.type]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 capitalize">{link.label || link.type}</p>
                      <p className="text-sm text-blue-600 truncate">{link.url}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {/* Edit mode */}
        {editing && (
          <>
            {socialLinks.length === 0 && (
              <p className="text-sm text-gray-400 italic mb-3">No links yet. Click "Add Link" to add website, email, social profiles.</p>
            )}
            <div className="space-y-3">
              {socialLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {/* Type select */}
                  <select
                    value={link.type}
                    onChange={(e) => updateSocialLink(idx, "type", e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white w-32 flex-shrink-0"
                  >
                    {SOCIAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {/* Label (optional) */}
                  <input
                    type="text"
                    placeholder="Custom label (optional)"
                    value={link.label || ""}
                    onChange={(e) => updateSocialLink(idx, "label", e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-36 flex-shrink-0"
                  />
                  {/* URL */}
                  <input
                    type="text"
                    placeholder={link.type === "email" ? "contact@company.com" : "https://..."}
                    value={link.url}
                    onChange={(e) => updateSocialLink(idx, "url", e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 flex-1 min-w-0"
                  />
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeSocialLink(idx)}
                    className="w-7 h-7 flex-shrink-0 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center hover:bg-red-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Stamp (view mode only) ────────────────────────────────────────── */}
      {!editing && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-700 text-sm">Company Stamp / Seal</h3>
          </div>
          {stampSrc ? (
            <div className="flex items-center gap-4">
              <div className="w-32 h-24 border border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shadow-sm">
                <img src={stampSrc} alt="Stamp" className="max-w-full max-h-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Stamp uploaded
                </p>
                <p className="text-xs text-gray-400 mt-1">Click "Edit Details" to replace the stamp.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-32 h-24 border-2 border-dashed border-amber-200 rounded-xl bg-amber-50 flex flex-col items-center justify-center gap-1 text-amber-400">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[10px] font-medium">No Stamp</span>
              </div>
              <p className="text-sm text-gray-500">
                No stamp uploaded yet.<br />
                <span className="text-orange-500 font-medium">Click "Edit Details" to upload your company stamp.</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
