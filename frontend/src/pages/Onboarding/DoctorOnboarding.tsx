import React, { ChangeEvent, useState, useEffect } from "react";
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
import { Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

const DoctorOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const { updateProfile, user, loading, fetchProfile } = userAuthStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<DoctorFormData>({
    specialization: "",
    categories: [],
    qualification: "",
    experience: "",
    fees: "500",
    about: "",
    hospitalInfo: { name: "", address: "", city: "" },
    availabilityRange: { startDate: "", endDate: "", excludedWeekdays: [] },
    dailyTimeRanges: [
      { start: "09:00", end: "13:00" },
      { start: "14:00", end: "20:00" },
    ],
    slotDurationMinutes: 30,
  });

  useEffect(() => {
    fetchProfile().catch(() => {});
  }, [fetchProfile]);

  useEffect(() => {
    if (user && user.type && user.type !== "doctor") {
      toast.error("You are logged in as a Patient. Please log in with a Doctor account to edit doctor profile.");
      navigate("/signin/doctor");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (user && user.type === "doctor") {
      setFormData((prev) => ({
        ...prev,
        specialization: user.specialization || prev.specialization,
        categories: user.category || prev.categories,
        qualification: user.qualification || prev.qualification,
        experience: user.experience !== undefined ? String(user.experience) : prev.experience,
        fees: user.fees !== undefined ? String(user.fees) : "500",
        about: user.about || prev.about,
        hospitalInfo: {
          name: user.hospitalInfo?.name || prev.hospitalInfo.name,
          address: user.hospitalInfo?.address || prev.hospitalInfo.address,
          city: user.hospitalInfo?.city || prev.hospitalInfo.city,
        },
        availabilityRange: {
          startDate: user.availabilityRange?.startDate
            ? String(user.availabilityRange.startDate).slice(0, 10)
            : prev.availabilityRange.startDate,
          endDate: user.availabilityRange?.endDate
            ? String(user.availabilityRange.endDate).slice(0, 10)
            : prev.availabilityRange.endDate,
          excludedWeekdays: user.availabilityRange?.excludedWeekdays || prev.availabilityRange.excludedWeekdays,
        },
        dailyTimeRanges: user.dailyTimeRanges && user.dailyTimeRanges.length > 0
          ? user.dailyTimeRanges
          : prev.dailyTimeRanges,
        slotDurationMinutes: user.slotDurationMinutes || prev.slotDurationMinutes,
      }));
    }
  }, [user]);

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

  const handleTimeRangeChange = (index: number, field: "start" | "end", value: string) => {
    setFormData((prev) => {
      const ranges = [...prev.dailyTimeRanges];
      ranges[index] = { ...ranges[index], [field]: value };
      return { ...prev, dailyTimeRanges: ranges };
    });
  };

  const handleAddTimeRange = () => {
    setFormData((prev) => ({
      ...prev,
      dailyTimeRanges: [...prev.dailyTimeRanges, { start: "09:00", end: "13:00" }],
    }));
  };

  const handleRemoveTimeRange = (index: number) => {
    if (formData.dailyTimeRanges.length <= 1) {
      toast.error("You must have at least one working hours shift");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      dailyTimeRanges: prev.dailyTimeRanges.filter((_, i) => i !== index),
    }));
  };

  const handleApplyPresetSchedule = (ranges: Array<{ start: string; end: string }>) => {
    setFormData((prev) => ({
      ...prev,
      dailyTimeRanges: ranges,
    }));
    toast.success("Schedule preset applied!");
  };

  const handleSubmit = async () => {
    try {
      const availabilityRange =
        formData.availabilityRange.startDate && formData.availabilityRange.endDate
          ? {
              startDate: formData.availabilityRange.startDate,
              endDate: formData.availabilityRange.endDate,
              excludedWeekdays: formData.availabilityRange.excludedWeekdays,
            }
          : undefined;

      const payload: Record<string, unknown> = {
        specialization: formData.specialization || "General Physician",
        category: formData.categories,
        qualification: formData.qualification || "",
        experience: formData.experience ? Number(formData.experience) : 0,
        about: formData.about || "",
        fees: formData.fees ? Number(formData.fees) : 500,
        hospitalInfo: formData.hospitalInfo,
        dailyTimeRanges: formData.dailyTimeRanges,
        slotDurationMinutes: formData.slotDurationMinutes || 30,
      };

      if (availabilityRange) {
        payload.availabilityRange = availabilityRange;
      }

      await updateProfile(payload);
      toast.success("Profile and availability updated successfully!");
      navigate("/doctor/dashboard");
    } catch (error: any) {
      console.error("Profile update failed", error);
      const rawMsg = error?.response?.data?.message || error?.message || "Failed to update profile";
      if (rawMsg.toLowerCase().includes("requires doctor role") || rawMsg.toLowerCase().includes("access denied")) {
        toast.error("Session Error: You are logged in as a Patient. Please log in as a Doctor.");
        navigate("/signin/doctor");
      } else {
        toast.error(rawMsg);
      }
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
              <div className="border-b pb-3">
                <h2 className="text-xl font-semibold text-blue-700">
                  Availability & Working Hours
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Configure your consultation hours and appointment slot duration. Patients will be able to book slots during these times.
                </p>
              </div>

              {/* Working Hours / Daily Shifts */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-xl border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-bold">Daily Working Hours / Shifts</Label>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTimeRange}
                    className="h-8 text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Shift
                  </Button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 pt-1 pb-2">
                  <span className="text-[11px] text-muted-foreground self-center">Presets:</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPresetSchedule([
                        { start: "09:00", end: "13:00" },
                        { start: "14:00", end: "20:00" },
                      ])
                    }
                    className="text-[11px] px-2.5 py-1 bg-secondary rounded-lg hover:bg-primary/10 transition-colors border"
                  >
                    Full Day (9 AM - 8 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPresetSchedule([{ start: "09:00", end: "17:00" }])
                    }
                    className="text-[11px] px-2.5 py-1 bg-secondary rounded-lg hover:bg-primary/10 transition-colors border"
                  >
                    Standard (9 AM - 5 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPresetSchedule([{ start: "16:00", end: "21:00" }])
                    }
                    className="text-[11px] px-2.5 py-1 bg-secondary rounded-lg hover:bg-primary/10 transition-colors border"
                  >
                    Evening Clinic (4 PM - 9 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleApplyPresetSchedule([{ start: "08:00", end: "22:00" }])
                    }
                    className="text-[11px] px-2.5 py-1 bg-secondary rounded-lg hover:bg-primary/10 transition-colors border"
                  >
                    Extended (8 AM - 10 PM)
                  </button>
                </div>

                {/* List of active time ranges */}
                <div className="space-y-2.5">
                  {formData.dailyTimeRanges.map((range, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-card rounded-lg border shadow-xs"
                    >
                      <span className="text-xs font-semibold text-muted-foreground min-w-[50px]">
                        Shift {idx + 1}:
                      </span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-muted-foreground block mb-0.5">Start Time</span>
                          <Input
                            type="time"
                            value={range.start}
                            onChange={(e) => handleTimeRangeChange(idx, "start", e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block mb-0.5">End Time</span>
                          <Input
                            type="time"
                            value={range.end}
                            onChange={(e) => handleTimeRangeChange(idx, "end", e.target.value)}
                            className="h-9 text-xs"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTimeRange(idx)}
                        disabled={formData.dailyTimeRanges.length <= 1}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                        title="Delete Shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slot Duration */}
              <div className="space-y-2">
                <Label>Slot Duration per Patient</Label>
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
                <p className="text-[11px] text-muted-foreground">
                  Each appointment slot will be generated according to this session duration.
                </p>
              </div>

              {/* Optional Date Range Filter */}
              <div className="grid md:grid-cols-2 gap-4 pt-2">
                <div>
                  <Label>Available From (Optional)</Label>
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
                  <Label>Available Until (Optional)</Label>
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

              {/* Excluded Weekdays */}
              <div className="space-y-3 pt-2">
                <Label>Unavailable Days (Days Off)</Label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-muted/20 rounded-md border">
                      <Checkbox
                        id={`day-${day}`}
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
                      <label htmlFor={`day-${day}`} className="text-xs font-medium cursor-pointer">
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
                {loading ? "Saving Schedule..." : "Save Profile & Working Hours"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoctorOnboarding;
