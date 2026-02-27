const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL_FALLBACK = 'https://ygsmooajrqldzdtcukfd.supabase.co';
const SUPABASE_ANON_KEY_FALLBACK = 'sb_publishable_X3xx0LH-LOLJf7q5M52yVQ_JUq3AzT8';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FALLBACK;

let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

module.exports = {
    supabase,
    isSupabaseEnabled: Boolean(supabase)
};
