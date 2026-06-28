import { redirect } from "next/navigation";

// `/tourist` and `/tourist/explore` used to render identical feeds. The explore
// route is now the canonical, recommendation-ranked feed; send everyone there.
export default function TouristIndexPage() {
  redirect("/tourist/explore");
}
