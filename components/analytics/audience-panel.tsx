import type { AudienceTag, OwnerAudience } from "@/lib/analytics";

// The anonymized tag profile of travellers who saved the owner's listing(s).
// Below the k-anonymity threshold the RPC returns tags=null and we show a
// progress/locked state instead — that state IS the privacy guarantee made
// visible. `scopeLabel` reads naturally in the copy ("your listings" / "this
// listing").
export default function AudiencePanel({
  data,
  scopeLabel,
}: {
  data: OwnerAudience;
  scopeLabel: string;
}) {
  return (
    <section className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-sm font-medium text-gray-500">
        Audience interests
      </h2>
      {data.tags === null ? (
        <LockedState
          saverCount={data.saver_count}
          threshold={data.threshold}
          scopeLabel={scopeLabel}
        />
      ) : data.tags.length === 0 ? (
        <p className="text-sm text-gray-400">
          Your savers haven&apos;t shared any interests yet.
        </p>
      ) : (
        <UnlockedState saverCount={data.saver_count} tags={data.tags} />
      )}
    </section>
  );
}

function LockedState({
  saverCount,
  threshold,
  scopeLabel,
}: {
  saverCount: number;
  threshold: number;
  scopeLabel: string;
}) {
  const pct = Math.min(100, Math.round((saverCount / threshold) * 100));
  return (
    <div>
      <p className="text-sm text-gray-600">
        🔒 Audience insights unlock once {threshold} travellers have saved{" "}
        {scopeLabel}.
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs font-medium text-gray-500">
        {saverCount} of {threshold} so far
      </p>
      <p className="mt-3 text-xs text-gray-400">
        We only show an aggregated interest profile once enough travellers are
        included, so no individual can be identified.
      </p>
    </div>
  );
}

function UnlockedState({
  saverCount,
  tags,
}: {
  saverCount: number;
  tags: AudienceTag[];
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Based on {saverCount} interested travellers.
      </p>
      <ul className="space-y-3">
        {tags.map((t) => {
          const pct = Math.round((t.savers / saverCount) * 100);
          return (
            <li key={t.tag_name}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{t.tag_name}</span>
                <span className="tabular-nums text-gray-500">{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
