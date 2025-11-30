import { ArrowLeft, Mic, Thermometer, Wind, AlertCircle, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { userAuthStore } from "@/store/authStore";

const symptoms = [
  { icon: Thermometer, label: "Fever", color: "text-red-500" },
  { icon: Wind, label: "Cough", color: "text-blue-500" },
  { icon: AlertCircle, label: "Pain", color: "text-orange-500" },
  { icon: Stethoscope, label: "Injury", color: "text-purple-500" },
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
  const { token } = userAuthStore();

  const analyzeSymptoms = async () => {
    if (!input.trim()) {
      toast.error("Please describe your symptoms first");
      return;
    }

    if (!token) {
      toast.error("Please sign in to use the AI symptom checker");
      navigate("/auth");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const baseUrl = import.meta.env.VITE_API_URL;
      if (!baseUrl) throw new Error("API base URL not configured");

      const res = await fetch(`${baseUrl}/ai/symptom-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description: input }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      const payload = data?.data || data;
      const urgencyOptions: SymptomResult["urgency"][] = ["low", "medium", "high"];
      const urgencyValue = String(payload.urgency || "medium").toLowerCase();
      const urgency = urgencyOptions.includes(urgencyValue as SymptomResult["urgency"]) ? (urgencyValue as SymptomResult["urgency"]) : "medium";
      setResult({
        condition: payload.condition,
        urgency,
        explanation: payload.explanation,
        recommendations: Array.isArray(payload.recommendations) ? payload.recommendations.map(String) : [],
        redFlags: Array.isArray(payload.redFlags) ? payload.redFlags.map(String) : [],
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error?.message || "Unable to analyze symptoms right now");
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold">AI Symptom Checker</h1>
          <div className="w-12" />
        </div>
      </div>

      {/* Symptom Icons */}
      <div className="px-6 mt-6">
        <p className="text-sm text-muted-foreground mb-3">Quick select common symptoms:</p>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {symptoms.map((symptom, idx) => (
            <Card
              key={idx}
              className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-card-hover transition-smooth"
            >
              <symptom.icon className={`w-8 h-8 ${symptom.color}`} />
              <span className="text-xs text-center font-medium">{symptom.label}</span>
            </Card>
          ))}
        </div>

        {/* Input Area */}
        <Card className="p-4 mb-4 shadow-card">
          <label className="text-sm font-medium mb-2 block">Describe your symptoms:</label>
          <Textarea
            placeholder="E.g., I have fever and headache for 2 days..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="mb-3"
            rows={4}
          />
          <div className="flex gap-2">
            <Button onClick={analyzeSymptoms} className="flex-1" disabled={loading}>
              {loading ? "Analyzing..." : "Check My Health"}
            </Button>
            <Button variant="outline" size="icon">
              <Mic className="w-5 h-5" />
            </Button>
          </div>
        </Card>

        {/* Results */}
        {result && (
          <Card className="p-5 shadow-md">
            <h3 className="font-bold text-lg mb-3">AI Analysis</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Possible Condition:</p>
                <p className="font-semibold text-lg">{result.condition}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Urgency Level:</p>
                <Badge
                  className={
                    result.urgency === "high"
                      ? "bg-red-500 text-white"
                      : result.urgency === "medium"
                      ? "bg-yellow-500 text-white"
                      : "bg-green-500 text-white"
                  }
                >
                  {result.urgency.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Explanation:</p>
                <p className="text-sm leading-relaxed">{result.explanation}</p>
              </div>
              {result.recommendations.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Recommended Next Steps:</p>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                    {result.recommendations.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.redFlags.length > 0 && (
                <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/10">
                  <p className="text-sm font-semibold text-destructive mb-1">Seek urgent care if you notice:</p>
                  <ul className="list-disc pl-5 text-sm text-destructive space-y-1">
                    {result.redFlags.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SymptomChecker;
