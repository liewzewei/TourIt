import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

export default function RetakeOnboardingButton() {
  return (
    <Button variant="outline" asChild>
      <Link href="/tourist/quiz">
        <RefreshCw className="mr-2 size-4" />
        Retake Onboarding
      </Link>
    </Button>
  );
}
