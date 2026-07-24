import { Download } from "lucide-react";

// A plain <a> (not next/link) to the CSV Route Handler — the attachment header
// triggers a download instead of a navigation. `href` carries the current
// period (and listing, on the drill-down).
export default function ExportLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition hover:bg-muted"
    >
      <Download className="size-4" />
      CSV
    </a>
  );
}
