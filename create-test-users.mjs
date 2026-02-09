import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function createTestUsers() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const timestamp = Date.now();
  
  const user1Email = `testuser1_${timestamp}@example.com`;
  const user2Email = `testuser2_${timestamp}@example.com`;
  const password = 'TestPassword123!';
  
  console.log('🔵 Creating User 1 (Male)...');
  const { data: user1Data, error: user1Error } = await supabase.auth.admin.createUser({
    email: user1Email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Ahmed Test',
      gender: 'male',
      dob: '1995-05-15'
    }
  });
  
  if (user1Error) {
    console.error('❌ Error creating User 1:', user1Error);
    return;
  }
  
  const user1Id = user1Data.user.id;
  console.log('✅ User 1 created:', user1Email, 'ID:', user1Id);
  
  // Create User 1 profile
  const { error: profile1Error } = await supabase.from('profiles').upsert({
    id: user1Id,
    email: user1Email,
    full_name: 'Ahmed Test',
    gender: 'male',
    dob: '1995-05-15',
    country: 'USA',
    city: 'New York',
    sect: 'Sunni',
    religiosity_level: 'high',
    prayer_frequency: 'always',
    halal_diet: true,
    wants_children: true,
    onboarding_completed_at: new Date().toISOString()
  });
  
  if (profile1Error) {
    console.error('❌ Error creating User 1 profile:', profile1Error);
  } else {
    console.log('✅ User 1 profile created');
  }
  
  // Create User 1 preferences
  await supabase.from('preferences').upsert({
    user_id: user1Id,
    min_age: 22,
    max_age: 35,
    distance_km: 100,
    preferred_sect: 'Sunni',
    preferred_religiosity_level: 'moderate',
    allow_international: true
  });
  
  console.log('🔵 Creating User 2 (Female)...');
  const { data: user2Data, error: user2Error } = await supabase.auth.admin.createUser({
    email: user2Email,
    password: password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Fatima Test',
      gender: 'female',
      dob: '1997-08-20'
    }
  });
  
  if (user2Error) {
    console.error('❌ Error creating User 2:', user2Error);
    return;
  }
  
  const user2Id = user2Data.user.id;
  console.log('✅ User 2 created:', user2Email, 'ID:', user2Id);
  
  // Create User 2 profile
  const { error: profile2Error } = await supabase.from('profiles').upsert({
    id: user2Id,
    email: user2Email,
    full_name: 'Fatima Test',
    gender: 'female',
    dob: '1997-08-20',
    country: 'USA',
    city: 'New York',
    sect: 'Sunni',
    religiosity_level: 'moderate',
    prayer_frequency: 'often',
    halal_diet: true,
    wants_children: true,
    onboarding_completed_at: new Date().toISOString()
  });
  
  if (profile2Error) {
    console.error('❌ Error creating User 2 profile:', profile2Error);
  } else {
    console.log('✅ User 2 profile created');
  }
  
  // Create User 2 preferences
  await supabase.from('preferences').upsert({
    user_id: user2Id,
    min_age: 24,
    max_age: 40,
    distance_km: 100,
    preferred_sect: 'Sunni',
    preferred_religiosity_level: 'high',
    allow_international: true
  });
  
  console.log('\n📋 TEST USER CREDENTIALS:');
  console.log('User 1 (Male):  ', user1Email, '/', password);
  console.log('User 2 (Female):', user2Email, '/', password);
  console.log('\n✅ Test users created successfully!');
}

createTestUsers().catch(console.error);
