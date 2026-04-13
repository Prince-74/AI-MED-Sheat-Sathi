import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DoctorCard from "@/components/DoctorCard";
import { useDoctorStore } from "@/store/doctorStore";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import doctorMale from "@/assets/doctor-male.jpg";

const categories = [
  "All Categories",
  "Primary Care",
  "Mental & Behavioral Health",
  "Children's Health",
  "Senior Health",
];

const Doctors = () => {
  const navigate = useNavigate();
  const { doctors, fetchDoctors, loading } = useDoctorStore();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");

  useEffect(() => {
    const filters: any = {};
    if (search) filters.search = search;
    if (category && category !== "All Categories") filters.category = category;
    fetchDoctors(filters).catch(() => {});
  }, [fetchDoctors, search, category]);

  const count = doctors?.length || 0;

  return (
    <div className="min-h-screen bg-background pb-24 px-6 pt-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Choose your doctor</h1>
        <p className="text-sm text-muted-foreground">Find the perfect healthcare provider for your needs</p>
      </div>

      <div className="mb-4 flex gap-3 items-center">
        <Input placeholder="Search doctors by name, specialization, or condition..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Button variant="outline" onClick={() => {}}>Filters</Button>
      </div>

      <div className="mb-6 flex gap-2 overflow-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-sm ${category === c ? 'bg-primary text-white' : 'bg-card text-muted-foreground'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mb-4 text-sm text-muted-foreground">{count} doctors found</div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6 h-44" />
          ))
        ) : (
          doctors.map((d) => (
            <Card key={d._id} className="p-6">
              <div className="flex flex-col h-full">
                <DoctorCard
                  id={d._id}
                  name={d.name}
                  specialty={d.specialization || "General Practitioner"}
                  image={d.profileImage || doctorMale}
                  rating={4.8}
                  location={d.hospitalInfo?.city || d.hospitalInfo?.name || ""}
                  onClick={() => navigate(`/doctor/${d._id}`)}
                />
                <div className="mt-3">
                  <div className="text-sm text-muted-foreground mb-2">Consultation Fee: <span className="text-accent font-semibold">₹{d.fees || '—'}</span></div>
                  <Button className="w-full" onClick={() => navigate(`/doctor/${d._id}`)}>Book Appointment</Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Doctors;
