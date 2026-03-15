"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CircularEconomyIllustration,
  ImpactIllustration,
  DiscoverIllustration,
  PaymentIllustration,
  SaveIllustration,
} from "@/components/illustrations";

interface Slide {
  illustration: React.ReactNode;
  title: string;
  description: string;
  bg: string;
}

const SLIDES: Slide[] = [
  {
    illustration: <CircularEconomyIllustration className="w-56 h-56" />,
    title: "Travel the Puerto Princesa Way",
    description:
      "Puerto Princesa is building a zero-waste future. Every visit you make helps protect Palawan's ecosystems for generations.",
    bg: "from-lime-50 to-white",
  },
  {
    illustration: <ImpactIllustration className="w-56 h-56" />,
    title: "Your Visit Creates Impact",
    description:
      "Your environmental fee funds conservation, waste management, and community programs. Choosing eco-certified businesses keeps the cycle going.",
    bg: "from-green-50 to-white",
  },
  {
    illustration: <DiscoverIllustration className="w-56 h-56" />,
    title: "Discover Puerto Princesa",
    description:
      "Explore the best eco-certified hotels, restaurants, tours, and local artisans that Puerto Princesa City has to offer.",
    bg: "from-emerald-50 to-white",
  },
  {
    illustration: <PaymentIllustration className="w-56 h-56" />,
    title: "Pay Environmental Fees Easily",
    description:
      "Pay your environmental fee online in seconds. Your contribution helps preserve the natural beauty of Palawan.",
    bg: "from-teal-50 to-white",
  },
  {
    illustration: <SaveIllustration className="w-56 h-56" />,
    title: "Save Your Favorite Places",
    description:
      "Bookmark the spots you love so you can find them again quickly. Build your own travel itinerary.",
    bg: "from-cyan-50 to-white",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);

  const isLast = current === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const prev = () => setCurrent((c) => Math.max(0, c - 1));

  const finish = () => {
    try {
      localStorage.setItem("onboarded", "true");
    } catch {
      // ignore
    }
    router.replace("/");
  };

  const slide = SLIDES[current];

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center bg-gradient-to-b px-6 py-10 transition-all duration-300",
        slide.bg
      )}
    >
      {/* Skip */}
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="sm" onClick={finish} className="text-gray-400 text-xs">
          Skip
        </Button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-sm w-full text-center">
        <div className="drop-shadow-md">{slide.illustration}</div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">{slide.title}</h1>
          <p className="text-gray-500 leading-relaxed">{slide.description}</p>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              "rounded-full transition-all duration-200",
              i === current
                ? "w-6 h-2 bg-[#2E7D32]"
                : "w-2 h-2 bg-gray-300"
            )}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4 w-full max-w-sm">
        {current > 0 ? (
          <Button variant="outline" onClick={prev} className="flex-1 gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        ) : (
          <div className="flex-1" />
        )}
        <Button
          onClick={next}
          className="flex-1 bg-[#2E7D32] hover:bg-[#1B5E20] gap-1"
        >
          {isLast ? "Get Started" : <>Next <ChevronRight className="w-4 h-4" /></>}
        </Button>
      </div>
    </div>
  );
}
