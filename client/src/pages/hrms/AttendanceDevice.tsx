/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { AlertCircle, CheckCircle2, Download, Link2, RefreshCw } from "lucide-react";
import Loader from "./Loader";
import { toast } from "@/pages/Alert/Toast";
import { useAuth } from "@/hooks/useAuth";

const API = import.meta.env.VITE_API_URL;

interface Status {
  loginSaved: boolean;
  loginRefused: boolean;
  syncFrom: string | null;
  lastSyncAt: string | null;
  lastError: string;
  lastErrorAt: string | null;
  unknownStatuses: string[];
}

interface Unmatched {
  code: string;
  name: string;
  days: number;
  lastSeen: string | null;
}

interface Person {
  _id: string;
  fullName?: string;
  employeeId?: string;
}

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const errorText = (err: any, fallback: string) => err?.response?.data?.message || fallback;
const thisMonth = () => new Date().toISOString().slice(0, 7);

// One unmatched code: HR finds the person, searching on the server.
function UnmatchedRow({ row, onLinked }: { row: Unmatched; onLinked: () => void }) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Person[]>([]);
  const [picked, setPicked] = useState<Person | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (picked || !search.trim()) {
      setOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/users`, {
          headers: headers(),
          params: { search: search.trim(), deviceCode: "none", limit: 8, page: 1 },
        });
        const list = res.data?.data?.users || res.data?.users || [];
        setOptions(Array.isArray(list) ? list : []);
      } catch {
        setOptions([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, picked]);

  const link = async () => {
    if (!picked) return;
    try {
      setSaving(true);
      const res = await axios.post(`${API}/attendance-device/link`, { code: row.code, userId: picked._id }, { headers: headers() });
      toast({ type: "success", title: "Code Linked", message: `${res.data?.filled || 0} day(s) of attendance filled in.` });
      onLinked();
    } catch (err) {
      toast({ type: "error", title: "Could Not Link", message: errorText(err, "Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-t align-top">
      <td className="px-4 py-3 font-mono text-sm">{row.code}</td>
      <td className="px-4 py-3 text-sm">{row.name || "—"}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{row.lastSeen || "Never punched"}</td>
      <td className="px-4 py-3 text-sm text-gray-600">{row.days}</td>
      <td className="px-4 py-3">
        {/* The results sit under the box as a plain list, not floating: the table
            scrolls sideways, which clipped a floating list into a tiny box. */}
        <div className="w-72">
          {picked ? (
            <div className="flex items-center justify-between border rounded px-3 py-2 text-sm bg-gray-50">
              <span>{picked.fullName} <span className="text-gray-400">{picked.employeeId}</span></span>
              <button className="text-xs text-blue-600" onClick={() => { setPicked(null); setSearch(""); }}>Change</button>
            </div>
          ) : (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or Employee ID"
              className="w-full border rounded px-3 py-2 text-sm"
            />
          )}
          {options.length > 0 && (
            <div className="mt-1 w-full bg-white border rounded shadow-sm divide-y">
              {options.map((p) => (
                <button
                  key={p._id}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => { setPicked(p); setOptions([]); }}
                >
                  {p.fullName} <span className="text-gray-400">{p.employeeId}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={link}
          disabled={!picked || saving}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded bg-[#49A7F5] text-white disabled:opacity-40"
        >
          <Link2 size={13} /> {saving ? "Linking..." : "Link"}
        </button>
      </td>
    </tr>
  );
}

export default function AttendanceDevice() {
  const { user } = useAuth();
  const isCompanyAdmin = user?.role === "Company Admin";

  const [status, setStatus] = useState<Status | null>(null);
  const [unmatched, setUnmatched] = useState<Unmatched[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [month, setMonth] = useState(thisMonth());
  const [login, setLogin] = useState({ corporateId: "", username: "", password: "", syncFrom: "" });

  const load = async () => {
    try {
      const [s, u] = await Promise.all([
        axios.get(`${API}/attendance-device/status`, { headers: headers() }),
        axios.get(`${API}/attendance-device/unmatched`, { headers: headers() }),
      ]);
      setStatus(s.data?.data || null);
      setUnmatched(Array.isArray(u.data?.data) ? u.data.data : []);
    } catch (err) {
      toast({ type: "error", title: "Could Not Load", message: errorText(err, "Please try again.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (name: string, call: () => Promise<any>, done: (data: any) => string) => {
    try {
      setBusy(name);
      const res = await call();
      toast({ type: "success", title: "Done", message: done(res.data) });
      await load();
    } catch (err) {
      toast({ type: "error", title: "Failed", message: errorText(err, "Please try again.") });
      await load();
    } finally {
      setBusy("");
    }
  };

  const syncNow = () => act("sync", () => axios.post(`${API}/attendance-device/sync`, {}, { headers: headers() }),
    (d) => `${d.punches || 0} new punch(es), ${d.attendance || 0} attendance day(s) updated.`);
  const redownload = () => act("redownload", () => axios.post(`${API}/attendance-device/redownload`, { month }, { headers: headers() }),
    (d) => `${d.punches || 0} new, ${d.removed || 0} removed, ${d.attendance || 0} attendance day(s) updated.`);
  const test = () => act("test", () => axios.post(`${API}/attendance-device/test`, login, { headers: headers() }),
    (d) => `Connected. ${d.rows || 0} row(s) for today.`);
  const save = () => act("save", async () => {
    const res = await axios.put(`${API}/attendance-device/login`, login, { headers: headers() });
    setLogin({ corporateId: "", username: "", password: "", syncFrom: "" });
    return res;
  }, () => "Login saved. It won't be shown again.");

  if (loading) return <Loader />;

  const canRun = !!status?.loginSaved && !status?.loginRefused;
  const button = "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md disabled:opacity-40";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Device</h1>
        <p className="text-sm text-gray-500 mt-0.5">Punches from the attendance device become attendance for anyone with a Device Code.</p>
      </div>

      <div className="bg-white border rounded-xl shadow-sm p-5 space-y-3">
        {status?.loginRefused ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-red-600">
            <AlertCircle size={16} /> The device refused this login, so the sync has stopped. Company Admin needs to save the login again.
          </p>
        ) : status?.loginSaved ? (
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Connected. Syncs every 15 minutes.</p>
        ) : (
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-500"><AlertCircle size={16} /> No device login saved yet, so nothing is downloading.</p>
        )}
        <div className="text-sm text-gray-600 space-y-0.5">
          <p>Last sync: {status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"}</p>
          {status?.syncFrom && <p>Attendance built from: {status.syncFrom}</p>}
          {status?.lastError && !status.loginRefused && <p className="text-red-600">Last error: {status.lastError}</p>}
        </div>
        <div className="flex items-center gap-3 flex-wrap pt-2">
          <button onClick={syncNow} disabled={!canRun || !!busy} className={`${button} bg-[#49A7F5] text-white`}>
            <RefreshCw size={14} /> {busy === "sync" ? "Syncing..." : "Sync Now"}
          </button>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
          <button onClick={redownload} disabled={!canRun || !!busy || !month} className={`${button} border text-gray-700`}>
            <Download size={14} /> {busy === "redownload" ? "Downloading..." : "Re-download Month"}
          </button>
          <span className="text-xs text-gray-400">Use before a payroll run, to pick up late corrections.</span>
        </div>
      </div>

      {(status?.unknownStatuses?.length || 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          The device sent statuses we don't know yet: <span className="font-semibold">{status?.unknownStatuses.join(", ")}</span>. Those days count as present if there are punches, otherwise absent.
        </div>
      )}

      <div className="bg-white border rounded-xl shadow-sm">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-gray-900">Codes matching nobody</h2>
          <p className="text-xs text-gray-500 mt-0.5">Link each to a person. Their days fill in from their joining date.</p>
        </div>
        {unmatched.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-400">Every code on the device is linked to someone.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name on device</th>
                  <th className="px-4 py-3">Last punched</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Person</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {unmatched.map((row) => <UnmatchedRow key={row.code} row={row} onLinked={load} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCompanyAdmin && (
        <div className="bg-white border rounded-xl shadow-sm p-5 space-y-4 max-w-2xl">
          <div>
            <h2 className="font-semibold text-gray-900">Device login</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {status?.loginSaved ? "A login is saved. It's stored encrypted and isn't shown again; enter all three to replace it." : "Stored encrypted, and not shown again once saved."}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <label className="block">Corporate ID
              <input value={login.corporateId} autoComplete="off" onChange={(e) => setLogin({ ...login, corporateId: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
            </label>
            <label className="block">Username
              <input value={login.username} autoComplete="off" onChange={(e) => setLogin({ ...login, username: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
            </label>
            <label className="block">Password
              <input type="password" value={login.password} autoComplete="new-password" onChange={(e) => setLogin({ ...login, password: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
            </label>
            <label className="block">Build attendance from
              <input type="date" value={login.syncFrom} onChange={(e) => setLogin({ ...login, syncFrom: e.target.value })} className="mt-1 w-full border rounded px-3 py-2" />
              <span className="text-xs text-gray-400">Leave blank for today.</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={test} disabled={!!busy || (!status?.loginSaved && !(login.corporateId && login.username && login.password))} className={`${button} border text-gray-700`}>
              {busy === "test" ? "Testing..." : "Test Connection"}
            </button>
            <button onClick={save} disabled={!!busy || !(login.corporateId && login.username && login.password)} className={`${button} bg-orange-500 text-white`}>
              {busy === "save" ? "Saving..." : "Save Login"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
