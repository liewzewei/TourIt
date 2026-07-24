import { GoogleGenAI } from "@google/genai";
import { Sparkle } from "lucide-react";

import type { AudienceTag } from "@/lib/analytics";

// A one-sentence, plain-English takeaway over the dashboard's numbers. Rendered as
// its own async Server Component so the page can wrap it in <Suspense> — the cards,
// table and chart paint immediately and this streams in when the model responds.
//
// The prompt is built ONLY from already-aggregated, already-k-gated values
// (topTags is null when the audience is below the anonymity threshold), so no
// tourist identity ever reaches the model. On any failure we render nothing — the
// dashboard is fully usable without it.
type AiInsightProps = {
  scope: "portfolio" | "listing";
  listingName?: string;
  periodLabel: string;
  views: number;
  saves: number;
  saveRate: number; // fraction
  viewsDelta: number | null;
  savesDelta: number | null;
  saverCount: number;
  topTags: AudienceTag[] | null;
};

export default async function AiInsight(props: AiInsightProps) {
  const text = await generateInsight(props);
  if (!text) return null;
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-accent bg-accent/60 p-4">
      <Sparkle className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="text-sm text-foreground">{text}</p>
    </div>
  );
}

// Kept out of the component body so its try/catch handles I/O failure without
// wrapping render (satisfies react-hooks/error-boundaries).
async function generateInsight(props: AiInsightProps): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  // No key, or nothing to analyse yet: skip it entirely.
  if (!apiKey || (props.views === 0 && props.saves === 0)) return null;

  try {
    // Same @google/genai Interactions API convention as the itinerary generator.
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: buildPrompt(props),
    });
    return (interaction.output_text ?? "").trim() || null;
  } catch (e) {
    console.error("AI insight failed:", e);
    return null;
  }
}

function deltaClause(delta: number | null): string {
  if (delta === null) return " (new this period)";
  return ` (${delta >= 0 ? "up" : "down"} ${Math.abs(delta * 100).toFixed(0)}% vs the previous period)`;
}

function buildPrompt(p: AiInsightProps): string {
  const scopeLine =
    p.scope === "listing"
      ? `for the listing "${p.listingName}"`
      : "across all of their listings";
  const tagsLine =
    p.topTags && p.topTags.length > 0 && p.saverCount > 0
      ? `\n- Interested travellers' top quiz interests: ${p.topTags
          .slice(0, 5)
          .map(
            (t) => `${t.tag_name} ${Math.round((t.savers / p.saverCount) * 100)}%`,
          )
          .join(", ")}`
      : "";

  return [
    'You are an analytics assistant for a business owner on "TourIt", a tourism marketplace where travellers save listings into trip itineraries.',
    "",
    `Write ONE short, plain-English sentence (max 30 words, no markdown, no preamble) giving the owner the single most useful takeaway ${scopeLine}, plus one concrete suggestion if relevant.`,
    "",
    `Data (last ${p.periodLabel}):`,
    `- Unique visitors: ${p.views}${deltaClause(p.viewsDelta)}`,
    `- Saves to itineraries: ${p.saves}${deltaClause(p.savesDelta)}`,
    `- Save rate: ${(p.saveRate * 100).toFixed(1)}%${tagsLine}`,
  ].join("\n");
}

export function AiInsightSkeleton() {
  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-accent bg-accent/60 p-4">
      <Sparkle className="size-4 shrink-0 animate-pulse text-primary/50" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-accent" />
    </div>
  );
}
