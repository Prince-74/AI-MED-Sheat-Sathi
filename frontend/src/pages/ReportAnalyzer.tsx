import { ArrowLeft, Upload, FileText, Download, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useMemo, useRef, useState, useEffect } from "react";
import { userAuthStore } from "@/store/authStore";
import { uploadWithAuth, BASE_URL } from "@/service/httpService";
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
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { token, isAuthenticated } = userAuthStore();
  const progressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    };
  }, []);

  const handleChooseFile = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!token || !isAuthenticated) {
      toast.error("Please sign in to analyze reports");
      navigate("/auth");
      return;
    }

    setError(null);
    setAnalysis(null);
    setLoading(true);
    setProgress(10);

    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = window.setInterval(() => {
      setProgress((p) => {
        const next = p + Math.floor(Math.random() * 8) + 3;
        return next >= 90 ? 90 : next;
      });
    }, 600);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadWithAuth<any>("/reports/analyze", formData);
      const savedReport = res?.data?.report || res?.data;

      if (!savedReport) {
        throw new Error("Unexpected response format from server");
      }

      setAnalysis({
        ...savedReport,
        summary:
          typeof savedReport.summary === "string" && savedReport.summary.trim()
            ? savedReport.summary
            : "AI analysis completed. Extracted text available below.",
        text: typeof savedReport.text === "string" ? savedReport.text : "",
        parameters: Array.isArray(savedReport.parameters) ? savedReport.parameters : [],
        issues: Array.isArray(savedReport.issues) ? savedReport.issues : [],
      });

      setProgress(100);
      toast.success("Medical report analyzed successfully!");
    } catch (err: any) {
      const message = err?.message || "Analysis failed";
      setError(message);
      toast.error(message);
    } finally {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 500);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownload = async () => {
    if (!analysis) return;
    if (!token) {
      toast.error("Please sign in to download reports");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/reports/${analysis._id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = analysis.filename || "medical-report";
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
          <h1 className="text-2xl font-bold">AI Report Analyzer</h1>
          <div className="w-12" />
        </div>
        <p className="text-xs opacity-90 text-center">
          Upload blood tests, lab results, prescriptions, or radiology reports for instant AI breakdown
        </p>
      </div>

      <div className="px-6 mt-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={onFileSelected}
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
                Supports PDF documents and high-resolution images
              </p>
            </div>
            <Button onClick={handleChooseFile} disabled={loading}>
              {loading ? "Analyzing Document..." : "Choose File"}
            </Button>
          </div>
        </Card>

        {loading && (
          <Card className="p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm">Processing OCR & Medical AI Extraction...</div>
              <div className="text-sm font-semibold">{progress}%</div>
            </div>
            <Progress value={progress} />
          </Card>
        )}

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

            <Card className="p-5 shadow-md bg-sky-50 border-sky-200">
              <h3 className="font-bold mb-2 text-sky-900">AI Simplified Summary</h3>
              <p className="text-sm leading-relaxed text-sky-950">{analysis.summary}</p>
            </Card>

            {analysis.issues && analysis.issues.length > 0 && (
              <Card className="p-5 shadow-md bg-amber-50 border-amber-200">
                <h3 className="font-bold mb-2 text-amber-900">Key Health Observations</h3>
                <ul className="list-disc pl-5 text-sm text-amber-950 space-y-1">
                  {analysis.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </Card>
            )}

            {analysis.parameters && analysis.parameters.length > 0 && (
              <Card className="p-5 shadow-md">
                <h3 className="font-bold mb-4">Extracted Parameters & Metrics</h3>
                <div className="space-y-3">
                  {analysis.parameters.map((param, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-secondary rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-sm">{param.name}</p>
                        <p className="text-xs text-muted-foreground">{param.value}</p>
                      </div>
                      <div
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${
                          param.status === "normal"
                            ? "bg-green-100 text-green-700"
                            : param.status === "high"
                            ? "bg-red-100 text-red-700"
                            : param.status === "low"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {param.status}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {analysis.text && (
              <Card className="p-5 shadow-md">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-sm">Extracted Raw Text</h3>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto bg-muted p-3 rounded-lg">
                  {analysis.text}
                </p>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button variant="outline" className="w-full" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download Original Report
              </Button>
              <Button className="w-full" onClick={() => navigate("/health-records")}>
                View All Saved Reports
              </Button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ReportAnalyzer;
