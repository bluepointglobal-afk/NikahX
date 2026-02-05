import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

// CONFIG
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "http://localhost:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

Deno.test("RLS: Gender Separation - Male should only see Female", async () => {
    // 1. Sign in as Male (Ahmed)
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await client.auth.signInWithPassword({ email: 'ahmed@test.com', password: 'password' });

    // 2. Query Profiles
    const { data, error } = await client.from('profiles').select('*');

    // 3. Assert
    if (error) throw error;

    // Should see Fatima (Female)
    // Should NOT see other Males (except self if query allows, but our policy said 'gender != self')
    const hasMale = data.some(p => p.gender === 'male' && p.id !== client.auth.user()?.id);
    assertEquals(hasMale, false, "Male user saw another male profile!");

    const hasFemale = data.some(p => p.gender === 'female');
    assertEquals(hasFemale, true, "Male user failed to see female profile!");
});

Deno.test("Constraint: 18+ Enforcement", async () => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // Sign in... 

    // Try to update DOB to under 18
    const { error } = await client
        .from('profiles')
        .update({ dob: new Date().toISOString() }) // Today
        .eq('id', '...');

    // Expect Error
    assertEquals(error?.code, '23514'); // check_violation code
});
