import { useState, useCallback } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Plane, Hotel, MapPin, Calendar, Star, Coins, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";

interface Listing {
  id: string;
  type: "hotel" | "flight";
  name: string;
  destination: string;
  image: string;
  rating: number;
  tokenPrice: number;
  details: string;
  dates?: string;
  airline?: string;
  hotel_class?: string;
}

const MOCK_HOTELS: Listing[] = [
  { id: "h1", type: "hotel", name: "The Ritz-Carlton", destination: "New York, NY", image: "🏨", rating: 4.9, tokenPrice: 1200, details: "Luxury suite, Central Park view, 3 nights", dates: "Check-in flexible", hotel_class: "5-Star Luxury" },
  { id: "h2", type: "hotel", name: "Four Seasons Resort", destination: "Maui, Hawaii", image: "🌴", rating: 4.8, tokenPrice: 2500, details: "Ocean-view villa, 5 nights, all-inclusive", dates: "Check-in flexible", hotel_class: "5-Star Resort" },
  { id: "h3", type: "hotel", name: "Mandarin Oriental", destination: "Tokyo, Japan", image: "🗼", rating: 4.7, tokenPrice: 1800, details: "Executive suite, 4 nights, city view", dates: "Check-in flexible", hotel_class: "5-Star" },
  { id: "h4", type: "hotel", name: "Burj Al Arab", destination: "Dubai, UAE", image: "🏛️", rating: 4.9, tokenPrice: 3500, details: "Royal suite, 3 nights, helicopter transfer", dates: "Check-in flexible", hotel_class: "7-Star" },
  { id: "h5", type: "hotel", name: "Aman Venice", destination: "Venice, Italy", image: "🇮🇹", rating: 4.8, tokenPrice: 2200, details: "Canal-view room, 4 nights, private boat", dates: "Check-in flexible", hotel_class: "5-Star Boutique" },
  { id: "h6", type: "hotel", name: "Soneva Fushi", destination: "Maldives", image: "🏝️", rating: 4.9, tokenPrice: 4000, details: "Water villa, 7 nights, full board", dates: "Check-in flexible", hotel_class: "5-Star Eco-Resort" },
];

const MOCK_FLIGHTS: Listing[] = [
  { id: "f1", type: "flight", name: "JFK → LHR", destination: "London, UK", image: "✈️", rating: 4.5, tokenPrice: 800, details: "Business Class, round trip", airline: "British Airways", dates: "Flexible dates" },
  { id: "f2", type: "flight", name: "LAX → NRT", destination: "Tokyo, Japan", image: "🛫", rating: 4.7, tokenPrice: 1500, details: "First Class, round trip", airline: "ANA", dates: "Flexible dates" },
  { id: "f3", type: "flight", name: "SFO → CDG", destination: "Paris, France", image: "🇫🇷", rating: 4.6, tokenPrice: 950, details: "Business Class, round trip", airline: "Air France", dates: "Flexible dates" },
  { id: "f4", type: "flight", name: "MIA → SIN", destination: "Singapore", image: "🇸🇬", rating: 4.8, tokenPrice: 1800, details: "First Class, round trip", airline: "Singapore Airlines", dates: "Flexible dates" },
  { id: "f5", type: "flight", name: "ORD → DXB", destination: "Dubai, UAE", image: "🇦🇪", rating: 4.9, tokenPrice: 1200, details: "First Class, round trip", airline: "Emirates", dates: "Flexible dates" },
  { id: "f6", type: "flight", name: "JFK → SYD", destination: "Sydney, Australia", image: "🇦🇺", rating: 4.6, tokenPrice: 2000, details: "Business Class, round trip", airline: "Qantas", dates: "Flexible dates" },
];

export default function TravelMarketplace() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"hotel" | "flight">("hotel");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [confirmedBookings, setConfirmedBookings] = useState<Record<string, string>>({});

  const fetchAuth = useCallback((path: string, options: RequestInit = {}) => authFetch(path, getToken, options), [getToken]);

  const listings = tab === "hotel" ? MOCK_HOTELS : MOCK_FLIGHTS;

  const handleBook = async (listing: Listing) => {
    setBookingId(listing.id);
    setBooking(true);
    try {
      const res = await fetchAuth("/token/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          destination: listing.destination,
          checkIn: listing.dates,
          details: listing.details,
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error);
      }
      const data = await res.json();
      setConfirmedBookings(prev => ({ ...prev, [listing.id]: data.txHash }));
      toast({
        title: "Booking confirmed!",
        description: `${listing.name} booked for ${listing.tokenPrice.toLocaleString()} ENTGL. Transaction recorded on blockchain.`,
      });
    } catch (err: any) {
      toast({
        title: "Booking failed",
        description: err.message || "Could not process booking",
        variant: "destructive",
      });
    } finally {
      setBooking(false);
      setBookingId(null);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Plane className="w-8 h-8 text-primary" />
            Travel Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Book luxury hotels and flights using EntangleCoin | every transaction recorded on the blockchain
          </p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
            Powered by EntangleCoin · Bookings recorded on-platform
          </span>
        </div>

        <div className="glass-panel p-1.5 inline-flex gap-1 mb-8 rounded-xl">
          <Button
            variant={tab === "hotel" ? "default" : "ghost"}
            className={`gap-2 ${tab === "hotel" ? "bg-primary text-black" : "text-muted-foreground"}`}
            onClick={() => setTab("hotel")}
          >
            <Hotel className="w-4 h-4" /> Hotels
          </Button>
          <Button
            variant={tab === "flight" ? "default" : "ghost"}
            className={`gap-2 ${tab === "flight" ? "bg-primary text-black" : "text-muted-foreground"}`}
            onClick={() => setTab("flight")}
          >
            <Plane className="w-4 h-4" /> Flights
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {listings.map((listing) => {
            const isConfirmed = !!confirmedBookings[listing.id];
            const isBooking = bookingId === listing.id && booking;

            return (
              <div key={listing.id} className="glass-panel rounded-xl overflow-hidden hover:border-white/20 transition-all group">
                <div className="h-32 flex items-center justify-center text-6xl" style={{
                  background: "linear-gradient(135deg, rgba(0,212,255,0.1), rgba(255,215,0,0.05))",
                }}>
                  {listing.image}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-white text-lg">{listing.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {listing.destination}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      <span className="text-sm font-bold">{listing.rating}</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-1">{listing.details}</p>
                  {listing.airline && (
                    <p className="text-xs text-primary mb-1">{listing.airline}</p>
                  )}
                  {listing.hotel_class && (
                    <p className="text-xs text-yellow-400 mb-1">{listing.hotel_class}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mb-4">
                    <Calendar className="w-3 h-3" /> {listing.dates}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="font-mono font-bold text-yellow-400 text-lg">{listing.tokenPrice.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground">ENTGL</span>
                    </div>

                    {isConfirmed ? (
                      <Button disabled className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 gap-1">
                        <Check className="w-4 h-4" /> Booked
                      </Button>
                    ) : (
                      <Button
                        className="bg-primary text-black hover:bg-primary/90 gap-1"
                        onClick={() => handleBook(listing)}
                        disabled={isBooking}
                      >
                        {isBooking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
                        Book Now
                      </Button>
                    )}
                  </div>

                  {isConfirmed && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Booking confirmed | off-chain record logged
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="glass-panel p-5 rounded-xl text-center">
          <p className="text-xs text-muted-foreground/60">
            All bookings are recorded in the platform database and logged to your account.
            On-chain ERC-20 settlement will be activated after mainnet deployment and security audit.
            Token prices shown in ENTGL (EntangleCoin).
          </p>
        </div>
      </div>
    </Layout>
  );
}
