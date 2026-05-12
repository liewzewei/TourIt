"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import useUser from "@/hooks/useUser";
import { LoaderCircle } from "lucide-react";

export default function ClientPage() {
  const { loading, error, user } = useUser();

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <LoaderCircle className="animate-spin size-5" />
        <span>Loading user data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
        <p>Error: {error.message}</p>
      </div>
    );
  }

  return (
    <section className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>
            User details fetched from the client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            <span className="font-medium">Email:</span>{" "}
            {user?.email || "Not authenticated"}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}