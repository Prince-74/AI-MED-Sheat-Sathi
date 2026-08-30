import { ArrowLeft, Mic, Thermometer, Wind, AlertCircle, Stethoscope, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { userAuthStore } from "@/store/authStore";
import { postWithAuth } from "@/service/httpService";

const quickSymptoms = [
  { icon: Thermometer, label: "Fever / Chills", query: "I have had a high fever and chills for the past 2 days", color: "text-red-500" },
  { icon: Wind, label: "Persistent Cough", query: "Dry hacking cough and mild throat irritation", color: "text-blue-500" },
  { icon: AlertCircle, label: "Severe Headache", query: "Throbbing pain in the temples and forehead since yesterday", color: "text-orange-500" },
  { icon: Stethoscope, label: "Body Aches", query: "General muscle fatigue and joint soreness", color: "text-purple-500" },
];

type SymptomResult = {
  condition: string;
  urgency: "low" | "medium" | "high";
  explanation: string;
  recommendations: string[];
  redFlags: string[];
};

const SymptomChecker = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<SymptomResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = userAuthStore();

  const analyzeSymptoms = async (customText?: string) => {
    const textToAnalyze = (customText || input).trim();
    if (!textToAnalyze) {
      toast.error("Please describe your symptoms first");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please sign in to use the AI symptom checker");
      navigate("/auth");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await postWithAuth<any>("/ai/symptom-check", { description: textToAnalyze });
      const payload = res?.data || res;

      const urgencyOptions: SymptomResult["urgency"][] = ["low", "medium", "high"];
      const urgencyValue = String(payload?.urgency || "medium").toLowerCase();
      const urgency = urgencyOptions.includes(urgencyValue as SymptomResult["urgency"])
        ? (urgencyValue as SymptomResult["urgency"])
        : "medium";

      setResult({
        condition: payload?.condition || "General Assessment",
        urgency,
        explanation: payload?.explanation || "Assessment completed.",
        recommendations: Array.isArray(payload?.recommendations) ? payload.recommendations.map(String) : [],
        redFlags: Array.isArray(payload?.redFlags) ? payload.redFlags.map(String) : [],
      });
      toast.success("AI analysis completed");
    } catch (error: any) {
      toast.error(error?.message || "Unable to analyze symptoms right now");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (query: string) => {
    setInput(query);
    analyzeSymptoms(query);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary to-primary/90 text-primary-foreground px-6 pt-8 pb-6 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-primary-foreground/20 rounded-full flex items-center justify-center hover:bg-primary-foreground/30 transition-smooth"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">AI Symptom Triage</h1>
          <div className="w-12" />
        </div>
        <p className="text-xs opacity-90 text-center">
          Get instantaneous virtual health insights, triage urgency, and recommended actions
        </p>
      </div>

      <div className="px-6 mt-6">
        {/* Quick Symptoms */}
        <p className="text-sm font-semibold mb-3">Common Quick Select:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {quickSymptoms.map((symptom, idx) => (
            <Card
              key={idx}
              className="p-3 flex flex-col items-center gap-2 cursor-pointer hover:shadow-card-hover transition-smooth border border-border/60 hover:border-primary"
              onClick={() => handleQuickSelect(symptom.query)}
            >
              <symptom.icon className={`w-6 h-6 ${symptom.color}`} />
              <span className="text-xs text-center font-medium">{symptom.label}</span>
            </Card>
          ))}
        </div>

        {/* Input Area */}
        <Card className="p-5 mb-6 shadow-card">
          <label className="text-sm font-semibold mb-2 block flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Describe your current symptoms:
          </label>
          <Textarea
            placeholder="E.g., I have had a mild fever, dry cough, and fatigue since yesterday evening..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="mb-4 min-h-[110px]"
            rows={4}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => analyzeSymptoms()}
              className="flex-1"
              disabled={loading || !input.trim()}
            >
              {loading ? "Analyzing Symptoms with AI..." : "Analyze My Symptoms"}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <Card className="p-5 shadow-md">
              <div className="flex items-center justify-between mb-4 border-b pb-3">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Probable Condition / Assessment
                  </span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">{result.condition}</h3>
                </div>
                <Badge
                  className={
                    result.urgency === "high"
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : result.urgency === "medium"
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-green-500 text-white hover:bg-green-600"
                  }
                >
                  {result.urgency.toUpperCase()} URGENCY
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Clinical Overview
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/90">{result.explanation}</p>
                </div>

                {result.recommendations.length > 0 && (
                  <div className="bg-secondary/60 p-4 rounded-xl mt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Recommended Next Steps
                    </p>
                    <ul className="list-disc pl-5 text-sm text-foreground/90 space-y-1">
                      {result.recommendations.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.redFlags.length > 0 && (
                  <div className="border border-red-200 rounded-xl p-4 bg-red-50 text-red-950">
                    <p className="text-xs font-bold uppercase text-red-800 mb-1">
                      ?? Seek Urgent Care If You Notice:
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {result.redFlags.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/doctors")}
              >
                Consult a Doctor Now
              </Button>
              <Button
                className="w-full"
                onClick={() => navigate("/medication-assistant")}
              >
                Check Medication Interactions
              </Button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SymptomChecker;
