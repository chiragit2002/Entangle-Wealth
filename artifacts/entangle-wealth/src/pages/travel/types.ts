export interface PersonalTripForm {
  origin: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  travelers: number;
  budgetLevel: "budget" | "mid-range" | "luxury";
  tripStyle: string[];
}

export interface PersonalActivity {
  id: string;
  day: number;
  time: string;
  title: string;
  type: "hotel" | "activity" | "restaurant" | "transit";
  cost: number;
  location: string;
}

export interface TripStop {
  name: string;
  lat: number;
  lng: number;
  type: "hotel" | "activity" | "restaurant" | "transit";
  day: number;
}

export const BUDGET_ESTIMATES: Record<string, Record<string, number>> = {
  budget: { flights: 350, accommodation: 60, food: 30, activities: 20, transport: 15 },
  "mid-range": { flights: 650, accommodation: 150, food: 60, activities: 50, transport: 30 },
  luxury: { flights: 1500, accommodation: 400, food: 120, activities: 100, transport: 60 },
};

export const TRIP_STYLES = [
  { value: "relaxation", label: "Relaxation", emoji: "🏖️" },
  { value: "culture", label: "Culture", emoji: "🏛️" },
  { value: "adventure", label: "Adventure", emoji: "🏔️" },
  { value: "foodie", label: "Foodie", emoji: "🍽️" },
  { value: "nightlife", label: "Nightlife", emoji: "🌃" },
];

export const MARKER_COLORS: Record<string, string> = {
  hotel: "#FF8C00",
  activity: "#FF8C00",
  restaurant: "#FFB800",
  transit: "#9c27b0",
};
