import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Filter,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Package,
  AlertTriangle,
  RefreshCcw,
  Search,
  User,
  ChevronDown,
  Factory,
  History
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// Dummy production history data (10 entries)
const dummyHistoryData = [
  {
    id: "HIST-001",
    date: "2025-01-11",
    product: "Steel Rods 12mm",
    producedQty: 500,
    damageQty: 12,
    shift: "Morning",
    operator: "John Smith",
    quality: "A-Grade",
    status: "Completed",
    submittedBy: "John Smith",
    submittedAt: "2025-01-11T09:30:00Z",
    image: null,
  },
  {
    id: "HIST-002",
    date: "2025-01-11",
    product: "Aluminum Sheets",
    producedQty: 250,
    damageQty: 8,
    shift: "Evening",
    operator: "Sarah Johnson",
    quality: "A-Grade",
    status: "Completed",
    submittedBy: "Sarah Johnson",
    submittedAt: "2025-01-11T18:45:00Z",
    image: null,
  },
  {
    id: "HIST-003",
    date: "2025-01-10",
    product: "Copper Pipes",
    producedQty: 180,
    damageQty: 15,
    shift: "Night",
    operator: "Mike Davis",
    quality: "B-Grade",
    status: "Completed",
    submittedBy: "Mike Davis",
    submittedAt: "2025-01-10T23:15:00Z",
    image: null,
  },
  {
    id: "HIST-004",
    date: "2025-01-10",
    product: "Metal Sheets 2mm",
    producedQty: 300,
    damageQty: 5,
    shift: "Morning",
    operator: "Emily Brown",
    quality: "A-Grade",
    status: "Completed",
    submittedBy: "Emily Brown",
    submittedAt: "2025-01-10T10:20:00Z",
    image: null,
  },
  {
    id: "HIST-005",
    date: "2025-01-09",
    product: "Pipe Fittings",
    producedQty: 420,
    damageQty: 18,
    shift: "Evening",
    operator: "David Wilson",
    quality: "A-Grade",
    status: "Approved",
    submittedBy: "David Wilson",
    submittedAt: "2025-01-09T19:10:00Z",
    image: null,
  },
  {
    id: "HIST-006",
    date: "2025-01-09",
    product: "Welding Rods",
    producedQty: 600,
    damageQty: 22,
    shift: "Morning",
    operator: "Lisa Garcia",
    quality: "B-Grade",
    status: "Completed",
    submittedBy: "Lisa Garcia",
    submittedAt: "2025-01-09T08:30:00Z",
    image: null,
  },
  {
    id: "HIST-007",
    date: "2025-01-08",
    product: "Steel Angles",
    producedQty: 150,
    damageQty: 3,
    shift: "Night",
    operator: "Robert Taylor",
    quality: "A-Grade",
    status: "Completed",
    submittedBy: "Robert Taylor",
    submittedAt: "2025-01-08T22:45:00Z",
    image: null,
  },
  {
    id: "HIST-008",
    date: "2025-01-08",
    product: "Concrete Mixers",
    producedQty: 45,
    damageQty: 2,
    shift: "Morning",
    operator: "Jennifer Lee",
    quality: "A-Grade",
    status: "Completed",
    submittedBy: "Jennifer Lee",
    submittedAt: "2025-01-08T11:15:00Z",
    image: null,
  },
  {
    id: "HIST-009",
    date: "2025-01-07",
    product: "Industrial Bolts",
    producedQty: 800,
    damageQty: 35,
    shift: "Evening",
    operator: "Kevin Martinez",
    quality: "B-Grade",
    status: "Completed",
    submittedBy: "Kevin Martinez",
    submittedAt: "2025-01-07T20:30:00Z",
    image: null,
  },
  {
    id: "HIST-010",
    date: "2025-01-07",
    product: "Custom Brackets",
    producedQty: 120,
    damageQty: 7,
    shift: "Morning",
    operator: "Amanda Clark",
    quality: "A-Grade",
    status: "Completed",
    submittedBy: "Amanda Clark",
    submittedAt: "2025-01-07T09:45:00Z",
    image: null,
  },
];

// Get production submissions from localStorage or use dummy data
const useProductionSubmissions = () => {
  const [submissions, setSubmissions] = useState(() => {
    const saved = localStorage.getItem("productionSubmissions");
    return saved ? JSON.parse(saved) : dummyHistoryData;
  });

  const updateSubmissions = (newSubmissions) => {
    setSubmissions(newSubmissions);
    localStorage.setItem(
      "productionSubmissions",
      JSON.stringify(newSubmissions),
    );
  };

  return [submissions, updateSubmissions];
};

export default function ProductionHistoryPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useProductionSubmissions();
  const [filters, setFilters] = useState({
    fromDate: "",
    toDate: "",
    product: "all",
  });
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [dialogMode, setDialogMode] = useState(""); // 'view', 'edit'
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editFormData, setEditFormData] = useState({
    product: "",
    producedQty: "",
    damageQty: "",
    date: "",
    image: null,
  });

  const itemsPerPage = 10;

  // Get unique products for filter dropdown
  const uniqueProducts = useMemo(() => {
    const products = [...new Set(submissions.map((sub) => sub.product))];
    return products;
  }, [submissions]);

  // Filter submissions based on date range and product
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((submission) => {
      const submissionDate = new Date(submission.date);
      const fromDate = filters.fromDate ? new Date(filters.fromDate) : null;
      const toDate = filters.toDate ? new Date(filters.toDate) : null;

      const dateMatch =
        (!fromDate || submissionDate >= fromDate) &&
        (!toDate || submissionDate <= toDate);
      const productMatch =
        filters.product === "all" || submission.product === filters.product;

      return dateMatch && productMatch;
    });
  }, [submissions, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleView = (submission) => {
    setSelectedSubmission(submission);
    setDialogMode("view");
    setIsDialogOpen(true);
  };

  const handleEdit = (submission) => {
    setSelectedSubmission(submission);
    setEditFormData({
      product: submission.product,
      producedQty: submission.producedQty.toString(),
      damageQty: submission.damageQty.toString(),
      date: submission.date,
      image: submission.image,
    });
    setDialogMode("edit");
    setIsDialogOpen(true);
  };

  const handleDelete = (submissionId) => {
    if (window.confirm("Are you sure you want to delete this submission?")) {
      const updatedSubmissions = submissions.filter(
        (sub) => sub.id !== submissionId,
      );
      setSubmissions(updatedSubmissions);
    }
  };

  const handleUpdateSubmission = () => {
    const updatedSubmissions = submissions.map((sub) =>
      sub.id === selectedSubmission.id
        ? {
            ...sub,
            product: editFormData.product,
            producedQty: parseInt(editFormData.producedQty),
            damageQty: parseInt(editFormData.damageQty),
            date: editFormData.date,
            image: editFormData.image,
          }
        : sub,
    );
    setSubmissions(updatedSubmissions);
    setIsDialogOpen(false);
    setSelectedSubmission(null);
  };

  const clearFilters = () => {
    setFilters({
      fromDate: "",
      toDate: "",
      product: "all",
    });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-green-600 via-teal-600 to-green-800 rounded-xl p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
                <FileText className="h-8 w-8 sm:h-10 sm:w-10" />
                Production
              </h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    History <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuItem onClick={() => window.location.href = '/production'}>
                    <Factory className="mr-2 h-4 w-4" />
                    My Production
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/production/history'}>
                    <History className="mr-2 h-4 w-4" />
                    Submission History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-green-100 text-sm sm:text-base">
              Complete production records and submission history
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Badge
              variant="outline"
              className="border-white text-white bg-white/20 backdrop-blur-sm justify-center sm:justify-start"
            >
              <Package className="h-4 w-4 mr-2" />
              {filteredSubmissions.length} Records
            </Badge>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold w-full sm:w-auto"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={filters.fromDate}
                onChange={(e) =>
                  setFilters({ ...filters, fromDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={filters.toDate}
                onChange={(e) =>
                  setFilters({ ...filters, toDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="product">Product</Label>
              <Select
                value={filters.product}
                onValueChange={(value) =>
                  setFilters({ ...filters, product: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {uniqueProducts.map((product) => (
                    <SelectItem key={product} value={product}>
                      {product}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full sm:w-auto"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Production Submissions
              </CardTitle>
              <CardDescription>
                {filteredSubmissions.length} submission(s) found • Total
                produced:{" "}
                {filteredSubmissions
                  .reduce((sum, sub) => sum + sub.producedQty, 0)
                  .toLocaleString()}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Submissions Found
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                No production submissions match your current filters. Try
                adjusting your search criteria.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold whitespace-nowrap">
                        Submission ID
                      </TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">
                        Product
                      </TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">
                        Produced
                      </TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">
                        Damaged
                      </TableHead>
                      <TableHead className="font-semibold whitespace-nowrap hidden sm:table-cell">
                        Operator
                      </TableHead>
                      <TableHead className="font-semibold whitespace-nowrap hidden md:table-cell">
                        Quality
                      </TableHead>
                      <TableHead className="font-semibold whitespace-nowrap hidden lg:table-cell">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold whitespace-nowrap hidden xl:table-cell">
                        Submitted At
                      </TableHead>
                      <TableHead className="font-semibold whitespace-nowrap">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubmissions.map((submission) => (
                      <TableRow
                        key={submission.id}
                        className="hover:bg-gray-50"
                      >
                        <TableCell className="font-medium text-blue-600">
                          {submission.id}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {new Date(submission.date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {submission.product}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            {submission.producedQty.toLocaleString()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            {submission.damageQty}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="truncate max-w-24">
                              {submission.operator || submission.submittedBy}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge
                            variant="outline"
                            className={
                              submission.quality === "A-Grade"
                                ? "bg-green-50 text-green-700"
                                : submission.quality === "B-Grade"
                                  ? "bg-yellow-50 text-yellow-700"
                                  : "bg-red-50 text-red-700"
                            }
                          >
                            {submission.quality || "A-Grade"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge
                            variant="outline"
                            className={
                              submission.status === "Completed"
                                ? "bg-green-50 text-green-700"
                                : submission.status === "Approved"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-orange-50 text-orange-700"
                            }
                          >
                            {submission.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 hidden xl:table-cell">
                          {new Date(submission.submittedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleView(submission)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(submission)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(submission.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredSubmissions.length,
                    )}{" "}
                    of {filteredSubmissions.length} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "view" ? "View Submission" : "Edit Submission"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "view"
                ? "Production submission details"
                : "Update production submission information"}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4">
              {dialogMode === "view" ? (
                // View Mode
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <p className="mt-1 text-sm">
                      {new Date(selectedSubmission.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label>Product</Label>
                    <p className="mt-1 text-sm font-medium">
                      {selectedSubmission.product}
                    </p>
                  </div>
                  <div>
                    <Label>Produced Quantity</Label>
                    <p className="mt-1 text-sm text-green-600 font-medium">
                      {selectedSubmission.producedQty}
                    </p>
                  </div>
                  <div>
                    <Label>Damage Quantity</Label>
                    <p className="mt-1 text-sm text-red-600 font-medium">
                      {selectedSubmission.damageQty}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label>Damage Image</Label>
                    {selectedSubmission.image ? (
                      <img
                        src={selectedSubmission.image}
                        alt="Damage"
                        className="mt-2 max-w-full h-48 object-contain border rounded cursor-pointer"
                        onClick={() => {
                          // Create modal for full image view
                          const modal = document.createElement("div");
                          modal.className =
                            "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4";
                          modal.innerHTML = `
                            <div class="relative max-w-4xl max-h-full">
                              <img src="${selectedSubmission.image}" alt="Full size damage image" class="max-w-full max-h-full object-contain" />
                              <button class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75">×</button>
                            </div>
                          `;
                          modal.onclick = (e) => {
                            if (
                              e.target === modal ||
                              e.target.tagName === "BUTTON"
                            ) {
                              document.body.removeChild(modal);
                            }
                          };
                          document.body.appendChild(modal);
                        }}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-400">
                        No image uploaded
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Submitted By</Label>
                    <p className="mt-1 text-sm">
                      {selectedSubmission.submittedBy}
                    </p>
                  </div>
                  <div>
                    <Label>Submitted At</Label>
                    <p className="mt-1 text-sm">
                      {new Date(
                        selectedSubmission.submittedAt,
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editDate">Date</Label>
                      <Input
                        id="editDate"
                        type="date"
                        value={editFormData.date}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="editProduct">Product</Label>
                      <Select
                        value={editFormData.product}
                        onValueChange={(value) =>
                          setEditFormData({ ...editFormData, product: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueProducts.map((product) => (
                            <SelectItem key={product} value={product}>
                              {product}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="editProducedQty">Produced Quantity</Label>
                      <Input
                        id="editProducedQty"
                        type="number"
                        value={editFormData.producedQty}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            producedQty: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="editDamageQty">Damage Quantity</Label>
                      <Input
                        id="editDamageQty"
                        type="number"
                        value={editFormData.damageQty}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            damageQty: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Current Image</Label>
                    {editFormData.image ? (
                      <img
                        src={editFormData.image}
                        alt="Current damage"
                        className="mt-2 max-w-full h-32 object-contain border rounded cursor-pointer"
                        onClick={() => {
                          // Create modal for full image view
                          const modal = document.createElement("div");
                          modal.className =
                            "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4";
                          modal.innerHTML = `
                            <div class="relative max-w-4xl max-h-full">
                              <img src="${editFormData.image}" alt="Full size damage image" class="max-w-full max-h-full object-contain" />
                              <button class="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75">×</button>
                            </div>
                          `;
                          modal.onclick = (e) => {
                            if (
                              e.target === modal ||
                              e.target.tagName === "BUTTON"
                            ) {
                              document.body.removeChild(modal);
                            }
                          };
                          document.body.appendChild(modal);
                        }}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-gray-400">
                        No image uploaded
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateSubmission}
                      className="w-full sm:w-auto"
                    >
                      Update Submission
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
