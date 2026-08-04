/** @format */
import { useEffect, useState } from "react";
import axios from "axios";
import { Percent, Save, Search } from "lucide-react";
import { toast } from "../../Alert/Toast";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface PricingItem {
  _id: string;
  code: string;
  name: string;
  category?: string;
  subCategory?: string;
  unit?: string;
  costSource: "Manual" | "BOM" | "Purchase";
  stdCost?: number;
  purchaseCost?: number;
  mrp?: number;
  salePrice?: number;
  profitPercent?: number | null;
  discountPercent?: number | null;
}

const money = (n?: number) =>
  n != null ? `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—";

const resolvedCost = (item: PricingItem) => {
  if (item.costSource === "BOM") return item.stdCost || 0;
  if (item.costSource === "Purchase") return item.purchaseCost || 0;
  return null; // cost not resolved yet — R&D's manual mrp/salePrice stand
};

export default function PricingValue() {
  const token = localStorage.getItem("token");

  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { profitPercent: string; discountPercent: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/pricing-value/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list: PricingItem[] = res.data?.items || [];
      setItems(list);
      const nextDrafts: Record<string, { profitPercent: string; discountPercent: string }> = {};
      list.forEach((it) => {
        nextDrafts[it._id] = {
          profitPercent: it.profitPercent != null ? String(it.profitPercent) : "",
          discountPercent: it.discountPercent != null ? String(it.discountPercent) : "",
        };
      });
      setDrafts(nextDrafts);
    } catch {
      toast({ type: "error", title: "Error", message: "Failed to load items" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const setDraft = (id: string, field: "profitPercent" | "discountPercent", value: string) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [field]: value } }));
  };

  const saveItem = async (item: PricingItem) => {
    const draft = drafts[item._id];
    setSavingId(item._id);
    try {
      const res = await axios.put(
        `${API_BASE}/pricing-value/items/${item._id}`,
        {
          profitPercent: draft.profitPercent === "" ? null : Number(draft.profitPercent),
          discountPercent: draft.discountPercent === "" ? null : Number(draft.discountPercent),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updated: PricingItem = res.data?.item;
      setItems((prev) => prev.map((it) => (it._id === item._id ? updated : it)));
      setDrafts((d) => ({
        ...d,
        [item._id]: {
          profitPercent: updated.profitPercent != null ? String(updated.profitPercent) : "",
          discountPercent: updated.discountPercent != null ? String(updated.discountPercent) : "",
        },
      }));
      toast({ type: "success", title: "Saved", message: `Pricing updated for ${item.code}` });
    } catch (err: any) {
      toast({ type: "error", title: "Save Failed", message: err?.response?.data?.message || "Could not save pricing" });
    } finally {
      setSavingId(null);
    }
  };

  const filtered = items.filter((it) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return it.code?.toLowerCase().includes(q) || it.name?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Pricing Value</h1>
        <p className="text-sm text-gray-500 mt-0.5">Company Admin / Pricing Value</p>
      </div>

      {/* ── Explanation ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Percent className="w-4 h-4 text-amber-600" />
          </div>
          <h3 className="font-semibold text-gray-700 text-sm">Pricing Rules — per Item</h3>
        </div>
        <p className="text-xs text-gray-500">
          Only items your company actually sells are shown here — the same list that appears in the
          "Product / Service Required" dropdown when Sales adds a new Lead.
          Once an item's real cost is known — from its Bill of Materials (once built) or an actual purchase
          price (once purchased) — MRP and Sale Price are calculated automatically using{" "}
          <span className="font-medium text-gray-700">that item's own</span> Profit%/Discount%:
          MRP = Cost + Profit%, Sale Price = Cost − Discount%. Items with no Profit%/Discount% set are treated
          as 0% — MRP and Sale Price simply show cost.
        </p>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by item code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />
      </div>

      {/* ── Items Table ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 italic p-6 text-center">
            {items.length === 0
              ? "No sellable items found. Items appear here once added to Inventory as type \"Product\"."
              : "No items match your search."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Item Code</th>
                <th className="px-4 py-3 text-left">Item Name</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-center">Profit %</th>
                <th className="px-4 py-3 text-center">Discount %</th>
                <th className="px-4 py-3 text-right">MRP</th>
                <th className="px-4 py-3 text-right">Sale Price (MSP)</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const cost = resolvedCost(item);
                const draft = drafts[item._id] || { profitPercent: "", discountPercent: "" };
                return (
                  <tr key={item._id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium text-gray-800">{item.code}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.name}
                      {!cost && (
                        <span className="block text-[11px] text-gray-400 italic mt-0.5">
                          Cost not resolved yet — MRP/Sale Price will update once known
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{cost != null ? money(cost) : "—"}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        placeholder="0"
                        value={draft.profitPercent}
                        onChange={(e) => setDraft(item._id, "profitPercent", e.target.value)}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="0"
                        value={draft.discountPercent}
                        onChange={(e) => setDraft(item._id, "discountPercent", e.target.value)}
                        className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{money(item.mrp)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{money(item.salePrice)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => saveItem(item)}
                        disabled={savingId === item._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition disabled:opacity-50 mx-auto"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingId === item._id ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
