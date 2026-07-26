import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ThemeControls from "@/components/theme-controls";
import BackLink from "@/components/back-link";
import RetakeOnboardingButton from "@/components/retake-onboarding-button";

import createClient from "@/lib/supabase/server";
import { UserResponse } from "@supabase/supabase-js";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data }: UserResponse = await supabase.auth.getUser();
  const user = data.user;

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  const isTourist = role === "tourist";
  const backHref = isTourist ? "/tourist/explore" : "/business-owner/listings";
  const backLabel = isTourist ? "Back to Explore" : "Back to Listings";

  let touristTags: string[] = [];
  if (isTourist) {
    const { data: tagsData } = await supabase
      .from("tourist_tags")
      .select("tags(tag_name)")
      .eq("profile_id", user.id);

    if (tagsData) {
      touristTags = tagsData
        .map((t: unknown) => {
          const row = t as { tags: { tag_name: string } | { tag_name: string }[] | null };
          const tags = row.tags;
          return Array.isArray(tags) ? tags[0]?.tag_name : tags?.tag_name;
        })
        .filter(Boolean) as string[];
    }
  }

  const displayEmail = user.email || "No email available";
  const userInitial = user.email ? user.email[0].toUpperCase() : "U";

  return (
    <section className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="mb-6">
        <BackLink href={backHref}>{backLabel}</BackLink>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Avatar>
            <AvatarImage
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata.full_name}
            />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>

          <p className="text-foreground truncate text-sm font-medium">
            {user.user_metadata?.full_name || "User"}
          </p>
          <p className="text-muted-foreground truncate text-xs font-normal">
            {displayEmail}
          </p>
        </CardContent>
      </Card>

      {isTourist && (
        <Card>
          <CardHeader>
            <CardTitle>Interests</CardTitle>
            <CardDescription>
              Tags you selected during onboarding to personalize your experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {touristTags.length > 0 ? (
                touristTags.map((tagName, i) => (
                  <Button key={i} variant="secondary" size="sm" className="pointer-events-none">
                    {tagName}
                  </Button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No interests selected.</p>
              )}
            </div>
            
            <div>
              <RetakeOnboardingButton />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeControls className="max-w-xs" />
        </CardContent>
      </Card>
    </section>
  );
}