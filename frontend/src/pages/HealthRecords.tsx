import { ArrowLeft, FileText, Download, Calendar, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useEffect, useState } from "react";
import { userAuthStore } from "@/store/authStore";
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
  const { token } = userAuthStore();
  const [records, setRecords] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const baseUrl = import.meta.env.VITE_API_URL;
        if (!baseUrl) throw new Error("API base URL not configured");
        const res = await fetch(`${baseUrl}/reports`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setRecords(data?.data || data || []);
      } catch (error: any) {
        toast.error(error?.message || "Unable to fetch reports");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [token]);

  const handleDownload = async (report: SavedReport) => {
    if (!token) {
      toast.error("Please sign in to download reports");
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      if (!baseUrl) throw new Error("API base URL not configured");
      const res = await fetch(`${baseUrl}/reports/${report._id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = report.filename || "report";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.message || "Unable to download report");
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
      </div>

      <div className="px-6 mt-6">
        {loading && (
          <Card className="p-5 mb-4">
            <p className="text-sm text-muted-foreground">Loading your saved reports...</p>
          </Card>
        )}

        {!loading && records.length === 0 && (
          <Card className="p-6 mb-4 text-center">
            <Info className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No saved reports yet. Analyze a medical report to store it here automatically.
            </p>
          </Card>
        )}

        <div className="space-y-4">
          {records.map((record) => {
            const uploaded = new Date(record.uploadedAt).toLocaleString();
            return (
              <Card key={record._id} className="p-5 shadow-card relative">
                <div className="absolute -left-3 top-6 w-6 h-6 bg-primary rounded-full border-4 border-background" />

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="font-bold">{record.filename}</h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {uploaded}
                  </div>
                </div>

                <div className="bg-secondary rounded-xl p-3 mb-3">
                  <p className="text-sm font-medium mb-1">Summary:</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">{record.summary}</p>
                </div>

                {record.issues && record.issues.length > 0 && (
                  <div className="bg-sky-blue-light rounded-xl p-3 mb-3">
                    <p className="text-sm font-medium mb-1 flex items-center gap-1">
                      🤖 AI Notes:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                      {record.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(record)}>
                    <Download className="w-4 h-4 mr-1" />
                    Download
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
