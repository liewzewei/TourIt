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