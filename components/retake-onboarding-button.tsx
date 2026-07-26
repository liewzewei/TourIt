"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

export default function RetakeOnboardingButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      variant="outline"
      disabled={isLoading}
      onClick={() => {
        setIsLoading(true);
        router.push("/tourist/quiz");
      }}
    >
      {isLoading ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 size-4" />
      )}
      {isLoading ? "Loading..." : "Retake Onboarding"}
    </Button>
  );
}
