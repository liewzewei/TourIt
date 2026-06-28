export type MenuItem = {
    title: string;
    url: string;
};

export type UserProfile = {
    id: string;
    role: string | null;
    created_at: string;
    display_name: string | null;
    avatar_url: string | null;
};

export type ListingTag = {
    id: string;
    tag_name: string;
};

// One row returned by the `recommend_listings` Postgres RPC.
export type RecommendedListing = {
    id: string;
    listing_name: string;
    listing_description: string | null;
    listing_address: string | null;
    open_time: string | null;
    close_time: string | null;
    tags: ListingTag[];
    match_score: number;
    total_count: number;
};