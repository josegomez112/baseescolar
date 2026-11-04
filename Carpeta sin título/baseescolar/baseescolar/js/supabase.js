import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// URL del proyecto de Supabase.
const SUPABASE_URL = 'https://yjawhmedfchbmriluani.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqYXdobWVkZmNoYm1yaWx1YW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4OTQ1OTUsImV4cCI6MjA5NzQ3MDU5NX0.PQ4u1yKosrzKZaSYcpp90Y2lzUp43omuZTfVof6ESNE';

// Se crea una única instancia del cliente de Supabase para toda la app.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Exporta la instancia para reutilizarla desde otros archivos JavaScript.
export { supabase };


window.supabase = supabase;

console.log("URL Supabase:", SUPABASE_URL);
console.log("Inicio de clave:", SUPABASE_ANON_KEY.substring(0, 25));