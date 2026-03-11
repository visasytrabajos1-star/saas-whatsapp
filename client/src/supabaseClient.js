import { createClient } from '@supabase/supabase-js'

// Fallback config object (empty) to avoid errors if file missing
const config = { supabaseUrl: null, supabaseKey: "TU_CLAVE_AQUI" };

// 1. Intentar usar variables de entorno (PRIORIDAD)
// 2. Si no, intentar usar config hardcoded (DESARROLLO LOCAL)
const cleanStr = (s) => (s || "").trim();

// Hardcoded fallbacks (safe to expose — these are public Supabase credentials)
const SUPABASE_URL_FALLBACK = 'https://ygsmooajrqldzdtcukfd.supabase.co';
const SUPABASE_KEY_FALLBACK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnc21vb2FqcnFsZHpkdGN1a2ZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NDYxMzIsImV4cCI6MjA4NzMyMjEzMn0.ioireDt3ZMI3RBKxwgslXQM9Xiw1zVAkOwnZ6MAXulM';

const supabaseUrl = cleanStr(import.meta.env.VITE_SUPABASE_URL) || SUPABASE_URL_FALLBACK;
const supabaseKey = cleanStr(import.meta.env.VITE_SUPABASE_ANON_KEY) || SUPABASE_KEY_FALLBACK;

// ... debug helper ...

let supabase = null;

if (supabaseUrl && supabaseKey && supabaseKey !== "TU_CLAVE_AQUI") {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
    } catch (e) {
        console.error("Error inicializando Supabase Client:", e);
    }
} else {
    console.warn('⚠️ Supabase no configurado o en Modo Demo.');
}

export { supabase };
