import { ArrowLeft, Pill, AlertTriangle, CheckCircle, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";
import { userAuthStore } from "@/store/authStore";
import { postWithAuth } from "@/service/httpService";
import { toast } from "sonner";

interface Interaction {
  drugs: string;
  severity: "high" | "medium" | "low";
  warning: string;
}

interface InteractionResults {
  interactions: Interaction[];
  alternatives: string[];
  summary: string;
  precautions?: string[];
}

const MedicationAssistant = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState("");
  const [results, setResults] = useState<InteractionResults | null>(null);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = userAuthStore();

  const checkInteractions = async () => {
    const trimmed = medicines.trim();
    if (!trimmed) {
      toast.error("Please enter at least one medication or supplement name");
      return;
    }

    if (!isAuthenticated) {
      toast.error("Please sign in to check medication safety");
      navigate("/auth");
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const res = await postWithAuth<any>("/ai/medication-check", { medicines: trimmed });
      const data = res?.data || res;

      setResults({
        interactions: Array.isArray(data?.interactions) ? data.interactions : [],
        alternatives: Array.isArray(data?.alternatives) ? data.alternatives : [],
        summary: String(data?.summary || "Analysis completed."),
        precautions: Array.isArray(data?.precautions) ? data.precautions : [],
      });
      toast.success("Medication safety analysis completed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to analyze medications");
    } finally {
      setLoading(false);
    }
  };

  const sampleCombos = [
    "Aspirin, Ibuprofen",
    "Paracetamol, Vitamin D, Cetirizine",
    "Metformin, Amoxicillin",
    "Warfarin, Aspirin",
  ];

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
          <h1 className="text-2xl font-bold">Medication Assistant</h1>
          <div className="w-12" />
        </div>
        <p className="text-xs opacity-90 text-center">
          Detect drug-drug interactions, contraindications, and discover safe alternatives
        </p>
      </div>

      <div className="px-6 mt-6">
        {/* Input Section */}
        <Card className="p-5 shadow-card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Enter Your Medications & Supplements</h3>
          </div>
          <Input
            placeholder="E.g., Aspirin, Ibuprofen, Paracetamol, Metformin..."
            value={medicines}
            onChange={(e) => setMedicines(e.target.value)}
            className="mb-3"
          />

          <div className="mb-4">
            <span className="text-xs text-muted-foreground block mb-2">Or try quick sample combinations:</span>
            <div className="flex flex-wrap gap-2">
              {sampleCombos.map((combo, idx) => (
                <button
                  key={idx}
                  onClick={() => setMedicines(combo)}
                  className="text-xs px-2.5 py-1 bg-secondary rounded-full hover:bg-primary/10 transition-colors"
                >
                  {combo}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={checkInteractions}
            className="w-full"
            disabled={loading || !medicines.trim()}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-spin" /> Analyzing Drug Safety...
              </span>
            ) : (
              "Check Safety & Interactions"
            )}
          </Button>
        </Card>

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <Card className="p-5 shadow-md bg-sky-50 border-sky-200">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-sky-700" />
                <h3 className="font-bold text-sky-950">Clinical Summary</h3>
              </div>
              <p className="text-sm text-sky-900 leading-relaxed">{results.summary}</p>
            </Card>

            <h3 className="font-bold text-lg">Interaction Breakdown</h3>
            {results.interactions.length === 0 ? (
              <Card className="p-4 bg-green-50 border-green-200 text-green-900 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm font-medium">
                  No critical interactions found between the specified medications.
                </p>
              </Card>
            ) : (
              results.interactions.map((item: Interaction, idx: number) => (
                <Card
                  key={idx}
                  className={`p-4 shadow-md border-l-4 ${
                    item.severity === "high"
                      ? "border-l-red-500 bg-red-50/50"
                      : item.severity === "medium"
                      ? "border-l-amber-500 bg-amber-50/50"
                      : "border-l-green-500 bg-green-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {item.severity === "high" ? (
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    ) : item.severity === "medium" ? (
                      <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm">{item.drugs}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                            item.severity === "high"
                              ? "bg-red-100 text-red-700"
                              : item.severity === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {item.severity} Risk
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.warning}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}

            {results.alternatives.length > 0 && (
              <Card className="p-5 shadow-md bg-emerald-50 border-emerald-200">
                <h4 className="font-semibold text-sm text-emerald-950 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Suggested Safer Alternatives
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.alternatives.map((alt: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white border border-emerald-300 rounded-full text-xs font-semibold text-emerald-900"
                    >
                      {alt}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {results.precautions && results.precautions.length > 0 && (
              <Card className="p-4 shadow-card">
                <h4 className="font-semibold text-sm mb-2">Usage & Dietary Precautions:</h4>
                <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                  {results.precautions.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MedicationAssistant;
