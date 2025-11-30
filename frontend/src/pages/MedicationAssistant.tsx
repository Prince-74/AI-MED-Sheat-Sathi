import { ArrowLeft, Pill, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useState } from "react";

interface Interaction {
  drugs: string;
  severity: "high" | "medium" | "low";
  warning: string;
}

interface InteractionResults {
  interactions: Interaction[];
  alternatives: string[];
}

const MedicationAssistant = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState("");
  const [results, setResults] = useState<InteractionResults | null>(null);

  const checkInteractions = () => {
    // Mock interaction check
    setResults({
      interactions: [
        {
          drugs: "Aspirin + Ibuprofen",
          severity: "high",
          warning: "May increase risk of stomach bleeding",
        },
        {
          drugs: "Paracetamol + Multivitamin",
          severity: "low",
          warning: "Safe to take together",
        },
      ],
      alternatives: ["Acetaminophen", "Naproxen"],
    });
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
          <h1 className="text-2xl font-bold">Medication Assistant</h1>
          <div className="w-12" />
        </div>
      </div>

      <div className="px-6 mt-6">
        {/* Input Section */}
        <Card className="p-5 shadow-card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Enter Your Medicines</h3>
          </div>
          <Input
            placeholder="E.g., Aspirin, Paracetamol, Vitamin D..."
            value={medicines}
            onChange={(e) => setMedicines(e.target.value)}
            className="mb-3"
          />
          <Button onClick={checkInteractions} className="w-full">
            Check Interactions
          </Button>
        </Card>

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Interaction Analysis</h3>
            {results.interactions.map((item: Interaction, idx: number) => (
              <Card
                key={idx}
                className={`p-4 shadow-md border-l-4 ${
                  item.severity === "high"
                    ? "border-l-red-500 bg-red-50"
                    : item.severity === "medium"
                    ? "border-l-yellow-500 bg-yellow-50"
                    : "border-l-green-500 bg-green-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {item.severity === "high" ? (
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold mb-1">{item.drugs}</p>
                    <p className="text-sm text-muted-foreground">{item.warning}</p>
                  </div>
                </div>
              </Card>
            ))}

            {results.alternatives.length > 0 && (
              <Card className="p-5 shadow-md bg-green-light">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-accent" />
                  Safe Alternatives
                </h4>
                <div className="flex flex-wrap gap-2">
                  {results.alternatives.map((alt: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white rounded-full text-sm font-medium"
                    >
                      {alt}
                    </span>
                  ))}
                </div>
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
