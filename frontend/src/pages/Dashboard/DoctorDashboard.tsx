import React, { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { userAuthStore } from "@/store/authStore";
import { useDoctorStore } from "@/store/doctorStore";
import { Appointment, useAppointmentStore } from "@/store/appointmentStore";
import {
  Activity,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  MapPin,
  Phone,
  Plus,
  Star,
  Users,
  Video,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import PrescriptionModal from "../../components/doctor/PrescriptionModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const DoctorDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = userAuthStore();
  const { dashboard: dashboardData, fetchDashboard, loading, error } = useDoctorStore();
  const {
    endConsultation,
    fetchAppointmentById,
    currentAppointment,
    acceptAppointment,
    rejectAppointment,
  } = useAppointmentStore();

  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [completingAppointmentId, setCompletingAppointmentId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const completedCallId = searchParams.get("completedCall");

    if (completedCallId) {
      setCompletingAppointmentId(completedCallId);
      fetchAppointmentById(completedCallId);
      setShowPrescriptionModal(true);
    }
  }, [location.search, fetchAppointmentById]);

  useEffect(() => {
    if (user?.type === "doctor") {
      fetchDashboard().catch(() => {});
    }
  }, [user, fetchDashboard]);

  const handleAccept = async (appointmentId: string) => {
    setActionLoading(appointmentId);
    try {
      await acceptAppointment(appointmentId);
      toast.success("Appointment request accepted & confirmed!");
      fetchDashboard();
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept appointment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (appointmentId: string) => {
    const reason = prompt("Enter rejection reason (optional):") || "";
    setActionLoading(appointmentId);
    try {
      await rejectAppointment(appointmentId, reason);
      toast.success("Appointment request rejected");
      fetchDashboard();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject appointment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSavePrescription = async (prescription: string, notes: string) => {
    if (!completingAppointmentId) return;
    try {
      await endConsultation(completingAppointmentId, prescription, notes);
      toast.success("Consultation completed & prescription saved");
      setShowPrescriptionModal(false);
      setCompletingAppointmentId(null);
      fetchDashboard();
      navigate(location.pathname, { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Failed to complete consultation");
    }
  };

  const handleCloseModal = () => {
    setShowPrescriptionModal(false);
    setCompletingAppointmentId(null);
    navigate(location.pathname, { replace: true });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatFullDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
      case "In Progress":
        return "bg-amber-100 text-amber-800 border-amber-300 animate-pulse";
      case "CONFIRMED":
      case "Scheduled":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "COMPLETED":
      case "Completed":
        return "bg-green-100 text-green-800 border-green-300";
      case "CANCELLED":
      case "Cancelled":
        return "bg-gray-100 text-gray-700 border-gray-300";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading && !dashboardData) {
    return (
      <>
        <Header showDashboardNav={true} />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-8">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-300 rounded-full" />
                <div className="space-y-2">
                  <div className="h-8 bg-gray-300 rounded w-64" />
                  <div className="h-4 bg-gray-300 rounded w-48" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 bg-gray-300 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error && !dashboardData) {
    return (
      <>
        <Header showDashboardNav={true} />
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-8 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Unable to load dashboard</h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => fetchDashboard()}>Retry</Button>
          </Card>
        </div>
      </>
    );
  }

  const statsCards = [
    {
      title: "Pending Requests",
      value: (dashboardData?.stats?.pendingCount ?? 0).toString(),
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      changeText: "Requires review",
    },
    {
      title: "Today's Schedule",
      value: (dashboardData?.stats?.todayAppointments ?? 0).toString(),
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50",
      changeText: "Active visits today",
    },
    {
      title: "Completed Visits",
      value: (dashboardData?.stats?.completedAppointments ?? 0).toString(),
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      changeText: "Total consultations",
    },
    {
      title: "Total Revenue",
      value: `?${(dashboardData?.stats?.totalRevenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      changeText: "Earned from completed visits",
    },
  ];

  return (
    <>
      <Header showDashboardNav={true} />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pt-16 pb-24">
        <div className="container mx-auto px-4 py-8">
          {/* Doctor Header Banner */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Avatar className="w-16 h-16 md:w-20 md:h-20 ring-4 ring-blue-100">
                <AvatarImage
                  src={dashboardData?.user?.profileImage}
                  alt={dashboardData?.user?.name}
                />
                <AvatarFallback className="bg-primary text-white font-bold text-lg">
                  {dashboardData?.user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-900">
                  Dr. {dashboardData?.user?.name}
                </h1>
                <p className="text-gray-600 text-xs md:text-sm">
                  {dashboardData?.user?.specialization || "Medical Specialist"} • Consultation Fee: ?{dashboardData?.user?.fees || 0}
                </p>
                <div className="flex items-center space-x-3 mt-1.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {dashboardData?.user?.hospitalInfo?.name || "Clinic"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    {dashboardData?.stats?.averageRating || "4.9"} (Verified)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Link to="/doctor/appointments">
                <Button variant="outline" size="sm">
                  All Appointments
                </Button>
              </Link>
              <Link to="/profile">
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-white">
                  Update Availability
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statsCards.map((stat, index) => (
              <Card key={index} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {stat.changeText}
                      </p>
                    </div>
                    <div
                      className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}
                    >
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pending Appointment Requests Queue */}
          {dashboardData?.pendingAppointments && dashboardData.pendingAppointments.length > 0 && (
            <Card className="mb-8 border-2 border-amber-300 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between bg-amber-50/50 pb-3">
                <CardTitle className="text-base font-bold text-amber-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <span>Pending Appointment Requests ({dashboardData.pendingAppointments.length})</span>
                </CardTitle>
                <Badge className="bg-amber-500 text-white">Action Required</Badge>
              </CardHeader>
              <CardContent className="p-4 divide-y">
                {dashboardData.pendingAppointments.map((apt: any) => (
                  <div
                    key={apt._id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {apt.patientId?.name || "Patient"}
                        </span>
                        {apt.patientId?.age && (
                          <span className="text-xs text-muted-foreground">({apt.patientId.age} yrs)</span>
                        )}
                        <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">PENDING</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatFullDate(apt.slotStartIso)}
                        </span>
                        <span>•</span>
                        <span>{apt.consultationType || "Video Consultation"}</span>
                      </div>
                      {apt.symptoms && (
                        <p className="text-xs text-muted-foreground line-clamp-1 italic">
                          "{apt.symptoms}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                        disabled={actionLoading === apt._id}
                        onClick={() => handleAccept(apt._id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 text-xs"
                        disabled={actionLoading === apt._id}
                        onClick={() => handleReject(apt._id)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Reject
                      </Button>
                      <Link to={`/appointments/${apt._id}`}>
                        <Button size="sm" variant="ghost" className="text-xs">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Appointment sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Today’s Schedule */}
            <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>Today's Consultations</span>
                  <Badge variant="secondary" className="ml-2">
                    {dashboardData?.todayAppointments?.length || 0}
                  </Badge>
                </CardTitle>
                <Link to="/doctor/appointments">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View All <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="space-y-3 pt-2">
                {dashboardData?.todayAppointments && dashboardData.todayAppointments.length > 0 ? (
                  dashboardData.todayAppointments.map((appointment: any) => {
                    const isJoinable =
                      appointment.status === "CONFIRMED" ||
                      appointment.status === "UPCOMING" ||
                      appointment.status === "IN_PROGRESS" ||
                      appointment.status === "Scheduled";

                    return (
                      <div
                        key={appointment?._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between sm:justify-start gap-2">
                            <h4 className="font-bold text-sm text-foreground">
                              {appointment?.patientId?.name || "Patient"}
                            </h4>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getBadgeStyle(
                                appointment.status
                              )}`}
                            >
                              {appointment.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDate(appointment.slotStartIso)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {appointment.consultationType === "Voice Call" || appointment.consultationType === "AUDIO" ? (
                                <Phone className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Video className="w-3.5 h-3.5 text-blue-600" />
                              )}
                              <span>{appointment.consultationType || "Video Consultation"}</span>
                            </span>
                          </div>

                          {appointment?.symptoms && (
                            <p className="text-xs text-muted-foreground line-clamp-1 italic">
                              "{appointment.symptoms}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isJoinable && (
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90 text-white text-xs"
                              onClick={() => navigate(`/call/${appointment._id}`)}
                            >
                              <Video className="w-3.5 h-3.5 mr-1.5" />
                              Start Call
                            </Button>
                          )}
                          <Link to={`/appointments/${appointment._id}`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10">
                    <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold mb-1">No appointments scheduled for today</h3>
                    <p className="text-xs text-muted-foreground">
                      Upcoming appointments will appear here automatically.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sidebar: Upcoming Visits & Overview */}
            <div className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-bold flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Upcoming Visits</span>
                  </CardTitle>
                  <Link to="/doctor/appointments">
                    <Button variant="ghost" size="sm" className="text-xs">
                      All
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {dashboardData?.upcomingAppointments && dashboardData.upcomingAppointments.length > 0 ? (
                    dashboardData.upcomingAppointments.map((apt: any) => (
                      <div
                        key={apt._id}
                        className="p-3 border rounded-lg hover:bg-muted/40 transition-colors text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">{apt.patientId?.name || "Patient"}</span>
                          <span className="text-primary font-medium">{formatDate(apt.slotStartIso)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(apt.slotStartIso).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          • {apt.consultationType}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No upcoming visits
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Working Hours Summary */}
              <Card className="shadow-sm p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-muted-foreground">My Daily Schedule</h4>
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Working Hours:</span>
                    <span className="font-semibold">
                      {dashboardData?.user?.dailyTimeRanges?.[0]
                        ? `${dashboardData.user.dailyTimeRanges[0].start} - ${dashboardData.user.dailyTimeRanges[0].end}`
                        : "09:00 - 17:00"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slot Duration:</span>
                    <span className="font-semibold">
                      {dashboardData?.user?.slotDurationMinutes || 30} minutes
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consultation Fee:</span>
                    <span className="font-bold text-accent">
                      ?{dashboardData?.user?.fees || 0}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <PrescriptionModal
        isOpen={showPrescriptionModal}
        onClose={handleCloseModal}
        onSave={handleSavePrescription}
        patientName={currentAppointment?.patientId?.name}
      />
    </>
  );
};

export default DoctorDashboard;
