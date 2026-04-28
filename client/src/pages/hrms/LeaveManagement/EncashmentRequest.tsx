/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Eye } from "lucide-react";
import Loader from "../../Loader";
import { toast } from "../../Alert/Toast";

const API_BASE = import.meta.env.VITE_API_URL;

interface User {
    _id: string;
    name: string;
    employeeId: string;
}

interface LeaveEncashment {
    _id: string;
    employee: User;
    leaveType: string;
    requestedDays: number;
    perDayRate: number;
    totalAmount: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    requestDate: string;
    payrollMonth?: string;
}

const EncashmentRequest = () => {
    const token = localStorage.getItem("token");

    const [requests, setRequests] = useState<LeaveEncashment[]>([]);
    const [selected, setSelected] = useState<LeaveEncashment | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    /* ================= FETCH ALL ENCASHMENT REQUESTS ================= */
    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/leave-encashment`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setRequests(res.data || []);
        } catch (err) {
            console.error("Failed to fetch requests");
            toast({
                type: "error",
                title: "Fetch Failed",
                message: "Unable to load leave encashment requests.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    /* ================= STATUS UPDATE ================= */
    const handleStatusChange = async (id: string, status: "APPROVED" | "REJECTED") => {
        try {
            setActionLoading(true);

            const res = await axios.put(
                `${API_BASE}/leave-encashment/${id}/status`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast({
                type: "success",
                title: status === "APPROVED" ? "Request Approved" : "Request Rejected",
                message: res.data?.message || `Request has been ${status.toLowerCase()} successfully.`,
            });

            fetchRequests();
        } catch (error: any) {
            toast({
                type: "error",
                title: "Action Failed",
                message: error?.response?.data?.message || "Something went wrong. Please try again.",
            });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="p-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-800">Leave Encashment Requests</h1>
                            <p className="text-sm text-gray-500 mt-1">Review and manage employee leave encashment requests</p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <Table>
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead>Employee</TableHead>
                                <TableHead>Leave Type</TableHead>
                                <TableHead>Days</TableHead>
                                <TableHead>Total Amount</TableHead>
                                <TableHead>Request Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {requests.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-20 text-gray-500">
                                        No leave encashment requests found
                                    </TableCell>
                                </TableRow>
                            )}

                            {requests.map((req) => (
                                <TableRow key={req._id} className="hover:bg-gray-50 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-orange-600">{req.employee?.name}</span>
                                            <span className="text-xs text-gray-400">{req.employee?.employeeId}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell>{req.leaveType}</TableCell>
                                    <TableCell>{req.requestedDays} days</TableCell>
                                    <TableCell className="font-semibold">₹{req.totalAmount}</TableCell>
                                    <TableCell>{new Date(req.requestDate).toLocaleDateString("en-GB")}</TableCell>

                                    <TableCell>
                                        {req.status === "PENDING" ? (
                                            <select
                                                className="px-3 py-1 rounded text-sm font-medium
                          bg-yellow-50 text-yellow-700 border border-yellow-200
                          focus:outline-none cursor-pointer hover:bg-yellow-100 transition-colors"
                                                disabled={actionLoading}
                                                defaultValue="PENDING"
                                                onChange={(e) =>
                                                    handleStatusChange(
                                                        req._id,
                                                        e.target.value as "APPROVED" | "REJECTED",
                                                    )
                                                }
                                            >
                                                <option value="PENDING" disabled>
                                                    PENDING
                                                </option>
                                                <option value="APPROVED">APPROVE</option>
                                                <option value="REJECTED">REJECT</option>
                                            </select>
                                        ) : (
                                            <Badge
                                                className={
                                                    req.status === "APPROVED"
                                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                                        : "bg-rose-100 text-rose-700 hover:bg-rose-100"
                                                }
                                            >
                                                {req.status}
                                            </Badge>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-gray-400 hover:text-primary hover:bg-primary/5"
                                            onClick={() => setSelected(req)}
                                        >
                                            <Eye size={18} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ================= VIEW DIALOG ================= */}
            <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold border-b pb-2">Encashment Details</DialogTitle>
                    </DialogHeader>

                    {selected && (
                        <div className="space-y-4 pt-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Employee</label>
                                    <p className="font-semibold text-gray-800">{selected.employee.name}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Employee ID</label>
                                    <p className="text-gray-700">{selected.employee.employeeId}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Leave Type</label>
                                    <p className="text-gray-700">{selected.leaveType}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Requested Days</label>
                                    <p className="text-gray-700">{selected.requestedDays} Days</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Per Day Rate</label>
                                    <p className="text-gray-700">₹{selected.perDayRate}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total Amount</label>
                                    <p className="font-bold text-lg text-emerald-600">₹{selected.totalAmount}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Request Date</label>
                                    <p className="text-gray-700">{new Date(selected.requestDate).toLocaleDateString("en-GB")}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Payroll Month</label>
                                    <p className="text-blue-600 font-medium">
                                        {selected.payrollMonth ? (
                                            new Date(selected.payrollMonth + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" })
                                        ) : (
                                            "Not yet assigned"
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t">
                                <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Status</label>
                                <div className="mt-1">
                                    <Badge
                                        className={
                                            selected.status === "APPROVED"
                                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                : selected.status === "REJECTED"
                                                    ? "bg-rose-100 text-rose-700 border-rose-200"
                                                    : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                        }
                                    >
                                        {selected.status}
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex justify-end pt-6">
                                <Button onClick={() => setSelected(null)} variant="secondary" className="px-8">
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EncashmentRequest;
