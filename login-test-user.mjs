import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function loginAndGetSessionToken() {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'testuser1_1770591344816@example.com',
      password: 'TestPassword123!'
    });
    
    if (error) {
      console.error('Login error:', error);
      return;
    }
    
    console.log('Login successful!');
    console.log('User ID:', data.user.id);
    console.log('Access Token:', data.session.access_token);
    console.log('\n---\nTo use this in the browser, open DevTools Console and run:\n');
    console.log(`localStorage.setItem('sb-127-0-0-1-54321-auth-token', '${JSON.stringify(data.session)}');`);
    console.log('window.location.reload();');
  } catch (err) {
    console.error('Error:', err);
  }
}

loginAndGetSessionToken();
