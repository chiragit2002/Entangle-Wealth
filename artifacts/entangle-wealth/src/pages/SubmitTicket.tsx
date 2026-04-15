import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { ArrowLeft, Send, CheckCircle2, Upload, X, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const CATEGORIES = [
  { value: "general", label: "General Question" },
  { value: "trading", label: "Trading & Analysis" },
  { value: "taxflow", label: "TaxFlow & Tax Tools" },
  { value: "billing", label: "Billing & Subscription" },
  { value: "account", label: "Account & Profile" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
];

const ticketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  category: z.string().min(1),
  description: z.string().min(20, "Please provide at least 20 characters of detail").max(5000),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export default function SubmitTicket() {
  const { isSignedIn, getToken } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ticketId: number } | null>(null);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: "", category: "general", description: "" },
  });

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Screenshot must be under 5MB" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file" });
      return;
    }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const onSubmit = async (values: TicketFormValues) => {
    setSubmitting(true);
    try {
      const res = await authFetch("/support/tickets", getToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: values.subject.trim(),
          category: values.category,
          description: values.description.trim(),
          screenshotUrl: screenshotPreview || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted({ ticketId: data.ticketId });
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit ticket" });
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong — please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 max-w-lg text-center">
          <CheckCircle2 className="w-16 h-16 text-[#00B4D8] mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Ticket Submitted</h1>
          <p className="text-white/50 mb-2">Your ticket ID is <span className="text-[#00B4D8] font-mono font-bold">#{submitted.ticketId}</span></p>
          <p className="text-white/30 text-sm mb-8">We'll review your request and get back to you within 1–2 business days.</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => navigate("/help")} variant="outline" className="rounded-xl text-white/60">
              Back to Help
            </Button>
            <Button onClick={() => { setSubmitted(null); form.reset(); }} variant="ghost" className="rounded-xl text-[#00B4D8] border border-[#00B4D8]/30 hover:bg-[#00B4D8]/20">
              Submit Another
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Link href="/help" className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-[#00B4D8] transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Help Center
        </Link>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          Submit a <span className="electric-text">Support Ticket</span>
        </h1>
        <p className="text-white/50 text-sm mb-8">Describe your issue or question and we'll get back to you promptly.</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-white/40 uppercase tracking-wider">Subject</FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      placeholder="Brief summary of your issue"
                      maxLength={200}
                      aria-invalid={!!form.formState.errors.subject}
                      className={`w-full h-11 px-4 text-sm bg-white/[0.03] border rounded-xl text-white placeholder:text-white/40 focus:outline-none transition-colors ${form.formState.errors.subject ? "border-[#ff3366]/60 focus:border-[#ff3366]/80" : "border-white/[0.08] focus:border-[#00B4D8]/40"}`}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px] text-[#ff3366]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-white/40 uppercase tracking-wider">Category</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full h-11 px-4 text-sm bg-white/[0.03] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#00B4D8]/40 transition-colors appearance-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value} className="bg-black text-white">{c.label}</option>
                      ))}
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-white/40 uppercase tracking-wider">Description</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      placeholder="Please describe your issue in detail. Include steps to reproduce if applicable."
                      rows={6}
                      maxLength={5000}
                      aria-invalid={!!form.formState.errors.description}
                      className={`w-full px-4 py-3 text-sm bg-white/[0.03] border rounded-xl text-white placeholder:text-white/40 focus:outline-none transition-colors resize-none ${form.formState.errors.description ? "border-[#ff3366]/60 focus:border-[#ff3366]/80" : "border-white/[0.08] focus:border-[#00B4D8]/40"}`}
                    />
                  </FormControl>
                  <div className="flex items-center justify-between mt-1">
                    <FormMessage className="text-[11px] text-[#ff3366]" />
                    <p className="text-[10px] text-white/50 text-right">{field.value.length}/5000</p>
                  </div>
                </FormItem>
              )}
            />

            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Screenshot (optional)</label>
              {screenshotPreview ? (
                <div className="relative inline-block">
                  <img src={screenshotPreview} alt="Screenshot preview" className="max-h-40 rounded-lg border border-white/[0.08]" />
                  <Button
                    type="button"
                    onClick={removeScreenshot}
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6 bg-[#ff3366] hover:bg-[#ff3366]/80 rounded-full"
                    aria-label="Remove screenshot"
                  >
                    <X className="w-3 h-3 text-white" />
                  </Button>
                  <p className="text-[10px] text-white/50 mt-1">{screenshotFile?.name}</p>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-white/[0.08] rounded-xl cursor-pointer hover:border-[#00B4D8]/30 transition-colors">
                  <Upload className="w-4 h-4 text-white/40" />
                  <span className="text-xs text-white/50">Click to upload a screenshot (max 5MB)</span>
                  <input type="file" accept="image/*" onChange={handleScreenshot} className="hidden" />
                </label>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-[#00B4D8] text-black hover:bg-[#00B4D8]/90 rounded-xl font-semibold gap-2"
            >
              {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting...</> : <>Submit Ticket <Send className="w-4 h-4" /></>}
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
