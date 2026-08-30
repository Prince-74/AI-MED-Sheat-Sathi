import { ArrowLeft, FileText, Download, Calendar, Info, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useEffect, useState } from "react";
import { userAuthStore } from "@/store/authStore";
import { getWithAuth, deleteWithAuth, BASE_URL } from "@/service/httpService";
import { toast } from "sonner";

interface SavedReport {
  _id: string;
  filename: string;
  summary: string;
  text: string;
  issues?: string[];
  uploadedAt: string;
}

const HealthRecords = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated } = userAuthStore();
  const [records, setRecords] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await getWithAuth<SavedReport[]>("/reports");
      setRecords(res?.data || []);
    } catch (error: any) {
      toast.error(error?.message || "Unable to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [isAuthenticated]);

  const handleDownload = async (report: SavedReport) => {
    if (!token) {
      toast.error("Please sign in to download reports");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/reports/${report._id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = report.filename || "medical-report";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.message || "Unable to download report");
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;
    try {
      await deleteWithAuth(`/reports/${reportId}`);
      toast.success("Report deleted");
      setRecords((prev) => prev.filter((r) => r._id !== reportId));
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete report");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground px-6 pt-8 pb-6 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center hover:bg-primary-foreground/30 transition-smooth"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Health Records</h1>
          <div className="w-12" />
        </div>
        <p className="text-xs opacity-90 text-center">
          Secure digital vault for all your uploaded medical documents and AI summaries
        </p>
      </div>

      <div className="px-6 mt-6">
        {loading && (
          <Card className="p-5 mb-4 text-center">
            <p className="text-sm text-muted-foreground animate-pulse">Loading your health records...</p>
          </Card>
        )}

        {!loading && records.length === 0 && (
          <Card className="p-8 mb-4 text-center">
            <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" />
            <h3 className="font-semibold text-sm mb-1">No Saved Reports Found</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Analyze a medical report or blood test to store and track it here automatically.
            </p>
            <Button onClick={() => navigate("/report-analyzer")}>Analyze Medical Report</Button>
          </Card>
        )}

        <div className="space-y-4">
          {records.map((record) => {
            const uploaded = new Date(record.uploadedAt).toLocaleString();
            return (
              <Card key={record._id} className="p-5 shadow-card relative border border-border/60">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary shrink-0" />
                    <h3 className="font-bold text-sm truncate max-w-[200px] sm:max-w-xs">
                      {record.filename}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {uploaded}
                  </div>
                </div>

                <div className="bg-secondary/70 rounded-xl p-3 mb-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Summary</p>
                  <p className="text-xs text-foreground/90 line-clamp-3 leading-relaxed">
                    {record.summary}
                  </p>
                </div>

                {record.issues && record.issues.length > 0 && (
                  <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-200">
                    <p className="text-xs font-bold text-amber-900 mb-1">
                      Key Highlights:
                    </p>
                    <ul className="text-xs text-amber-950 list-disc pl-4 space-y-0.5">
                      {record.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleDownload(record)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download File
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => handleDelete(record._id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HealthRecords;
