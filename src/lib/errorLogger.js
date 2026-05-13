import { supabase } from './supabase'

export async function logError(error, context = '') {
  try {
    const { userAgent, language } = navigator
    const { href } = window.location

    await supabase.from('error_logs').insert({
      message: error?.message ?? String(error),
      stack: error?.stack ?? null,
      context,
      url: href,
      user_agent: userAgent,
      language,
    })
  } catch {
    // silently ignore — logging should never break the app
  }
}
