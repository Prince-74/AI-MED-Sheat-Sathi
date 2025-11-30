import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import doctorFemale from "@/assets/doctor-female.jpg";
import doctorMale from "@/assets/doctor-male.jpg";
import medicalBg from "@/assets/medical-bg.jpg";

const slides = [
  {
    image: medicalBg,
    title: "Welcome to AI-MED",
    description: "Your health is our priority",
  },
  {
    image: doctorFemale,
    title: "Find a lot of specialist doctors in one place",
    description: "Connect with certified medical professionals",
  },
  {
    image: doctorMale,
    title: "Get advice only from a doctor you believe in",
    description: "Trusted healthcare at your fingertips",
  },
];

const Welcome = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/auth");
    }
  };

  const handleSkip = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary to-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center shadow-lg">
            <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
          </div>
        </div>

        {/* Slide Content */}
        <div className="w-full max-w-md mb-8">
          <div className="aspect-square mb-6 relative overflow-hidden rounded-3xl shadow-lg">
            <img 
              src={slides[currentSlide].image} 
              alt={slides[currentSlide].title}
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="text-2xl font-bold text-center mb-3 text-foreground">
            {slides[currentSlide].title}
          </h1>
          <p className="text-center text-muted-foreground">
            {slides[currentSlide].description}
          </p>
        </div>

        {/* Dots */}
        <div className="flex gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? "w-8 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="w-full max-w-md space-y-3">
          <Button onClick={handleNext} className="w-full" size="lg">
            {currentSlide < slides.length - 1 ? "Next" : "Get Started"}
          </Button>
          {currentSlide < slides.length - 1 && (
            <Button onClick={handleSkip} variant="ghost" className="w-full">
              Skip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
