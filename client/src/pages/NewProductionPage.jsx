import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  DialogTrigger,
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
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Factory,
  TrendingUp,
  RefreshCcw,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  User,
  Building,
  ChevronDown,
  History,
  Eye,
  Search,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";

// Dummy products list
const PRODUCTS = [
  "Steel Rods 12mm",
  "Aluminum Sheets",
  "Copper Pipes",
  "Metal Sheets 2mm",
  "Pipe Fittings",
  "Welding Rods",
  "Steel Angles",
  "Concrete Mixers",
  "Industrial Bolts",
  "Custom Brackets",
];

// Dummy production data (10 entries)
const dummyProductionData = [
  {
    id: "PROD-001",
    date: "2025-01-11",
    product: "Steel Rods 12mm",
    producedQty: 500,
    damageQty: 12,
    shift: "Morning",
    operator: "John Smith",
    quality: "A-Grade",
    status: "Completed",
    notes: "Standard production run",
    image: null,
  },
  {
    id: "PROD-002",
    date: "2025-01-11",
    product: "Aluminum Sheets",
    producedQty: 250,
    damageQty: 8,
    shift: "Evening",
    operator: "Sarah Johnson",
    quality: "A-Grade",
    status: "Completed",
    notes: "High quality output",
    image: null,
  },
  {
    id: "PROD-003",
    date: "2025-01-10",
    product: "Copper Pipes",
    producedQty: 180,
    damageQty: 15,
    shift: "Night",
    operator: "Mike Davis",
    quality: "B-Grade",
    status: "Completed",
    notes: "Minor quality issues",
    image: null,
  },
  {
    id: "PROD-004",
    date: "2025-01-10",
    product: "Metal Sheets 2mm",
    producedQty: 300,
    damageQty: 5,
    shift: "Morning",
    operator: "Emily Brown",
    quality: "A-Grade",
    status: "Completed",
    notes: "Excellent production quality",
    image: null,
  },
  {
    id: "PROD-005",
    date: "2025-01-09",
    product: "Pipe Fittings",
    producedQty: 420,
    damageQty: 18,
    shift: "Evening",
    operator: "David Wilson",
    quality: "A-Grade",
    status: "In Progress",
    notes: "Production ongoing",
    image: null,
  },
  {
    id: "PROD-006",
    date: "2025-01-09",
    product: "Welding Rods",
    producedQty: 600,
    damageQty: 22,
    shift: "Morning",
    operator: "Lisa Garcia",
    quality: "B-Grade",
    status: "Completed",
    notes: "Standard quality",
    image: null,
  },
  {
    id: "PROD-007",
    date: "2025-01-08",
    product: "Steel Angles",
    producedQty: 150,
    damageQty: 3,
    shift: "Night",
    operator: "Robert Taylor",
    quality: "A-Grade",
    status: "Completed",
    notes: "Premium quality production",
    image: null,
  },
  {
    id: "PROD-008",
    date: "2025-01-08",
    product: "Concrete Mixers",
    producedQty: 45,
    damageQty: 2,
    shift: "Morning",
    operator: "Jennifer Lee",
    quality: "A-Grade",
    status: "Completed",
    notes: "Perfect condition",
    image: null,
  },
  {
    id: "PROD-009",
    date: "2025-01-07",
    product: "Industrial Bolts",
    producedQty: 800,
    damageQty: 35,
    shift: "Evening",
    operator: "Kevin Martinez",
    quality: "B-Grade",
    status: "Completed",
    notes: "High volume production",
    image: null,
  },
  {
    id: "PROD-010",
    date: "2025-01-07",
    product: "Custom Brackets",
    producedQty: 120,
    damageQty: 7,
    shift: "Morning",
    operator: "Amanda Clark",
    quality: "A-Grade",
    status: "Completed",
    notes: "Custom specifications met",
    image: null,
  },
];

// Custom hook for managing production submissions
const useProductionSubmissions = () => {
  const [submissions, setSubmissions] = useState(() => {
    const saved = localStorage.getItem("productionSubmissions");
    return saved ? JSON.parse(saved) : [];
  });

  const addSubmission = (submission) => {
    const newSubmissions = [...submissions, submission];
    setSubmissions(newSubmissions);
    localStorage.setItem(
      "productionSubmissions",
      JSON.stringify(newSubmissions),
    );
  };

  return [submissions, addSubmission];
};

export default function NewProductionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canPerformAction } = usePermissions();
  const [productionData, setProductionData] = useState(dummyProductionData);
  const [filteredData, setFilteredData] = useState(dummyProductionData);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    product: "",
    producedQty: "",
    damageQty: "",
    shift: "",
    operator: "",
    quality: "",
    notes: "",
    date: new Date().toISOString().split("T")[0],
    image: null,
    imagePreview: null,
  });

  // Calculate summary stats from dummy data
  const totalProduced = productionData.reduce(
    (sum, item) => sum + item.producedQty,
    0,
  );
  const totalDamaged = productionData.reduce(
    (sum, item) => sum + item.damageQty,
    0,
  );
  const completedItems = productionData.filter(
    (item) => item.status === "Completed",
  ).length;
  const inProgressItems = productionData.filter(
    (item) => item.status === "In Progress",
  ).length;

  // Filter and search functionality
  React.useEffect(() => {
    let filtered = productionData;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.id.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    setFilteredData(filtered);
  }, [searchTerm, statusFilter, productionData]);

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setFormData((prev) => ({
          ...prev,
          image: base64,
          imagePreview: base64,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.product ||
      !formData.producedQty ||
      !formData.damageQty ||
      !formData.shift ||
      !formData.operator ||
      !formData.quality
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newItem = {
      id: `PROD-${String(productionData.length + 1).padStart(3, "0")}`,
      product: formData.product,
      producedQty: parseInt(formData.producedQty),
      damageQty: parseInt(formData.damageQty),
      shift: formData.shift,
      operator: formData.operator,
      quality: formData.quality,
      notes: formData.notes,
      date: formData.date,
      image: formData.image,
      status: "Completed",
    };

    setProductionData([newItem, ...productionData]);

    toast({
      title: "Production Added",
      description: `Production entry for ${formData.product} has been created`,
      variant: "default",
    });

    setIsAddDialogOpen(false);
    resetForm();
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      product: "",
      producedQty: "",
      damageQty: "",
      shift: "",
      operator: "",
      quality: "",
      notes: "",
      date: new Date().toISOString().split("T")[0],
      image: null,
      imagePreview: null,
    });
  };

  // Handle actions
  const handleView = (item) => {
    setSelectedItem(item);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      product: item.product,
      producedQty: item.producedQty.toString(),
      damageQty: item.damageQty.toString(),
      shift: item.shift,
      operator: item.operator,
      quality: item.quality,
      notes: item.notes || "",
      date: item.date,
      image: item.image,
      imagePreview: item.image,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id) => {
    if (
      window.confirm("Are you sure you want to delete this production entry?")
    ) {
      setProductionData(productionData.filter((item) => item.id !== id));
      toast({
        title: "Entry Deleted",
        description: "Production entry has been removed",
        variant: "default",
      });
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();

    const updatedItem = {
      ...selectedItem,
      product: formData.product,
      producedQty: parseInt(formData.producedQty),
      damageQty: parseInt(formData.damageQty),
      shift: formData.shift,
      operator: formData.operator,
      quality: formData.quality,
      notes: formData.notes,
      date: formData.date,
      image: formData.image,
    };

    setProductionData(
      productionData.map((item) =>
        item.id === selectedItem.id ? updatedItem : item,
      ),
    );

    toast({
      title: "Entry Updated",
      description: "Production entry has been updated successfully",
      variant: "default",
    });

    setIsEditDialogOpen(false);
    setSelectedItem(null);
    resetForm();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Pending":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case "A-Grade":
        return "bg-green-100 text-green-800";
      case "B-Grade":
        return "bg-yellow-100 text-yellow-800";
      case "C-Grade":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-xl p-4 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3">
                <Factory className="h-8 w-8 sm:h-10 sm:w-10" />
                Production
              </h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                    My Production <ChevronDown className="ml-2 h-4 w-4" />
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
            <p className="text-blue-100 text-sm sm:text-base">
              Manage daily production operations and track performance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold w-full sm:w-auto"
              size="default"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Add Production
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold w-full sm:w-auto"
              size="default"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Produced
            </CardTitle>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {totalProduced.toLocaleString()}
            </div>
            <p className="text-xs text-green-600 font-medium">
              ↗ +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Damaged
            </CardTitle>
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {totalDamaged}
            </div>
            <p className="text-xs text-red-600 font-medium">
              ↘ -5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed Items
            </CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {completedItems}
            </div>
            <p className="text-xs text-blue-600 font-medium">
              {inProgressItems} in progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Efficiency Rate
            </CardTitle>
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {totalProduced > 0
                ? (
                    ((totalProduced - totalDamaged) / totalProduced) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-purple-600 font-medium">
              Quality performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Production Records
              </CardTitle>
              <CardDescription>
                Manage and track all production entries
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by product, operator, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Production Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold whitespace-nowrap">
                    Production ID
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
                  <TableHead className="font-semibold whitespace-nowrap">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-gray-50"
                  >
                    <TableCell className="font-medium text-blue-600">
                      {item.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(item.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.product}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        {item.producedQty.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700 border-red-200"
                      >
                        {item.damageQty}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="truncate max-w-24">
                          {item.operator}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant="outline"
                        className={getQualityColor(item.quality)}
                      >
                        {item.quality}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Badge
                        variant="outline"
                        className={getStatusColor(item.status)}
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(item)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canPerformAction(
                            "production",
                            "myProduction",
                            "edit",
                          ) && (
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canPerformAction(
                            "production",
                            "myProduction",
                            "delete",
                          ) && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Add Production Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add New Production Entry
            </DialogTitle>
            <DialogDescription>
              Record new production data with quality and operator information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="product">Product *</Label>
                <Select
                  value={formData.product}
                  onValueChange={(value) =>
                    setFormData({ ...formData, product: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTS.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="shift">Shift *</Label>
                <Select
                  value={formData.shift}
                  onValueChange={(value) =>
                    setFormData({ ...formData, shift: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="producedQty">Produced Quantity *</Label>
                <Input
                  id="producedQty"
                  type="number"
                  min="0"
                  value={formData.producedQty}
                  onChange={(e) =>
                    setFormData({ ...formData, producedQty: e.target.value })
                  }
                  placeholder="Enter quantity"
                  required
                />
              </div>

              <div>
                <Label htmlFor="damageQty">Damage Quantity *</Label>
                <Input
                  id="damageQty"
                  type="number"
                  min="0"
                  value={formData.damageQty}
                  onChange={(e) =>
                    setFormData({ ...formData, damageQty: e.target.value })
                  }
                  placeholder="Enter damage quantity"
                  required
                />
              </div>

              <div>
                <Label htmlFor="quality">Quality Grade *</Label>
                <Select
                  value={formData.quality}
                  onValueChange={(value) =>
                    setFormData({ ...formData, quality: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A-Grade">A-Grade</SelectItem>
                    <SelectItem value="B-Grade">B-Grade</SelectItem>
                    <SelectItem value="C-Grade">C-Grade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="operator">Operator Name *</Label>
                <Input
                  id="operator"
                  value={formData.operator}
                  onChange={(e) =>
                    setFormData({ ...formData, operator: e.target.value })
                  }
                  placeholder="Enter operator name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="damageImage">Damage Image (Optional)</Label>
                <Input
                  id="damageImage"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="cursor-pointer"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes (optional)"
              />
            </div>

            {formData.imagePreview && (
              <div className="space-y-2">
                <Label>Image Preview</Label>
                <div className="relative max-w-md mx-auto">
                  <img
                    src={formData.imagePreview}
                    alt="Damage preview"
                    className="w-full h-48 object-cover rounded border cursor-pointer"
                    onClick={() => {
                      // Create modal for full image view
                      const modal = document.createElement("div");
                      modal.className =
                        "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4";
                      modal.innerHTML = `
                        <div class="relative max-w-4xl max-h-full">
                          <img src="${formData.imagePreview}" alt="Full size preview" class="max-w-full max-h-full object-contain" />
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
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        image: null,
                        imagePreview: null,
                      })
                    }
                  >
                    ×
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                Add Production Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Production Details - {selectedItem?.id}
            </DialogTitle>
            <DialogDescription>
              Complete information for this production entry
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date</Label>
                  <p className="mt-1 text-sm font-medium">
                    {new Date(selectedItem.date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label>Product</Label>
                  <p className="mt-1 text-sm font-medium">
                    {selectedItem.product}
                  </p>
                </div>
                <div>
                  <Label>Produced Quantity</Label>
                  <p className="mt-1 text-sm font-medium text-green-600">
                    {selectedItem.producedQty.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Damage Quantity</Label>
                  <p className="mt-1 text-sm font-medium text-red-600">
                    {selectedItem.damageQty}
                  </p>
                </div>
                <div>
                  <Label>Shift</Label>
                  <p className="mt-1 text-sm font-medium">
                    {selectedItem.shift}
                  </p>
                </div>
                <div>
                  <Label>Operator</Label>
                  <p className="mt-1 text-sm font-medium">
                    {selectedItem.operator}
                  </p>
                </div>
                <div>
                  <Label>Quality Grade</Label>
                  <Badge className={getQualityColor(selectedItem.quality)}>
                    {selectedItem.quality}
                  </Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedItem.status)}>
                    {selectedItem.status}
                  </Badge>
                </div>
              </div>
              {selectedItem.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="mt-1 text-sm">{selectedItem.notes}</p>
                </div>
              )}
              {selectedItem.image && (
                <div>
                  <Label>Damage Image</Label>
                  <img
                    src={selectedItem.image}
                    alt="Damage"
                    className="mt-2 max-w-full h-48 object-contain border rounded cursor-pointer"
                    onClick={() => {
                      // Create modal for full image view
                      const modal = document.createElement("div");
                      modal.className =
                        "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4";
                      modal.innerHTML = `
                        <div class="relative max-w-4xl max-h-full">
                          <img src="${selectedItem.image}" alt="Full size damage image" class="max-w-full max-h-full object-contain" />
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
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Production Entry - {selectedItem?.id}
            </DialogTitle>
            <DialogDescription>
              Update production information and details
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="editProduct">Product *</Label>
                <Select
                  value={formData.product}
                  onValueChange={(value) =>
                    setFormData({ ...formData, product: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCTS.map((product) => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="editDate">Date *</Label>
                <Input
                  id="editDate"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="editShift">Shift *</Label>
                <Select
                  value={formData.shift}
                  onValueChange={(value) =>
                    setFormData({ ...formData, shift: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Morning</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="editProducedQty">Produced Quantity *</Label>
                <Input
                  id="editProducedQty"
                  type="number"
                  min="0"
                  value={formData.producedQty}
                  onChange={(e) =>
                    setFormData({ ...formData, producedQty: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="editDamageQty">Damage Quantity *</Label>
                <Input
                  id="editDamageQty"
                  type="number"
                  min="0"
                  value={formData.damageQty}
                  onChange={(e) =>
                    setFormData({ ...formData, damageQty: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="editQuality">Quality Grade *</Label>
                <Select
                  value={formData.quality}
                  onValueChange={(value) =>
                    setFormData({ ...formData, quality: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A-Grade">A-Grade</SelectItem>
                    <SelectItem value="B-Grade">B-Grade</SelectItem>
                    <SelectItem value="C-Grade">C-Grade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editOperator">Operator Name *</Label>
                <Input
                  id="editOperator"
                  value={formData.operator}
                  onChange={(e) =>
                    setFormData({ ...formData, operator: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="editNotes">Notes</Label>
                <Input
                  id="editNotes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Entry</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
