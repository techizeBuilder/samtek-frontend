/** @format */

import { useEffect, useState } from "react";
import axios from "axios";
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  Filter,
  Calendar,
  User as UserIcon,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Loader from "../../Loader";

const API = import.meta.env.VITE_API_URL;
const ViewAPI = API.replace("/api", "");

type LetterType = "OFFER" | "APPOINTMENT" | "PROMOTION" | "WARNING" | "RELIEVING" | "FF_SETTLEMENT" | "EXPERIENCE" | "TERMINATION" | "APPRECIATION" | "TRAINING" | "ALL";

interface Letter {
  _id: string;
  letterType: LetterType;
  fileName: string;
  originalName: string;
  filePath: string;
  message?: string;
  createdAt: string;
  sentBy: {
    name: string;
    role: string;
  };
}

const LETTER_OPTIONS: { label: string; value: LetterType }[] = [
  { label: "All Letters", value: "ALL" },
  { label: "Offer Letter", value: "OFFER" },
  { label: "Appointment Letter", value: "APPOINTMENT" },
  { label: "Promotion Letter", value: "PROMOTION" },
  { label: "Experience Letter", value: "EXPERIENCE" },
  { label: "Relieving Letter", value: "RELIEVING" },
  { label: "Termination Letter", value: "TERMINATION" },
  { label: "Appreciation Letter", value: "APPRECIATION" },
  { label: "Warning Letter", value: "WARNING" },
  { label: "Training Letter", value: "TRAINING" },
];

export default function EmployeeLetters() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user?.id;
  
  const [activeTab, setActiveTab] = useState<LetterType>("ALL");
  const [letters, setLetters] = useState<Letter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/letters/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setLetters(res.data || []);
    } catch (error) {
      console.error("Failed to fetch letters:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchLetters();
  }, [userId]);

  const filteredLetters = letters.filter((l) => {
    const matchesTab = activeTab === "ALL" ? true : l.letterType === activeTab;
    const matchesSearch = l.letterType.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (l.message && l.message.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const handleDownload = (filePath: string, originalName: string) => {
    const link = document.createElement("a");
    link.href = `${ViewAPI}/${filePath}`;
    link.setAttribute("download", originalName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center"><Loader /></div>;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50/30 min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Letters</h1>
          <p className="text-gray-500 mt-1">Access and download all your official documents</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* SEARCH */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={18} />
            <Input 
              placeholder="Search letters..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-[250px] bg-white border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-xl transition-all"
            />
          </div>

          {/* FILTER DROPDOWN */}
          <div className="w-full sm:w-[200px]">
            <Select value={activeTab} onValueChange={(v) => setActiveTab(v as LetterType)}>
              <SelectTrigger className="bg-white border-gray-200 rounded-xl h-10 shadow-sm">
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-gray-400" />
                  <SelectValue placeholder="Filter by type" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-gray-100 shadow-xl overflow-hidden">
                {LETTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="focus:bg-orange-50 focus:text-orange-700 cursor-pointer py-2.5">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* CONTENT SECTION */}
      {filteredLetters.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-4 bg-gray-100 rounded-full text-gray-400">
              <FileText size={48} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">No letters found</h3>
              <p className="text-gray-500 max-w-xs mx-auto">
                {searchTerm || activeTab !== "ALL" 
                  ? "Try adjusting your search or filter to find what you're looking for." 
                  : "You don't have any official letters at the moment."}
              </p>
            </div>
            {(searchTerm || activeTab !== "ALL") && (
              <Button variant="outline" onClick={() => { setSearchTerm(""); setActiveTab("ALL"); }} className="rounded-xl">
                Clear all filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLetters.map((letter) => (
            <Card key={letter._id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 bg-white rounded-3xl">
              <CardHeader className="pb-4 relative">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="h-8 w-8 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                    <ChevronRight size={18} />
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-[10px] font-semibold uppercase tracking-wider mb-1">
                      {letter.letterType.replace("_", " ")}
                    </div>
                    <CardTitle className="text-lg font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                      {letter.letterType.replace("_", " ")} Letter
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* DETAILS */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Calendar size={12} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Issued On</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700">
                      {new Date(letter.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <UserIcon size={12} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Issued By</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {letter.sentBy?.name || "HR Manager"}
                    </p>
                  </div>
                </div>

                {/* MESSAGE BOX */}
                <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 line-clamp-2 text-sm text-gray-600 italic leading-relaxed min-h-[60px]">
                  {letter.message || "Official document issued for record and compliance purposes."}
                </div>

                {/* ACTIONS */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    asChild
                    variant="outline" 
                    className="flex-1 rounded-2xl h-11 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all font-semibold shadow-sm"
                  >
                    <a href={`${ViewAPI}/${letter.filePath}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2">
                      <Eye size={18} />
                      View
                    </a>
                  </Button>
                  <Button 
                    onClick={() => handleDownload(letter.filePath, letter.originalName)}
                    className="flex-1 rounded-2xl h-11 bg-gray-900 hover:bg-gray-800 text-white shadow-lg transition-all font-semibold"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Download size={18} />
                      Download
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
