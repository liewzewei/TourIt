import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ThemeControls from "@/components/theme-controls";

import createClient from "@/lib/supabase/server";
import { UserResponse } from "@supabase/supabase-js";

export default async function ProfilePage() {
  const supabase = await createClient();

  const { data }: UserResponse = await supabase.auth.getUser();
  const user = data.user;

  if (!user) return null;

  const displayEmail = user.email || "No email available";
  const userInitial = user.email ? user.email[0].toUpperCase() : "U";

  return (
    <section className="max-w-4xl mx-auto space-y-4">
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