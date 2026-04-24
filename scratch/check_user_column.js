import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkUserColumn() {
  const { data, error } = await supabase
    .from('users')
    .select('is_admin')
    .limit(1)

  if (error) {
    console.error('Error selecting is_admin:', error.message)
    console.log('RESULT: COLUMN_MISSING')
  } else {
    console.log('RESULT: COLUMN_EXISTS')
  }
}

checkUserColumn()
