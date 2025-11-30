import React, { ChangeEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { userAuthStore } from "@/store/authStore";
import { DoctorFormData, HospitalInfo } from "@/lib/type";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { healthcareCategoriesList, specializations } from "@/lib/constant";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const DoctorOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<DoctorFormData>({
    specialization: "",
    categories: [],
    qualification: "",
    experience: "",
    fees: "",
    about: "",
    hospitalInfo: { name: "", address: "", city: "" },
    availabilityRange: { startDate: "", endDate: "", excludedWeekdays: [] },
    dailyTimeRanges: [
      { start: "09:00", end: "12:00" },
      { start: "14:00", end: "17:00" },
    ],
    slotDurationMinutes: 30,
  });

  const { updateProfile, user, loading } = userAuthStore();
  const navigate = useNavigate();

  const handleCategoryToggle = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHospitalChange = (field: keyof HospitalInfo, value: string) => {
    setFormData((prev) => ({
      ...prev,
      hospitalInfo: { ...prev.hospitalInfo, [field]: value },
    }));
  };

  const handleSubmit = async () => {
    try {
      const availabilityRange =
        formData.availabilityRange.startDate && formData.availabilityRange.endDate
          ? {
              startDate: new Date(formData.availabilityRange.startDate),
              endDate: new Date(formData.availabilityRange.endDate),
              excludedWeekdays: formData.availabilityRange.excludedWeekdays,
            }
          : undefined;

      await updateProfile({
        specialization: formData.specialization,
        category: formData.categories,
        qualification: formData.qualification,
        experience: formData.experience ? Number(formData.experience) : undefined,
        about: formData.about,
        fees: formData.fees ? Number(formData.fees) : undefined,
        hospitalInfo: formData.hospitalInfo,
        ...(availabilityRange ? { availabilityRange } : {}),
        dailyTimeRanges: formData.dailyTimeRanges,
        slotDurationMinutes: formData.slotDurationMinutes,
      });
      navigate("/doctor/dashboard");
    } catch (error) {
      console.error("Profile update failed", error);
    }
  };

  const handleNext = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
  const handlePrevious = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="w-full max-w-2xl mx-auto py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome {user?.name}, let’s set up your Doctor Profile
        </h1>
        <p className="text-gray-600">Complete your setup to start receiving appointments</p>
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-8">
          {/* STEP 1 */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4 text-blue-700">
                Professional Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Medical Specialization</Label>
                  <Select
                    value={formData.specialization}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, specialization: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Years of Experience</Label>
                  <Input
                    name="experience"
                    type="number"
                    value={formData.experience}
                    onChange={handleInputChange}
                    placeholder="e.g., 5"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Healthcare Categories</Label>
                <p className="text-sm text-gray-600">
                  Select the categories you serve (choose at least one)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {healthcareCategoriesList.map((category) => (
                    <div className="flex items-center space-x-2" key={category}>
                      <Checkbox
                        id={category}
                        checked={formData.categories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <label htmlFor={category} className="text-sm cursor-pointer">
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Qualification</Label>
                <Input
                  name="qualification"
                  type="text"
                  placeholder="e.g., MBBS, MD"
                  value={formData.qualification}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label>About You</Label>
                <Textarea
                  name="about"
                  rows={3}
                  placeholder="Tell patients about your expertise..."
                  value={formData.about}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label>Consultation Fee (₹)</Label>
                <Input
                  name="fees"
                  type="number"
                  value={formData.fees}
                  placeholder="e.g., 500"
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-blue-700 mb-4">
                Hospital / Clinic Information
              </h2>
              <Input
                placeholder="Hospital/Clinic Name"
                value={formData.hospitalInfo.name}
                onChange={(e) => handleHospitalChange("name", e.target.value)}
              />
              <Textarea
                placeholder="Full address of your clinic/hospital"
                value={formData.hospitalInfo.address}
                onChange={(e) => handleHospitalChange("address", e.target.value)}
                rows={3}
              />
              <Input
                placeholder="City"
                value={formData.hospitalInfo.city}
                onChange={(e) => handleHospitalChange("city", e.target.value)}
              />
            </div>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-blue-700 mb-4">
                Availability Settings
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label>Available From</Label>
                  <Input
                    type="date"
                    value={formData.availabilityRange.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        availabilityRange: { ...prev.availabilityRange, startDate: e.target.value },
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Available Until</Label>
                  <Input
                    type="date"
                    value={formData.availabilityRange.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        availabilityRange: { ...prev.availabilityRange, endDate: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Slot Duration</Label>
                <Select
                  value={formData.slotDurationMinutes.toString()}
                  onValueChange={(val) =>
                    setFormData((prev) => ({
                      ...prev,
                      slotDurationMinutes: parseInt(val),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 45, 60].map((min) => (
                      <SelectItem key={min} value={min.toString()}>
                        {min} minutes
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Unavailable Days</Label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={formData.availabilityRange.excludedWeekdays.includes(index)}
                        onCheckedChange={(checked) => {
                          const updated = checked
                            ? [...formData.availabilityRange.excludedWeekdays, index]
                            : formData.availabilityRange.excludedWeekdays.filter((d) => d !== index);
                          setFormData((prev) => ({
                            ...prev,
                            availabilityRange: { ...prev.availabilityRange, excludedWeekdays: updated },
                          }));
                        }}
                      />
                      <label htmlFor={day} className="text-sm">
                        {day}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NAVIGATION BUTTONS */}
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

export default DoctorOnboarding;
