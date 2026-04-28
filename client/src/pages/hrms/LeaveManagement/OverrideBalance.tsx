/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "../../Alert/Toast";
import Loader from "../../Loader";
import { Badge } from "@/components/ui/badge";
import { History, Save, UserCog } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;

interface UserRef {
    _id: string;
    name: string;
    employeeId: string;
    role?: string;
}

interface IAdjustment {
    _id: string;
    employee: UserRef;
    leaveType: string;
    oldBalance: number;
    newBalance: number;
    adjustment: number;
    reason: string;
    addedBy: UserRef;
    createdAt: string;
}

const OverrideBalance = () => {
    const [employees, setEmployees] = useState<UserRef[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [history, setHistory] = useState<IAdjustment[]>([]);

    const [form, setForm] = useState({
        employeeId: "",
        leaveType: "",
        currentBalance: 0,
        newBalance: "",
        reason: "",
    });

    const fetchInitialData = async () => {
        try {
            const [empRes, typeRes, histRes] = await Promise.all([
                axios.get(`${API_BASE}/users`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                }),
                axios.get(`${API_BASE}/leave-types`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                }),
                axios.get(`${API_BASE}/leave-balance-adjustments/history`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                }),
            ]);
            setEmployees(empRes.data.users || empRes.data);
            setLeaveTypes(typeRes.data);
            setHistory(histRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Fetch current balance when employee or leave type changes
    useEffect(() => {
        const fetchBalance = async () => {
            if (form.employeeId && form.leaveType) {
                try {
                    const res = await axios.get(
                        `${API_BASE}/leave-balance-adjustments/current?employeeId=${form.employeeId}&leaveType=${form.leaveType}`,
                        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
                    );
                    setForm((prev) => ({ ...prev, currentBalance: res.data.balance }));
                } catch (err) {
                    console.error(err);
                }
            }
        };
        fetchBalance();
    }, [form.employeeId, form.leaveType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.employeeId || !form.leaveType || !form.newBalance || !form.reason) {
            toast({
                type: "error",
                title: "Missing Fields",
                message: "Please fill in all mandatory fields.",
            });
            return;
        }

        try {
            setActionLoading(true);
            const res = await axios.post(
                `${API_BASE}/leave-balance-adjustments/override`,
                {
                    employeeId: form.employeeId,
                    leaveType: form.leaveType,
                    newBalance: Number(form.newBalance),
                    reason: form.reason,
                },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );

            toast({
                type: "success",
                title: "Balance Overridden",
                message: res.data?.message || "Employee leave balance has been manually updated.",
            });

            // Reset form and refresh history
            setForm({ ...form, newBalance: "", reason: "", currentBalance: Number(form.newBalance) });
            const histRes = await axios.get(`${API_BASE}/leave-balance-adjustments/history`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setHistory(histRes.data);
        } catch (error: any) {
            toast({
                type: "error",
                title: "Override Failed",
                message: error?.response?.data?.message || "Something went wrong.",
            });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Override Leave Balance</h1>
                    <p className="text-sm text-gray-500">Manual adjustment of employee leave quotas (HR Privilege)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORM SECTION */}
                <Card className="lg:col-span-1 border-none shadow-sm bg-white h-fit">
                    <CardHeader className="pb-4 border-b">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <UserCog size={20} className="text-orange-600" />
                            Adjustment Form
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label>Select Employee *</Label>
                                <Select
                                    value={form.employeeId}
                                    onValueChange={(v) => setForm({ ...form, employeeId: v })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map((emp) => (
                                            <SelectItem key={emp._id} value={emp._id}>
                                                {emp.name} ({emp.employeeId})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Leave Type *</Label>
                                <Select
                                    value={form.leaveType}
                                    onValueChange={(v) => setForm({ ...form, leaveType: v })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Choose leave type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {leaveTypes.map((type) => (
                                            <SelectItem key={type._id} value={type.name}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {form.employeeId && form.leaveType && (
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">Current System Balance</p>
                                    <p className="text-2xl font-black text-gray-900">{form.currentBalance} Days</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>New Manual Balance *</Label>
                                <Input
                                    type="number"
                                    placeholder="Enter target balance days"
                                    value={form.newBalance}
                                    onChange={(e) => setForm({ ...form, newBalance: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Reason for Override *</Label>
                                <Textarea
                                    placeholder="e.g. Data correction from legacy system or special approval"
                                    rows={4}
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    className="resize-none"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2 shadow-lg shadow-orange-100"
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Processing..." : <><Save size={18} /> Save Override</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* HISTORY SECTION */}
                <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden flex flex-col h-[700px]">
                    <CardHeader className="pb-4 border-b">
                        <CardTitle className="text-lg font-medium flex items-center gap-2">
                            <History size={20} className="text-gray-400" />
                            Adjustment Logs (Audit)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="bg-gray-50/50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Leave Type</TableHead>
                                    <TableHead className="text-center">Old → New</TableHead>
                                    <TableHead className="text-center">Adjustment</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>By (Admin)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-gray-400 italic">
                                            No override logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    history.map((log) => (
                                        <TableRow key={log._id} className="hover:bg-gray-50/30 transition-colors">
                                            <TableCell>
                                                <div className="font-medium text-gray-900">{log.employee?.name}</div>
                                                <div className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleDateString()}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {log.leaveType.toLowerCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-sm">
                                                {log.oldBalance} → <span className="font-bold text-orange-600">{log.newBalance}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={log.adjustment > 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}>
                                                    {log.adjustment > 0 ? "+" : ""}{log.adjustment}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate text-xs italic text-gray-600">
                                                {log.reason}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium">{log.addedBy?.name}</div>
                                                <div className="text-[10px] text-gray-400 uppercase">{log.addedBy?.role}</div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default OverrideBalance;
