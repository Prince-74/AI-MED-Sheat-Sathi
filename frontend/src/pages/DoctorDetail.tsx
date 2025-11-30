import { ArrowLeft, Star, MapPin, Phone, Video, MessageSquare, Clock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useDoctorStore } from "@/store/doctorStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const DoctorDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currentDoctor, fetchDoctorById, loading } = useDoctorStore();

  useEffect(() => {
    if (id) {
      fetchDoctorById(id);
    }
  }, [id, fetchDoctorById]);

  const doctor = currentDoctor;

  const fullAddress = doctor?.hospitalInfo
    ? [doctor.hospitalInfo.name, doctor.hospitalInfo.address, doctor.hospitalInfo.city].filter(Boolean).join(", ")
    : null;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="relative">
        <div className="h-64 bg-gradient-to-b from-primary to-primary/90 rounded-b-[2rem]" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-8 left-6 w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-lg"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <Card className="absolute -bottom-24 left-6 right-6 p-6 shadow-lg">
          {loading ? (
            <div className="animate-pulse flex gap-4">
              <div className="w-24 h-24 bg-muted rounded-2xl" />
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </div>
            </div>
          ) : doctor ? (
            <div className="flex gap-4 items-center">
              <Avatar className="w-24 h-24 rounded-2xl">
                <AvatarImage src={doctor.profileImage} alt={doctor.name} />
                <AvatarFallback className="rounded-2xl text-lg font-semibold">
                  {doctor.name?.split(" ")
                    .map((part) => part.charAt(0).toUpperCase())
                    .slice(0, 2)
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">{doctor.name}</h1>
                  <Badge variant="secondary" className="capitalize">{doctor.specialization || "General Practitioner"}</Badge>
                </div>
                {doctor.experience !== undefined && (
                  <p className="text-sm text-muted-foreground">{doctor.experience} years experience</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {doctor.hospitalInfo?.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {doctor.hospitalInfo.city}
                    </span>
                  )}
                  {doctor.fees !== undefined && (
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-accent" /> ₹{doctor.fees}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Doctor information not available.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Content */}
      <div className="px-6 mt-32 space-y-6">
        {loading && (
          <Card className="p-4 animate-pulse">
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-4/5" />
            </div>
          </Card>
        )}

        {/* About */}
        {doctor?.about && (
          <div>
            <h2 className="text-lg font-bold mb-3">About</h2>
            <Card className="p-4">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {doctor.about}
              </p>
            </Card>
          </div>
        )}

        {/* Contact Options */}
        <div>
          <h2 className="text-lg font-bold mb-3">Contact</h2>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-card-hover transition-smooth">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                <Phone className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs font-medium">Call</span>
            </Card>
            <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-card-hover transition-smooth">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                <Video className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs font-medium">Video</span>
            </Card>
            <Card className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-card-hover transition-smooth">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs font-medium">Message</span>
            </Card>
          </div>
        </div>

        {doctor?.dailyTimeRanges && doctor.dailyTimeRanges.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3">Availability</h2>
            <Card className="p-4 space-y-3">
              {doctor.dailyTimeRanges.map((range, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Slot {index + 1}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {range.start} - {range.end}
                  </span>
                </div>
              ))}
              {doctor.availabilityRange?.startDate && doctor.availabilityRange?.endDate && (
                <div className="text-xs text-muted-foreground">
                  Available from {new Date(doctor.availabilityRange.startDate).toLocaleDateString()} to {new Date(doctor.availabilityRange.endDate).toLocaleDateString()}
                </div>
              )}
            </Card>
          </div>
        )}

        {fullAddress && (
          <div>
            <h2 className="text-lg font-bold mb-3">Hospital / Clinic</h2>
            <Card className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{doctor?.hospitalInfo?.name}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{fullAddress}</p>
              </div>
            </Card>
          </div>
        )}

        <Button className="w-full" size="lg" disabled={!doctor}>
          Book Appointment
        </Button>
      </div>
    </div>
  );
};

export default DoctorDetail;
