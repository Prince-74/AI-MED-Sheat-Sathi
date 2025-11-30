/* eslint-disable @typescript-eslint/no-explicit-any */
import { ArrowLeft, Upload, FileText, Download, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useMemo, useRef, useState } from "react";
import { userAuthStore } from "@/store/authStore";
import { toast } from "sonner";

interface SavedReport {
  _id: string;
  filename: string;
  summary: string;
  text: string;
  parameters: { name: string; value: string; status: string }[];
  issues?: string[];
  uploadedAt: string;
}

const ReportAnalyzer = () => {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<SavedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { token } = userAuthStore();

  const handleChooseFile = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAnalysis(null);
    setLoading(true);

    try {
      if (!token) {
        toast.error("Please sign in to analyze reports");
        navigate("/auth");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const baseUrl = import.meta.env.VITE_API_URL;
      if (!baseUrl) {
        throw new Error("API base URL not configured. Set VITE_API_URL in your .env file");
      }

      const res = await fetch(`${baseUrl}/reports/analyze`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const savedReport = data?.data?.report;
      if (!savedReport) {
        throw new Error("Unexpected response from server");
      }
      setAnalysis(savedReport);
      toast.success("Report analyzed and saved");
    } catch (err: any) {
      const message = err?.message || "Analysis failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setTimeout(() => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 0);
    }
  };

  const handleDownload = async () => {
    if (!analysis) return;
    if (!token) {
      toast.error("Please sign in to download reports");
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      const res = await fetch(`${baseUrl}/reports/${analysis._id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = analysis.filename || "report";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || "Unable to download report");
    }
  };

  const uploadedAt = useMemo(() => {
    if (!analysis?.uploadedAt) return null;
    return new Date(analysis.uploadedAt).toLocaleString();
  }, [analysis?.uploadedAt]);

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
          <h1 className="text-2xl font-bold">Report Analyzer</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="px-6 mt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            e.preventDefault();
            onFileSelected(e);
          }}
        />

        <Card
          className="p-8 shadow-card mb-6 border-2 border-dashed border-border hover:border-primary transition-smooth cursor-pointer"
          onClick={handleChooseFile}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold mb-1">Upload Medical Report</p>
              <p className="text-sm text-muted-foreground">
                Drop PDF or image files here, or click to browse
              </p>
            </div>
            <Button onClick={handleChooseFile} disabled={loading}>
              {loading ? "Analyzing..." : "Choose File"}
            </Button>
          </div>
        </Card>

        {error && (
          <Card className="p-4 mb-4 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        {analysis && (
          <div className="space-y-4">
            <Card className="p-5 shadow-md flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">File Name</span>
                  <span className="font-semibold text-sm">{analysis.filename}</span>
                </div>
                {uploadedAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-4 h-4" /> {uploadedAt}
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5 shadow-md">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Extracted Medical Text</h3>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {analysis.text}
              </p>
            </Card>

            <Card className="p-5 shadow-md bg-sky-blue-light">
              <h3 className="font-bold mb-2">AI Simplified Summary</h3>
              <p className="text-sm leading-relaxed">{analysis.summary}</p>
            </Card>

            <Card className="p-5 shadow-md">
              <h3 className="font-bold mb-4">Detected Parameters</h3>
              <div className="space-y-3">
                {(analysis.parameters || []).map((param, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-secondary rounded-xl"
                  >
                    <div>
                      <p className="font-medium">{param.name}</p>
                      <p className="text-sm text-muted-foreground">{param.value}</p>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        param.status === "normal"
                          ? "bg-green-500"
                          : param.status === "high"
                          ? "bg-red-500"
                          : param.status === "low"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button variant="outline" className="w-full" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download Original Report
              </Button>
              <Button className="w-full" onClick={() => navigate("/health-records")}>View Saved Reports</Button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ReportAnalyzer;
