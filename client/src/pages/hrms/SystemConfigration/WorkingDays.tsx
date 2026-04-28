/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import Loader from "@/pages/hrms/Loader";
import { toast } from "../../../hooks/use-toast";
import { Save, Calendar, Clock, List } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;

interface WorkingConfig {
    _id?: string;
    companyId: string;
    weeklyOff: {
        monday: string;
        tuesday: string;
        wednesday: string;
        thursday: string;
        friday: string;
        saturday: string;
        sunday: string;
    };
    officeTiming: {
        startTime: string;
        endTime: string;
        breakTime: string;
    };
}

interface Holiday {
    _id: string;
    title: string;
    date: string;
    day: string;
}

export default function WorkingDays() {
    const token = localStorage.getItem("token");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<WorkingConfig | null>(null);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch companies first to get a companyId if none is selected
            const companiesRes = await axios.get(`${API_BASE}/companies`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCompanies(companiesRes.data);

            const compId = selectedCompanyId || companiesRes.data[0]?._id;
            if (compId) {
                setSelectedCompanyId(compId);
                // Fetch Working Days Config
                try {
                    const configRes = await axios.get(`${API_BASE}/working-days/${compId}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    setConfig(configRes.data);
                } catch (err) {
                    // If not found, set a default template
                    setConfig({
                        companyId: compId,
                        weeklyOff: {
                            monday: "Working",
                            tuesday: "Working",
                            wednesday: "Working",
                            thursday: "Working",
                            friday: "Working",
                            saturday: "Half Day",
                            sunday: "OFF",
                        },
                        officeTiming: {
                            startTime: "09:30 AM",
                            endTime: "06:30 PM",
                            breakTime: "01:00 PM - 02:00 PM",
                        },
                    });
                }
            }

            // Fetch Holidays
            const holidaysRes = await axios.get(`${API_BASE}/holidays`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setHolidays(holidaysRes.data);

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedCompanyId]);

    const handleSave = async () => {
        if (!config || !selectedCompanyId) return;
        try {
            setSaving(true);
            await axios.post(`${API_BASE}/working-days`, { ...config, companyId: selectedCompanyId }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            toast({
                
                title: "Settings Saved",
                description: "Working Days configuration updated successfully",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: "Failed to update working days configuration",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Working Days & Office Timing</h1>
                    <p className="text-sm text-gray-500">System Configuration / Working Days</p>
                </div>
                <div className="flex items-center gap-4">
                    <select
                        value={selectedCompanyId}
                        onChange={(e) => setSelectedCompanyId(e.target.value)}
                        className="border rounded-md px-3 py-2 text-sm"
                    >
                        <option value="">Select Company</option>
                        {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600 shadow-sm transition-all disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* WEEKLY OFF */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4 text-orange-600">
                        <Calendar size={20} />
                        <h2 className="text-lg font-semibold text-gray-900">Weekly Off Settings</h2>
                    </div>
                    <div className="space-y-3">
                        {config && days.map((day) => (
                            <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="capitalize font-medium text-gray-700">{day}</span>
                                <select
                                    value={(config.weeklyOff as any)[day]}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        weeklyOff: { ...config.weeklyOff, [day]: e.target.value }
                                    })}
                                    className="bg-white border text-sm rounded-md px-3 py-1.5 focus:ring-2 focus:ring-orange-500 outline-none"
                                >
                                    <option value="Working">Working</option>
                                    <option value="Half Day">Half Day</option>
                                    <option value="OFF">Weekly OFF</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                {/* OFFICE TIMING */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-orange-600">
                            <Clock size={20} />
                            <h2 className="text-lg font-semibold text-gray-900">Office Timings</h2>
                        </div>
                        {config && (
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Start Time</label>
                                    <input
                                        type="text"
                                        value={config.officeTiming.startTime}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            officeTiming: { ...config.officeTiming, startTime: e.target.value }
                                        })}
                                        className="mt-1 w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder="e.g. 09:30 AM"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">End Time</label>
                                    <input
                                        type="text"
                                        value={config.officeTiming.endTime}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            officeTiming: { ...config.officeTiming, endTime: e.target.value }
                                        })}
                                        className="mt-1 w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder="e.g. 06:30 PM"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Break Time</label>
                                    <input
                                        type="text"
                                        value={config.officeTiming.breakTime}
                                        onChange={(e) => setConfig({
                                            ...config,
                                            officeTiming: { ...config.officeTiming, breakTime: e.target.value }
                                        })}
                                        className="mt-1 w-full border rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500"
                                        placeholder="e.g. 01:00 PM - 02:00 PM"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* HOLIDAY LIST */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2 text-orange-600">
                                <List size={20} />
                                <h2 className="text-lg font-semibold text-gray-900">Holiday Calendar</h2>
                            </div>
                            <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-1 rounded">2025-2026</span>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            {holidays.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">No holidays configured.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="text-left p-2 font-medium text-gray-600">Occasion</th>
                                            <th className="text-left p-2 font-medium text-gray-600">Date</th>
                                            <th className="text-left p-2 font-medium text-gray-600">Day</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holidays.map((h) => (
                                            <tr key={h._id} className="border-t hover:bg-gray-50 transition-colors">
                                                <td className="p-2 text-gray-700 font-medium">{h.title}</td>
                                                <td className="p-2 text-gray-500">{new Date(h.date).toLocaleDateString()}</td>
                                                <td className="p-2 text-gray-500">{h.day}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}



