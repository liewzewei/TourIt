"use client";

import { useState, TouchEvent, MouseEvent as ReactMouseEvent } from "react";
import { useRouter } from "next/navigation";
import createClient from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { markOnboardingComplete } from "./action"; 

// Define the shape of a Tag based on your schema
type Tag = {
  id: string;
  tag_name: string;
  category?: string;
};

export default function QuizClient({ tags, userId }: { tags: Tag[], userId: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Swipe physics state
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const router = useRouter();
  const supabase = createClient();

  // Fallback in case Next.js hasn't redirected yet
  if (currentIndex >= tags.length) {
    return <div className="text-center mt-10 animate-pulse font-medium">Redirecting to explore...</div>;
  }

  const currentTag = tags[currentIndex];

  const handleNext = async () => {
    if (currentIndex + 1 >= tags.length) {
      try {
        await markOnboardingComplete();
        router.push("/tourist/explore");
      } catch (err) {
        console.error("Failed to complete onboarding:", err);
      }
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleInterested = async () => {
    setIsSubmitting(true);
    
    const { error } = await supabase
      .from("tourist_tags")
      .insert({ profile_id: userId, tag_id: currentTag.id });

    if (error) console.error("Error saving tag:", error);

    setIsSubmitting(false);
    setDragOffset(0); // Reset position for next card
    handleNext(); 
  };

  const handleSkip = () => {
    setDragOffset(0); // Reset position for next card
    handleNext(); 
  };


  // ============================
  // DRAG & SWIPE LOGIC
  // ============================

  const onDragStart = (clientX: number) => {
    setDragStartX(clientX);
  };

  const onDragMove = (clientX: number) => {
    if (dragStartX !== null) {
      // Calculate how far the user has dragged their finger/mouse
      setDragOffset(clientX - dragStartX);
    }
  };

  const onDragEnd = () => {
    if (dragStartX === null) return;
    
    // How far (in pixels) they have to drag to trigger an action
    const SWIPE_THRESHOLD = 120; 
    
    if (dragOffset > SWIPE_THRESHOLD) {
      // Swiped Right -> Interested
      handleInterested();
    } else if (dragOffset < -SWIPE_THRESHOLD) {
      // Swiped Left -> Skip
      handleSkip();
    } else {
      // Did not swipe far enough, snap back to center
      setDragOffset(0);
    }
    
    setDragStartX(null); // Reset drag state
  };

  // Mobile Touch Events
  const handleTouchStart = (e: TouchEvent) => onDragStart(e.touches[0].clientX);
  const handleTouchMove = (e: TouchEvent) => onDragMove(e.touches[0].clientX);
  const handleTouchEnd = () => onDragEnd();

  // Desktop Mouse Events (for testing on laptop)
  const handleMouseDown = (e: ReactMouseEvent) => onDragStart(e.clientX);
  const handleMouseMove = (e: ReactMouseEvent) => onDragMove(e.clientX);
  const handleMouseUp = () => onDragEnd();
  const handleMouseLeave = () => {
    // If mouse leaves the card while dragging, end the drag
    if (dragStartX !== null) onDragEnd();
  };

  // Dynamic inline styles to physically move the card 
  // and tilt it slightly as it moves further away from the center
  const cardStyle = {
    transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.05}deg)`,
    // Smooth transition ONLY when snapping back, not while finger is actively dragging it
    transition: dragStartX === null ? "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s" : "none",
    cursor: dragStartX === null ? "grab" : "grabbing",
    opacity: 1 - Math.abs(dragOffset) / 600, // Slowly fade out as it's swiped away
  };

  return (
    <div className="flex flex-col items-center overflow-x-hidden">
      <div className="mb-8 text-sm text-muted-foreground font-medium">
        Tag {currentIndex + 1} of {tags.length}
      </div>

      <div className="relative w-full max-w-sm h-80">
        <Card 
          className="absolute inset-0 flex flex-col items-center justify-center p-8 shadow-lg touch-none select-none border-2"
          style={cardStyle}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Visual Stamps that fade in when dragging */}
          <div 
            className="absolute top-6 left-6 text-success font-bold border-4 border-success rounded-md px-2 py-1 text-xl rotate-[-20deg]"
            style={{ opacity: dragOffset > 20 ? (dragOffset / 100) : 0 }}
          >
            INTERESTED
          </div>
          
          <div 
            className="absolute top-6 right-6 text-destructive font-bold border-4 border-destructive rounded-md px-2 py-1 text-xl rotate-[20deg]"
            style={{ opacity: dragOffset < -20 ? (Math.abs(dragOffset) / 100) : 0 }}
          >
            NOPE
          </div>

          <h2 className="text-4xl font-semibold mb-3 capitalize tracking-tight pointer-events-none">
            {currentTag.tag_name}
          </h2>
          
          {currentTag.category && (
            <span className="text-sm font-medium text-primary bg-accent px-3 py-1 rounded-full mb-4 pointer-events-none">
              {currentTag.category}
            </span>
          )}
          
          <p className="text-muted-foreground mt-6 text-sm text-center pointer-events-none">
            Swipe Right for interested<br/>Swipe Left to skip
          </p>
        </Card>
      </div>

      {/* Manual buttons fallback for users who prefer to click */}
      <div className="flex gap-8 w-full justify-center mt-12">
        <Button 
          variant="outline" 
          size="lg" 
          onClick={handleSkip}
          disabled={isSubmitting}
          className="w-32 h-14 rounded-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive shadow-sm transition-all hover:scale-105"
        >
          Skip
        </Button>
        
        <Button 
          size="lg" 
          onClick={handleInterested}
          disabled={isSubmitting}
          className="w-32 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all hover:scale-105"
        >
          {isSubmitting ? "Saving..." : "Interested"}
        </Button>
      </div>
    </div>
  );
}