import { Globe } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

const languages = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
];

const LanguageSwitcher = () => {
  const [currentLang, setCurrentLang] = useState("en");

  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <div className="flex gap-1">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={currentLang === lang.code ? "default" : "ghost"}
            size="sm"
            onClick={() => setCurrentLang(lang.code)}
            className="h-8 px-3 text-xs"
          >
            {lang.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSwitcher;
