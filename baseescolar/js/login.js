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

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const usuario = document.getElementById('usuario')?.value.trim() || '';
    const password = document.getElementById('password')?.value.trim() || '';
    const rol = document.getElementById('rol')?.value.trim() || '';

    clearError();

    // Validación de campos obligatorios.
    if (!usuario || !password || !rol) {
      showError('Debe completar usuario, contraseña y rol para iniciar sesión.');
      return;
    }

    // Validación de acceso: por ahora solo se valida que los campos existan.
    // Cuando se conecte con Supabase, aquí se reemplazará por la consulta de autenticación.
    const targetPage = rolePages[rol];

    if (!targetPage) {
      showError('El rol seleccionado no es válido.');
      return;
    }

    // Redirección según el rol.
    window.location.href = targetPage;
  });
});
