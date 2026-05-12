import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import createClient from "@/lib/supabase/server";

export default async function ServerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>
            User details fetched from the server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            <span className="font-medium">Email:</span>{" "}
            {user?.email || "Not authenticated"}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}