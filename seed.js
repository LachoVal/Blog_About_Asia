import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    return;
  }

  const file = fs.readFileSync(envPath, 'utf8');
  const lines = file.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing required env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).'
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const USERS = [
  { email: 'admin@travel.com', password: 'pass123', role: 'admin', username: 'admin' },
  { email: 'maria@gmail.com', password: 'pass123', role: 'user', username: 'maria' },
  { email: 'peter@gmail.com', password: 'pass123', role: 'user', username: 'peter' },
  { email: 'steve@gmail.com', password: 'pass123', role: 'user', username: 'steve' },
];

const COUNTRIES = [
  {
    name: 'Japan',
    description:
      'Japan blends timeless temples, neon cityscapes, and efficient transport, making it ideal for first-time and repeat Asia travelers alike.',
    image_url:
      'https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Thailand',
    description:
      'Thailand offers golden temples, lively street markets, and tropical islands, with incredible food and warm hospitality in every region.',
    image_url:
      'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'South Korea',
    description:
      'South Korea combines cutting-edge cities, rich royal history, and mountain landscapes, plus one of the most exciting cafe cultures in Asia.',
    image_url:
      'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1200&q=80',
  },
];

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const matched = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (matched) return matched;

    if (users.length < perPage) return null;
    page += 1;
  }
}

async function getOrCreateAuthUser({ email, password, username }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (error) throw error;
  if (!data?.user) throw new Error(`Failed to create auth user for ${email}`);
  return data.user;
}

async function ensureProfile(user, role) {
  const usernameBase = user.email?.split('@')[0] || 'user';
  const fallbackUsername = `${usernameBase}_${user.id.slice(0, 8)}`;

  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('id, username, role')
    .eq('id', user.id)
    .maybeSingle();

  if (selectError) throw selectError;

  if (!existing) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      username: fallbackUsername,
      role,
    });
    if (insertError) throw insertError;
    return;
  }

  if (existing.role !== role) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id);
    if (updateError) throw updateError;
  }
}

async function upsertCountry(country) {
  const { data, error } = await supabase
    .from('countries')
    .upsert(country, { onConflict: 'name' })
    .select('id, name')
    .single();

  if (error) throw error;
  return data;
}

async function upsertPost(post) {
  const { data: existing, error: findError } = await supabase
    .from('posts')
    .select('id')
    .eq('title', post.title)
    .eq('author_id', post.author_id)
    .order('created_at', { ascending: true })
    .limit(1);

  if (findError) throw findError;

  if (existing && existing.length > 0) {
    const existingId = existing[0].id;
    const { data, error } = await supabase
      .from('posts')
      .update(post)
      .eq('id', existingId)
      .select('id, title, is_approved')
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('posts')
    .insert(post)
    .select('id, title, is_approved')
    .single();

  if (error) throw error;
  return data;
}

async function ensureComment({ content, post_id, user_id }) {
  const { data: existing, error: findError } = await supabase
    .from('comments')
    .select('id')
    .eq('content', content)
    .eq('post_id', post_id)
    .eq('user_id', user_id)
    .limit(1);

  if (findError) throw findError;
  if (existing && existing.length > 0) return existing[0];

  const { data, error } = await supabase
    .from('comments')
    .insert({ content, post_id, user_id })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

async function ensureFavorite({ user_id, post_id }) {
  const { error } = await supabase
    .from('favorites')
    .upsert({ user_id, post_id }, { onConflict: 'user_id,post_id' });

  if (error) throw error;
}

async function seed() {
  console.log('Starting seed...');

  const userMap = {};
  for (const userSeed of USERS) {
    const user = await getOrCreateAuthUser(userSeed);
    await ensureProfile(user, userSeed.role);
    userMap[userSeed.email] = user;
    console.log(`✓ User ready: ${userSeed.email} (${userSeed.role})`);
  }

  const countryMap = {};
  for (const country of COUNTRIES) {
    const row = await upsertCountry(country);
    countryMap[country.name] = row;
    console.log(`✓ Country ready: ${country.name}`);
  }

  const mariaId = userMap['maria@gmail.com'].id;
  const peterId = userMap['peter@gmail.com'].id;

  const postsToSeed = [
    {
      title: '10 Days in Tokyo: Temples, Trains, and Late-Night Ramen',
      content:
        'A practical 10-day Tokyo itinerary covering Asakusa, Shibuya, day trips to Nikko, and budget tips for transport with a Suica card.',
      image_url:
        'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=1200&q=80',
      country_id: countryMap.Japan.id,
      author_id: mariaId,
      is_approved: true,
    },
    {
      title: 'Best Street Food in Bangkok: A Night Market Guide',
      content:
        'From mango sticky rice to boat noodles, this guide maps the best Bangkok food markets and what to order at each stop.',
      image_url:
        'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
      country_id: countryMap.Thailand.id,
      author_id: mariaId,
      is_approved: true,
    },
    {
      title: 'Exploring Seoul: Palaces by Day, Neon Alleys by Night',
      content:
        'An easy Seoul route covering Gyeongbokgung, Bukchon Hanok Village, Myeongdong, and practical metro tips for first-time visitors.',
      image_url:
        'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=1200&q=80',
      country_id: countryMap['South Korea'].id,
      author_id: peterId,
      is_approved: true,
    },
    {
      title: 'Quiet Corners of Kyoto: A Slow Weekend Plan',
      content:
        'A calmer Kyoto weekend focused on early temple visits, scenic riverside walks, and local cafes away from peak tourist crowds.',
      image_url:
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
      country_id: countryMap.Japan.id,
      author_id: peterId,
      is_approved: false,
    },
  ];

  const postMap = {};
  for (const post of postsToSeed) {
    const row = await upsertPost(post);
    postMap[post.title] = row;
    console.log(`✓ Post ready: ${post.title} (approved: ${row.is_approved})`);
  }

  await ensureComment({
    content: 'Amazing itinerary! I used this for my first trip to Tokyo and it was super helpful.',
    post_id: postMap['10 Days in Tokyo: Temples, Trains, and Late-Night Ramen'].id,
    user_id: peterId,
  });

  await ensureComment({
    content: 'The market list is spot-on. Yaowarat at night was my favorite food experience in Bangkok.',
    post_id: postMap['Best Street Food in Bangkok: A Night Market Guide'].id,
    user_id: mariaId,
  });

  console.log('✓ Comments ready: 2');

  await ensureFavorite({
    user_id: peterId,
    post_id: postMap['Best Street Food in Bangkok: A Night Market Guide'].id,
  });

  console.log('✓ Favorite ready: Peter -> Bangkok post');
  console.log('Seed completed successfully.');
}

seed().catch((error) => {
  console.error('Seed failed.');
  console.error(error);
  process.exit(1);
});