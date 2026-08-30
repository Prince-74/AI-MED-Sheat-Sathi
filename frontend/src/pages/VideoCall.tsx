import { useEffect, useRef, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";
import { userAuthStore } from "@/store/authStore";
import PrescriptionModal from "@/components/doctor/PrescriptionModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Video,
  Phone,
  Mic,
  ShieldCheck,
  User,
  Clock,
  AlertCircle,
} from "lucide-react";
import { postWithAuth } from "@/service/httpService";
import { io as socketIo, Socket } from "socket.io-client";

interface ConsultationTokenData {
  appId: number;
  token: string;
  roomId: string;
  userId: string;
  userName: string;
  role: "doctor" | "patient";
  consultationType: "VIDEO" | "AUDIO";
  startedAt: string;
  slotStartIso?: string;
  slotEndIso?: string;
  doctor?: { id: string; name: string; specialization?: string };
  patient?: { id: string; name: string };
}

const VideoCall = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zpInstanceRef = useRef<ZegoUIKitPrebuilt | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const { user } = userAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<ConsultationTokenData | null>(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [partnerPresence, setPartnerPresence] = useState<"WAITING" | "CONNECTED" | "DISCONNECTED">(
    "WAITING"
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // 1. Authenticate & Join Telehealth Room via Backend
  useEffect(() => {
    if (!appointmentId) return;

    let mounted = true;

    const joinRoom = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await postWithAuth(`/telehealth/${appointmentId}/join`, {});

        if (!mounted) return;
        const data = response.data as ConsultationTokenData;
        setTokenData(data);
      } catch (err: unknown) {
        if (!mounted) return;
        const errMsg =
          err instanceof Error
            ? err.message
            : "Failed to join consultation room";
        setError(errMsg);
        toast.error(errMsg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    joinRoom();

    return () => {
      mounted = false;
    };
  }, [appointmentId]);

  // 2. Initialize Socket.IO for Live Presence & Consultation Events
  useEffect(() => {
    if (!appointmentId || !user || !tokenData) return;

    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "")
      : window.location.origin;

    const socket = socketIo(socketUrl, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.emit("consultation_joined", {
      appointmentId,
      userId: tokenData.userId,
      role: tokenData.role,
      name: tokenData.userName,
    });

    socket.on("participant_presence", (data) => {
      if (data.userId !== tokenData.userId) {
        setPartnerPresence(data.status === "CONNECTED" ? "CONNECTED" : "DISCONNECTED");
        if (data.status === "CONNECTED") {
          toast.info(`${data.name} has joined the consultation`);
        } else {
          toast.info(`${data.name} left the room`);
        }
      }
    });

    socket.on("consultation_ended", () => {
      toast.info("The consultation session has concluded.");
      if (user.type !== "doctor") {
        navigate("/bookings");
      }
    });

    return () => {
      socket.emit("consultation_left", {
        appointmentId,
        userId: tokenData.userId,
        role: tokenData.role,
      });
      socket.disconnect();
    };
  }, [appointmentId, user, tokenData, navigate]);

  // 3. Call Duration Timer (derived from server startedAt to prevent drift)
  useEffect(() => {
    if (!tokenData?.startedAt) return;

    const startTime = new Date(tokenData.startedAt).getTime();

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsedSeconds(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [tokenData?.startedAt]);

  const formattedTimer = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [elapsedSeconds]);

  // 4. Initialize ZegoUIKit using ONLY backend-generated kitToken
  useEffect(() => {
    if (!tokenData || !containerRef.current) return;

    try {
      // Production token generator: builds kitToken from server Token04 without needing serverSecret
      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
        tokenData.appId,
        tokenData.token,
        tokenData.roomId,
        tokenData.userId,
        tokenData.userName
      );

      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zpInstanceRef.current = zp;

      const isAudioOnly = tokenData.consultationType === "AUDIO";

      zp.joinRoom({
        container: containerRef.current,
        scenario: {
          mode: ZegoUIKitPrebuilt.OneONoneCall,
        },
        showPreJoinView: false,
        showScreenSharingButton: !isAudioOnly,
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: !isAudioOnly,
        showTextChat: true,
        showUserList: false,
        maxUsers: 2,
        layout: "Auto",
        onLeaveRoom: () => {
          if (tokenData.role === "doctor") {
            setShowPrescriptionModal(true);
          } else {
            toast.success("Consultation session ended");
            navigate("/bookings");
          }
        },
      });
    } catch (err) {
      console.error("Zego initialization error:", err);
      toast.error("Failed to initialize video media streams");
    }

    return () => {
      if (zpInstanceRef.current) {
        try {
          zpInstanceRef.current.destroy();
        } catch (e) {
          console.error("Failed to destroy Zego UI instance", e);
        }
      }
    };
  }, [tokenData, navigate]);

  const handleSavePrescription = async (prescription: string, notes: string) => {
    if (!appointmentId) return;
    try {
      await postWithAuth(`/telehealth/${appointmentId}/end`, {
        prescription,
        notes,
      });
      toast.success("Consultation completed & prescription saved");
      setShowPrescriptionModal(false);
      navigate("/doctor/dashboard");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to complete consultation";
      toast.error(errMsg);
    }
  };

  const handleCloseModal = () => {
    setShowPrescriptionModal(false);
    navigate("/doctor/dashboard");
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Connecting to Secure Consultation Room...</h2>
        <p className="text-sm text-gray-600 mt-1">Verifying participant authorization & generating session keys</p>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-4 bg-background">
        <Card className="p-8 max-w-md text-center shadow-lg space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">
            {error || "You are not authorized to join this consultation room or the appointment has concluded."}
          </p>
          <Button onClick={() => navigate(user?.type === "doctor" ? "/doctor/dashboard" : "/bookings")}>
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const isAudioOnly = tokenData.consultationType === "AUDIO";

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden select-none">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
        {/* Left: Exit & Info */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => navigate(-1)}
            className="bg-black/70 hover:bg-black/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 transition-colors border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Exit
          </button>

          <div className="bg-black/70 text-white px-3 py-1.5 rounded-full text-xs backdrop-blur-md border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="font-medium">
              {tokenData.role === "doctor"
                ? `Patient: ${tokenData.patient?.name || "Patient"}`
                : `Doctor: Dr. ${tokenData.doctor?.name || "Doctor"}`}
            </span>
          </div>

          <div className="bg-black/70 text-white px-2.5 py-1.5 rounded-full text-xs backdrop-blur-md border border-white/10 flex items-center gap-1">
            {isAudioOnly ? <Phone className="w-3.5 h-3.5 text-amber-400" /> : <Video className="w-3.5 h-3.5 text-blue-400" />}
            <span className="text-[11px] font-semibold">{isAudioOnly ? "Audio Call" : "HD Video"}</span>
          </div>
        </div>

        {/* Right: Timer & Waiting Indicator */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {partnerPresence === "WAITING" && (
            <div className="bg-amber-500/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md border border-amber-400/40 animate-pulse hidden sm:flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Waiting for other participant...</span>
            </div>
          )}

          <div className="bg-black/70 text-white px-3 py-1.5 rounded-full text-xs font-mono backdrop-blur-md border border-white/10 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{formattedTimer}</span>
          </div>
        </div>
      </div>

      {/* ZegoCloud Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Doctor Prescription & Notes Modal */}
      <PrescriptionModal
        isOpen={showPrescriptionModal}
        onClose={handleCloseModal}
        onSave={handleSavePrescription}
        patientName={tokenData.patient?.name || "Patient"}
      />
    </div>
  );
};

export default VideoCall;
