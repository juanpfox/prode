import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkColumn() {
  const { data, error } = await supabase
    .from('tournaments')
    .select('is_featured')
    .limit(1)

  if (error) {
    console.error('Error selecting is_featured:', error.message)
    if (error.message.includes('column "is_featured" does not exist')) {
      console.log('RESULT: COLUMN_MISSING')
    } else {
      console.log('RESULT: OTHER_ERROR')
    }
  } else {
    console.log('RESULT: COLUMN_EXISTS')
  }
}

checkColumn()
