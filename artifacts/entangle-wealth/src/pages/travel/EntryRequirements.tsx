import {
  Shield, AlertTriangle, CheckCircle2, ExternalLink,
  FileText, Syringe, Globe, CreditCard,
} from "lucide-react";

interface Props {
  destinations: string[];
}

interface Requirement {
  id: string;
  icon: typeof Shield;
  title: string;
  description: string;
  severity: "warning" | "info" | "success";
  link: string;
  linkLabel: string;
}

const EU_COUNTRIES = [
  "france", "germany", "italy", "spain", "netherlands", "belgium", "austria",
  "greece", "portugal", "ireland", "czech republic", "poland", "sweden",
  "denmark", "finland", "hungary", "croatia", "romania", "bulgaria", "slovakia",
  "slovenia", "lithuania", "latvia", "estonia", "luxembourg", "malta", "cyprus",
  "iceland", "norway", "switzerland", "liechtenstein",
];

const VACCINE_COUNTRIES = [
  "thailand", "brazil", "india", "kenya", "nigeria", "colombia", "peru",
  "vietnam", "cambodia", "laos", "myanmar", "tanzania", "uganda", "ghana",
  "senegal", "madagascar", "mozambique", "ethiopia", "bolivia", "ecuador",
  "indonesia", "philippines", "sri lanka", "nepal", "bangladesh",
];

function getRequirements(destinations: string[]): Requirement[] {
  const reqs: Requirement[] = [];
  const lowerDests = destinations.map(d => d.toLowerCase());

  reqs.push({
    id: "passport",
    icon: FileText,
    title: "Valid Passport Required",
    description: "Ensure your passport is valid for at least 6 months beyond your return date. Many countries enforce this rule strictly.",
    severity: "warning",
    link: "https://travel.state.gov/content/travel/en/passports.html",
    linkLabel: "U.S. State Dept | Passports",
  });

  const needsVisa = lowerDests.some(d =>
    ["china", "russia", "india", "brazil", "vietnam", "australia", "turkey", "egypt", "nigeria", "kenya"].some(c => d.includes(c))
  );
  if (needsVisa) {
    reqs.push({
      id: "visa",
      icon: CreditCard,
      title: "Visa May Be Required",
      description: "One or more of your destinations may require a visa for U.S. passport holders. Check requirements well in advance | processing can take weeks.",
      severity: "warning",
      link: "https://travel.state.gov/content/travel/en/international-travel/International-Travel-Country-Information-Pages.html",
      linkLabel: "U.S. State Dept | Country Info",
    });
  }

  const needsETIAS = lowerDests.some(d => EU_COUNTRIES.some(c => d.includes(c)));
  if (needsETIAS) {
    reqs.push({
      id: "etias",
      icon: Globe,
      title: "ETIAS Authorization (Europe)",
      description: "Starting 2025, U.S. citizens traveling to EU/Schengen countries need ETIAS travel authorization. Apply online before departure | valid for 3 years.",
      severity: "info",
      link: "https://travel-europe.europa.eu/etias_en",
      linkLabel: "Official ETIAS Portal",
    });
  }

  const needsVaccines = lowerDests.some(d => VACCINE_COUNTRIES.some(c => d.includes(c)));
  if (needsVaccines) {
    reqs.push({
      id: "vaccines",
      icon: Syringe,
      title: "Recommended Vaccinations",
      description: "Your destination(s) may require or recommend specific vaccinations (Yellow Fever, Hepatitis A/B, Typhoid, etc.). Consult your doctor 4–6 weeks before travel.",
      severity: "warning",
      link: "https://wwwnc.cdc.gov/travel/destinations/list",
      linkLabel: "CDC | Traveler's Health",
    });
  }

  reqs.push({
    id: "insurance",
    icon: Shield,
    title: "Travel Insurance Recommended",
    description: "Consider comprehensive travel insurance covering medical emergencies, trip cancellation, and lost luggage. Some countries require proof of insurance.",
    severity: "info",
    link: "https://travel.state.gov/content/travel/en/international-travel/before-you-go/your-health-abroad/insurance-providers-overseas.html",
    linkLabel: "State Dept | Insurance Info",
  });

  return reqs;
}

export default function EntryRequirements({ destinations }: Props) {
  const requirements = getRequirements(destinations);

  if (destinations.length === 0) return null;

  const sevColors = {
    warning: { bg: "rgba(255,215,0,0.06)", border: "rgba(255,215,0,0.2)", icon: "#FFB800" },
    info: { bg: "rgba(0,180,216,0.06)", border: "rgba(0,180,216,0.2)", icon: "#00B4D8" },
    success: { bg: "rgba(0,180,216,0.06)", border: "rgba(0,180,216,0.2)", icon: "#00B4D8" },
  };

  return (
    <div className="glass-panel rounded-sm p-5 md:p-7 border border-[rgba(255,215,0,0.15)] bg-[rgba(255,215,0,0.02)]">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-5 h-5 text-secondary" />
        <h2 className="text-lg font-bold">Entry Requirements & Alerts</h2>
      </div>
      <p className="text-[12px] text-muted-foreground mb-5">
        Important travel advisories for: {destinations.join(", ")}
      </p>

      <div className="space-y-3">
        {requirements.map(req => {
          const Icon = req.icon;
          const colors = sevColors[req.severity];
          return (
            <div key={req.id} className="rounded-xl p-4 transition-all"
              style={{ background: colors.bg, border: `1px solid ${colors.border}` }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${colors.icon}15` }}>
                  <Icon className="w-4 h-4" style={{ color: colors.icon }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[13px] font-bold text-white">{req.title}</p>
                    {req.severity === "warning" && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#FFB800]/15 text-[#FFB800]">Action Needed</span>
                    )}
                  </div>
                  <p className="text-[12px] text-white/50 leading-relaxed mb-2">{req.description}</p>
                  <a href={req.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors">
                    <ExternalLink className="w-3 h-3" /> {req.linkLabel}
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-4 h-4 text-[#00B4D8]" />
          <p className="text-[12px] font-bold text-[#00B4D8]">Pre-Travel Checklist</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {[
            "Passport valid 6+ months after return",
            "Visa applications submitted (if needed)",
            "Travel insurance purchased",
            "Vaccinations up to date",
            "Bank notified of travel dates",
            "Copies of important documents saved",
            "Emergency contacts registered",
            "Local currency or travel card ready",
          ].map((item, i) => (
            <label key={i} className="flex items-center gap-2 text-[11px] text-white/40 cursor-pointer hover:text-white/60 py-1">
              <input type="checkbox" className="rounded border-white/20 bg-transparent accent-primary w-3.5 h-3.5" />
              {item}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
