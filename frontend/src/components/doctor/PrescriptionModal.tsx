import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prescription: string, notes: string) => Promise<void>;
  patientName: string;
  loading?: boolean;
}

const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  patientName,
  loading,
}) => {
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await onSave(prescription, notes);
      setPrescription("");
      setNotes("");
    } catch (error) {
      console.error("Failed to save prescription:", error);
    }
  };

  const handleClose = () => {
    setPrescription("");
    setNotes("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <CardTitle>Complete Consultation</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
            <AlertTitle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">
                Confirm Consultation Completion
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Are you sure you want to mark the consultation with{" "}
                <strong>{patientName}</strong> as completed?
              </p>
            </div>
          </div>

          {/* Prescription Field */}
          <div className="space-y-2">
            <Label htmlFor="prescription" className="text-sm font-medium">
              Prescription <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="prescription"
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="Enter prescription details, medications, dosages, and instructions"
              rows={6}
              className="min-h-[120px]"
              required
            />
            <p className="text-xs text-gray-500">
              Include medication names, dosages, frequency, and any special instructions.
            </p>
          </div>

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about the consultation, follow-up instructions, etc..."
              rows={4}
              className="min-h-[120px]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!prescription.trim() || loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save to Complete
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrescriptionModal;
