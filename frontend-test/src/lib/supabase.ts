// AUTH BYPASSED — Full mock Supabase client for M2M evaluation
// All queries return demo data, no real backend needed

const DEMO_PROFILES = [
  {
    id: 'demo-001', full_name: 'Amina Hassan', age: 26, gender: 'female',
    bio: 'Practising Muslimah, love reading and nature walks. Looking for someone who puts deen first.',
    location: 'London, UK', sect: 'Sunni', practice_level: 'Practising',
    education: 'Masters in Education', occupation: 'Teacher',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amina',
    photos: [], looking_for: 'marriage', is_premium: false,
  },
  {
    id: 'demo-002', full_name: 'Yusuf Ali', age: 30, gender: 'male',
    bio: 'Software engineer who prays 5 times daily. Family-oriented. Looking for a kind-hearted partner.',
    location: 'Birmingham, UK', sect: 'Sunni', practice_level: 'Practising',
    education: 'BSc Computer Science', occupation: 'Software Engineer',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yusuf',
    photos: [], looking_for: 'marriage', is_premium: true,
  },
  {
    id: 'demo-003', full_name: 'Fatima Osman', age: 28, gender: 'female',
    bio: 'Nutritionist & Quran student. Passionate about health and helping the ummah.',
    location: 'Manchester, UK', sect: 'Sunni', practice_level: 'Very Practising',
    education: 'BSc Nutrition', occupation: 'Nutritionist',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima',
    photos: [], looking_for: 'marriage', is_premium: false,
  },
  {
    id: 'demo-004', full_name: 'Omar Khan', age: 32, gender: 'male',
    bio: 'Imam at local masjid. Seeking a partner who values Islamic knowledge and community.',
    location: 'Leeds, UK', sect: 'Sunni', practice_level: 'Very Practising',
    education: 'Islamic Studies', occupation: 'Imam & Chaplain',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Omar',
    photos: [], looking_for: 'marriage', is_premium: true,
  },
  {
    id: 'demo-005', full_name: 'Khadija Begum', age: 24, gender: 'female',
    bio: 'Hijabi doctor in training. Love cooking and cats. Want someone ambitious with good akhlaq.',
    location: 'London, UK', sect: 'Sunni', practice_level: 'Practising',
    education: 'MBBS Medicine', occupation: 'Junior Doctor',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Khadija',
    photos: [], looking_for: 'marriage', is_premium: false,
  },
];

const DEMO_MATCHES = [
  { id: 'm1', user_id: 'demo-user-001', matched_user_id: 'demo-002', status: 'matched', created_at: '2026-02-07T10:00:00Z', profiles: DEMO_PROFILES[1] },
  { id: 'm2', user_id: 'demo-user-001', matched_user_id: 'demo-004', status: 'pending', created_at: '2026-02-08T08:00:00Z', profiles: DEMO_PROFILES[3] },
];

const DEMO_MESSAGES = [
  { id: 'msg1', sender_id: 'demo-user-001', receiver_id: 'demo-002', content: 'Assalamu alaikum, your profile caught my eye. MashaAllah!', created_at: '2026-02-07T10:30:00Z' },
  { id: 'msg2', sender_id: 'demo-002', receiver_id: 'demo-user-001', content: 'Wa alaikum assalam! JazakAllah khair. Tell me about your deen journey.', created_at: '2026-02-07T11:00:00Z' },
];

const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@nikahx.com',
  user_metadata: { full_name: 'Demo User' },
};

// Build a chainable query mock
function mockQuery(tableName: string) {
  let dataset: any[] = [];
  if (tableName === 'profiles') dataset = [...DEMO_PROFILES];
  else if (tableName === 'matches') dataset = [...DEMO_MATCHES];
  else if (tableName === 'messages') dataset = [...DEMO_MESSAGES];
  else dataset = [];

  const chain: any = {
    _filters: [] as any[],
    select: () => chain,
    insert: (rows: any) => ({ data: Array.isArray(rows) ? rows : [rows], error: null }),
    update: (vals: any) => ({ data: vals, error: null }),
    upsert: (rows: any) => ({ data: Array.isArray(rows) ? rows : [rows], error: null }),
    delete: () => ({ data: null, error: null }),
    eq: (col: string, val: any) => { chain._filters.push({ col, val }); return chain; },
    neq: (col: string, val: any) => chain,
    in: () => chain,
    is: () => chain,
    not: () => chain,
    gt: () => chain,
    lt: () => chain,
    gte: () => chain,
    lte: () => chain,
    like: () => chain,
    ilike: () => chain,
    or: () => chain,
    order: () => chain,
    limit: (n: number) => { dataset = dataset.slice(0, n); return chain; },
    range: () => chain,
    single: () => {
      const filtered = applyFilters(dataset, chain._filters);
      return { data: filtered[0] || null, error: null };
    },
    maybeSingle: () => {
      const filtered = applyFilters(dataset, chain._filters);
      return { data: filtered[0] || null, error: null };
    },
    then: (resolve: any) => {
      const filtered = applyFilters(dataset, chain._filters);
      resolve({ data: filtered, error: null, count: filtered.length });
    },
  };

  // Make it thenable
  Object.defineProperty(chain, 'then', {
    value: (resolve: any, reject?: any) => {
      const filtered = applyFilters(dataset, chain._filters);
      return Promise.resolve({ data: filtered, error: null, count: filtered.length }).then(resolve, reject);
    },
  });

  return chain;
}

function applyFilters(data: any[], filters: any[]) {
  let result = data;
  for (const f of filters) {
    result = result.filter((row) => row[f.col] === f.val);
  }
  return result;
}

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: { user: DEMO_USER, access_token: 'demo', refresh_token: 'demo', expires_in: 3600, token_type: 'bearer' } }, error: null }),
    getUser: async () => ({ data: { user: DEMO_USER }, error: null }),
    signInWithPassword: async (...args: any[]) => ({ data: { user: DEMO_USER, session: {} }, error: null }),
    signUp: async (...args: any[]) => ({ data: { user: DEMO_USER, session: {} }, error: null }),
    signOut: async () => ({ error: null }),
    resend: async (...args: any[]) => ({ data: {}, error: null }),
    onAuthStateChange: (cb: any) => {
      setTimeout(() => cb('SIGNED_IN', { user: DEMO_USER }), 100);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithOAuth: async () => ({ data: {}, error: null }),
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
  },
  from: (table: string) => mockQuery(table),
  channel: (...args: any[]) => {
    const ch: any = {
      on: (...a: any[]) => ch,
      subscribe: (cb?: any) => { if (cb) cb('SUBSCRIBED'); return ch; },
      unsubscribe: () => {},
      track: (...a: any[]) => Promise.resolve(),
      presenceState: () => ({}),
      send: (...a: any[]) => Promise.resolve(),
    };
    return ch;
  },
  removeChannel: (...args: any[]) => Promise.resolve(),
  storage: {
    from: () => ({
      upload: async () => ({ data: { path: 'demo/photo.jpg' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=upload' } }),
      list: async () => ({ data: [], error: null }),
      remove: async () => ({ data: [], error: null }),
    }),
  },
  rpc: async (...args: any[]) => ({ data: [], error: null }),
  functions: {
    invoke: async (...args: any[]) => ({ data: {}, error: null }),
  },
};
