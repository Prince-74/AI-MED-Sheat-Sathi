import { Star, MapPin } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";

interface DoctorCardProps {
  id: string;
  name: string;
  specialty: string;
  image: string;
  rating: number;
  location: string;
  distance?: string;
  onClick?: () => void;
}

const DoctorCard = ({ name, specialty, image, rating, location, distance, onClick }: DoctorCardProps) => {
  return (
    <Card className="p-4 shadow-card hover:shadow-card-hover transition-smooth cursor-pointer" onClick={onClick}>
      <div className="flex gap-4">
        <img 
          src={image} 
          alt={name}
          className="w-20 h-20 rounded-2xl object-cover"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{name}</h3>
          <p className="text-sm text-muted-foreground">{specialty}</p>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="text-sm font-medium">{rating}</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{location}</span>
            {distance && <span className="ml-auto text-primary">• {distance}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DoctorCard;
