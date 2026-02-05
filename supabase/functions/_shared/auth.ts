import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export const getAuthenticatedSupabaseClient = (req: Request) => {
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
    )
    return supabaseClient
}

export const getUser = async (supabase: SupabaseClient): Promise<User> => {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error) throw error
    if (!user) throw new Error('No user found')

    return user
}
