import { type NextRequest } from 'next/server';

import updateSession from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        // Exclude Next internals from auth/role redirects. _next/image is the
        // image optimizer endpoint: without this exclusion, its requests get
        // caught by the role-home redirect below and 307'd away instead of
        // serving the image, so every next/image render breaks.
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};