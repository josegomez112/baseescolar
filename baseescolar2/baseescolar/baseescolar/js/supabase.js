// Conexión a Supabase para el frontend del proyecto.
// Este archivo debe cargarse como módulo en el HTML para que pueda exportarse
// e importarse desde otros archivos JavaScript.
// Ejemplo de uso en el HTML:
// <script type="module" src="js/supabase.js"></script>
// Ejemplo de importación desde otro archivo:
// import { supabase } from './supabase.js';

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// URL del proyecto de Supabase.
const SUPABASE_URL = 'https://sfwzjpkgdxzptkscvlvr.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmd3pqcGtnZHh6cHRrc2N2bHZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3OTE5MzEsImV4cCI6MjEwMTM2NzkzMX0.w6JcoF7owLpRu-g4NNq9E33GJFfGhYcGx_RfLxaq5JY';

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

// También queda disponible como variable global para compatibilidad con scripts
// que no usen módulos.
window.supabase = supabase;

console.log("URL Supabase:", SUPABASE_URL);
console.log("Inicio de clave:", SUPABASE_ANON_KEY.substring(0, 25));