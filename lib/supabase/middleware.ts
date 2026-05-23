import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { LOGIN_PATH } from '@/constants/common'; 

export default async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );

                    // Re-create the response with updated cookies
                    supabaseResponse = NextResponse.next({ request });

                    cookiesToSet.forEach(({ name, value, options }) => 
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            }
        },
    );

    //Fetch the current authenticated user
    const {
        data: { user }
    } = await supabase.auth.getUser();

    //Initialise role as null
    let role = null;

    //If user is authenticated, fetch their role
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single(); //single() ensures we get one record, not an array

        role = profile?.role || null;
    }

    const path = request.nextUrl.pathname;

    // Redirect unauthenticated users to login, except for auth routes
    if (!user && !path.startsWith(LOGIN_PATH) && !path.startsWith("/auth")) {
        const url = request.nextUrl.clone();
        url.pathname = LOGIN_PATH;
        url.searchParams.set("next", path);
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users without a role to a role setup page, except for auth and onboarding routes
    if (user && role === null && !path.startsWith("/onboarding") && !path.startsWith("/auth")) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
    }

    // Prevent authenticated users with roles from accessing the login page and onboarding page
    if (user && role !== null && (path.startsWith(LOGIN_PATH) || path.startsWith("/onboarding"))) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }
    
    return supabaseResponse;
}