/** @format */
// Choose one person by typing (2026-11-11). Asks the server each time, so it finds
// anyone in the company. A plain dropdown of /users only ever held the 15 newest.
import { useEffect, useState } from "react";
import axios from "axios";

export interface PickedPerson {
  _id: string;
  fullName?: string;
  username?: string;
  employeeId?: string;
  role?: string;
  canLogin?: boolean;
}

interface Props {
  value: PickedPerson | null;
  onChange: (p: PickedPerson | null) => void;
  placeholder?: string;
}

const API_BASE = import.meta.env.VITE_API_URL;
export const personName = (p?: PickedPerson | null) => p?.fullName || p?.username || "No name";

export default function PersonPicker({ value, onChange, placeholder = "Type a name, Employee ID or device code..." }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedPerson[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (value || query.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await axios.get(`${API_BASE}/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          params: { search: query.trim(), limit: 8, page: 1 },
        });
        const list = res.data?.users || res.data?.data?.users || [];
        setResults(Array.isArray(list) ? list : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, value]);

  if (value) {
    return (
      <div className="flex items-center justify-between border rounded-md px-3 py-2 text-sm bg-white">
        <span>
          <span className="font-medium">{personName(value)}</span>
          <span className="text-xs text-gray-500 ml-2">{[value.employeeId, value.role].filter(Boolean).join(" · ")}</span>
        </span>
        <button type="button" className="text-xs text-blue-600" onClick={() => { onChange(null); setQuery(""); }}>Change</button>
      </div>
    );
  }

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full border px-3 py-2 rounded text-sm outline-none focus:border-orange-500"
      />
      {query.trim().length >= 2 && (
        <div className="border rounded-md mt-1 divide-y max-h-56 overflow-y-auto bg-white">
          {searching && results.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">Searching...</p>}
          {!searching && results.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">No one matches.</p>}
          {results.map((p) => (
            <button
              key={p._id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => { onChange(p); setResults([]); }}
            >
              <span className="font-medium">{personName(p)}</span>
              <span className="text-xs text-gray-500 ml-2">
                {[p.employeeId, p.role, p.canLogin === false ? "no login" : ""].filter(Boolean).join(" · ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
