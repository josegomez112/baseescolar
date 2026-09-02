
import { supabase } from './supabase.js';
console.log("login.js arrancó");

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('login-error');

  if (!loginForm || !errorMessage) {
    return;
  }

  const rolePages = {
    alumno: 'alumno.html',
    docente: 'docente.html',
    preceptor: 'preceptor.html',
    administrador: 'administrador.html'
  };

  const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
  };

  const clearError = () => {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Se obtienen los valores del formulario.
    const usuario = document.getElementById('usuario')?.value.trim() || '';
    const password = document.getElementById('password')?.value.trim() || '';
    const rol = document.getElementById('rol')?.value.trim() || '';

    clearError();

    // Validación de campos obligatorios.
    if (!usuario || !password || !rol) {
      showError('Debe completar usuario, contraseña y rol para iniciar sesión.');
      return;
    }

    // Verifica que el rol seleccionado exista en el mapeo.
    const targetPage = rolePages[rol];

    if (!targetPage) {
      showError('El rol seleccionado no es válido.');
      return;
    }

    try {
      // Consulta la tabla de usuarios con los tres filtros solicitados.
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('usuario', usuario)
        .eq('password', password)
        .eq('rol', rol)
        .maybeSingle();

      // Maneja errores de conexión o de consulta.
      if (error) {
        throw error;
      }

      // Si no existe el usuario, muestra el mensaje requerido.
      if (!data) {
        showError('Usuario o contraseña incorrectos.');
        return;
      }

      // Si el usuario existe, redirige según el rol.
      window.location.href = targetPage;
    } catch (error) {
      console.error('Error al iniciar sesión con Supabase:', error);
      showError('Error de conexión. Inténtelo nuevamente.');
    }
  });
});
