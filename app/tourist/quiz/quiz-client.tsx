"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markOnboardingComplete } from "./action"; 

type Tag = {
  id: string;
  tag_name: string;
  category?: string;
};

export default function QuizClient({ tags }: { tags: Tag[] }) {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, tagId];
    });
  };

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      await markOnboardingComplete(selectedTagIds);
      router.push("/tourist/explore");
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <p className="mb-8 text-sm text-muted-foreground font-medium text-center">
        Select up to 3 things you&apos;re interested in.
      </p>

      <div className="flex flex-wrap justify-center gap-3 max-w-2xl mb-12">
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          const isDisabled = !isSelected && selectedTagIds.length >= 3;
          
          return (
            <Button
              key={tag.id}
              variant={isSelected ? "default" : "outline"}
              onClick={() => toggleTag(tag.id)}
              disabled={isDisabled || isSubmitting}
              className="rounded-full h-10 px-5 text-sm transition-all"
            >
              {tag.tag_name}
            </Button>
          );
        })}
      </div>

      <Button 
        size="lg" 
        onClick={handleContinue}
        disabled={selectedTagIds.length === 0 || isSubmitting}
        className="w-48 h-12 rounded-full"
      >
        {isSubmitting ? "Saving..." : "Continue"}
      </Button>
    </div>
  );
}