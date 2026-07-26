"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { resetOnboarding } from "@/app/tourist/quiz/action";

export default function RetakeOnboardingButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await resetOnboarding();
          window.location.href = "/tourist/quiz";
        });
      }}
    >
      <RefreshCw className="mr-2 size-4" />
      {isPending ? "Resetting..." : "Retake Onboarding"}
    </Button>
  );
}
