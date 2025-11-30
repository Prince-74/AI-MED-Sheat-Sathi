import React, { ChangeEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userAuthStore } from "@/store/authStore";
import { Phone, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}
interface MedicalHistory {
  allergies: string;
  currentMedications: string;
  chronicConditions: string;
}
interface PatientOnboardingData {
  phone: string;
  dob: string;
  gender: string;
  bloodGroup?: string;
  emergencyContact: EmergencyContact;
  medicalHistory: MedicalHistory;
}

const PatientOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PatientOnboardingData>({
    phone: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    emergencyContact: { name: "", phone: "", relationship: "" },
    medicalHistory: { allergies: "", currentMedications: "", chronicConditions: "" },
  });

  const { updateProfile, user, loading } = userAuthStore();
  const navigate = useNavigate();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmergencyChange = (field: keyof EmergencyContact, value: string) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value },
    }));
  };

  const handleMedicalChange = (field: keyof MedicalHistory, value: string) => {
    setFormData((prev) => ({
      ...prev,
      medicalHistory: { ...prev.medicalHistory, [field]: value },
    }));
  };

  const handleSubmit = async () => {
    try {
      await updateProfile({
        Phone: formData.phone,
        dob: formData.dob,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        emergencyContact: formData.emergencyContact,
        medicalHistory: formData.medicalHistory,
      });
      navigate("/patient/home");
    } catch (error) {
      console.error("Profile update failed", error);
    }
  };

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
  const handlePrevious = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="w-full max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome {user?.name} to AI-MED
        </h1>
        <p className="text-gray-600">Complete your profile to start booking appointments</p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`w-20 h-1 ${
                  currentStep > step ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Basic Information</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input name="dob" type="date" value={formData.dob} onChange={handleInputChange} />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val) => handleSelectChange("gender", val)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Blood Group</Label>
                  <Select
                    value={formData.bloodGroup}
                    onValueChange={(val) => handleSelectChange("bloodGroup", val)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((grp) => (
                        <SelectItem key={grp} value={grp}>{grp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <Phone className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Emergency Contact</h2>
              </div>
              <Alert>
                <AlertDescription>
                  This contact will be notified in case of medical emergency.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Input
                  placeholder="Full Name"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleEmergencyChange("name", e.target.value)}
                />
                <Input
                  placeholder="Phone Number"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleEmergencyChange("phone", e.target.value)}
                />
                <Select
                  value={formData.emergencyContact.relationship}
                  onValueChange={(val) => handleEmergencyChange("relationship", val)}
                >
                  <SelectTrigger><SelectValue placeholder="Relationship" /></SelectTrigger>
                  <SelectContent>
                    {["Spouse", "Parent", "Child", "Sibling", "Friend", "Other"].map((rel) => (
                      <SelectItem key={rel} value={rel.toLowerCase()}>{rel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <Phone className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold">Medical Information</h2>
              </div>
              <Alert>
                <AlertDescription>
                  This helps doctors personalize your care. Your data is confidential.
                </AlertDescription>
              </Alert>
              <Textarea
                placeholder="Known Allergies (or 'None')"
                value={formData.medicalHistory.allergies}
                onChange={(e) => handleMedicalChange("allergies", e.target.value)}
              />
              <Textarea
                placeholder="Current Medications (or 'None')"
                value={formData.medicalHistory.currentMedications}
                onChange={(e) => handleMedicalChange("currentMedications", e.target.value)}
              />
              <Textarea
                placeholder="Chronic Conditions (or 'None')"
                value={formData.medicalHistory.chronicConditions}
                onChange={(e) => handleMedicalChange("chronicConditions", e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-between pt-8">
            <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
              Previous
            </Button>
            {currentStep < 3 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? "Completing Setup..." : "Complete Profile"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientOnboarding;
