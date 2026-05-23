import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { updateUserRole } from "@/app/onboarding/action";

export default function OnboardingPage() {
  return (
    <section className="max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
            <p className="text-foreground truncate text-sm font-medium">
                Welcome to the onboarding page! Please select your role.
            </p>
            <div className="flex justify-center gap-4">
                {/* 2. Bind the argument ('tourist') to the function */}
                <form action={updateUserRole.bind(null, 'tourist')}>
                  <Button type="submit" variant="outline">
                    I am a Tourist
                  </Button>
                </form>
                {/* 3. Bind the argument ('business_owner') to the function */}
                <form action={updateUserRole.bind(null, 'business_owner')}>
                  <Button type="submit" variant="outline">
                    I am a Business Owner
                  </Button>
                </form>
            </div>
        </CardContent>
      </Card>
    </section>
  );
}