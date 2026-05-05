import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setAdmin() {
  const { data: users, error: err } = await supabase.from('users').select('*');
  console.log('All users:', users);

  const { data, error } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .ilike('email', 'tylerleedixon@gmail.com')
    .select();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}

setAdmin();
