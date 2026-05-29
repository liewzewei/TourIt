"use client";

import { createContext, useContext } from "react";
import { User } from "@supabase/supabase-js";

import {UserProfile} from "@/types/index";

type UserContextType = {
    user: User | null;
    profile: UserProfile | null;
};

// create a context with default values
const UserContext = createContext<UserContextType>({
    user: null,
    profile: null,
});

export const UserProvider = ({user, profile, children}: React.PropsWithChildren<{user: User | null; profile: UserProfile | null}>) => {
    return (
        <UserContext.Provider value={{ user, profile }}>
            {children}
        </UserContext.Provider>
    );
}

export const useUserContext = () => useContext(UserContext);