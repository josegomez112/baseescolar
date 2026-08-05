// Datos simulados para el panel del alumno.
// Estos datos se reemplazarán más adelante por consultas a Supabase.
const alumnoData = {
  welcomeMessage: 'Bienvenido/a, Juan Pérez',
  materias: [
    { materia: 'Matemática', docente: 'Prof. García', estado: 'En curso' },
    { materia: 'Historia', docente: 'Prof. López', estado: 'Regular' },
    { materia: 'Lengua', docente: 'Prof. Romero', estado: 'En curso' },
    { materia: 'Biología', docente: 'Prof. Silva', estado: 'Aprobada' },
    { materia: 'Educación Física', docente: 'Prof. Costa', estado: 'En curso' }
  ],
  notas: [
    { materia: 'Matemática', nota: 9, fecha: '2026-08-01' },
    { materia: 'Historia', nota: 8, fecha: '2026-07-28' },
    { materia: 'Lengua', nota: 9.5, fecha: '2026-07-25' },
    { materia: 'Biología', nota: 7.8, fecha: '2026-07-20' }
  ],
  asistencias: [
    { fecha: '2026-08-01', estado: 'Presente' },
    { fecha: '2026-07-30', estado: 'Ausente' },
    { fecha: '2026-07-29', estado: 'Presente' },
    { fecha: '2026-07-28', estado: 'Tarde' }
  ],
  perfil: {
    dni: '40123456',
    nombre: 'Juan',
    apellido: 'Pérez'
  }
};

// Utilidad para crear filas de tabla a partir de un array de objetos.
function crearFilaTabla(celdas) {
  const fila = document.createElement('tr');

  celdas.forEach((valor) => {
    const celda = document.createElement('td');
    celda.textContent = valor;
    fila.appendChild(celda);
  });

  return fila;
}

// Carga dinámica de materias.
function cargarMaterias() {
  const tbody = document.querySelector('#materias-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  alumnoData.materias.forEach((materia) => {
    const fila = crearFilaTabla([
      materia.materia,
      materia.docente,
      materia.estado
    ]);
    tbody.appendChild(fila);
  });
}

// Carga dinámica de notas.
function cargarNotas() {
  const tbody = document.querySelector('#notas-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  alumnoData.notas.forEach((nota) => {
    const fila = crearFilaTabla([
      nota.materia,
      nota.nota,
      nota.fecha
    ]);
    tbody.appendChild(fila);
  });
}

// Carga dinámica de asistencias.
function cargarAsistencias() {
  const tbody = document.querySelector('#asistencias-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  alumnoData.asistencias.forEach((asistencia) => {
    const fila = crearFilaTabla([
      asistencia.fecha,
      asistencia.estado
    ]);
    tbody.appendChild(fila);
  });
}

// Carga dinámica del perfil del alumno.
function cargarPerfil() {
  const perfilDni = document.querySelector('#perfil-dni');
  const perfilNombre = document.querySelector('#perfil-nombre');
  const perfilApellido = document.querySelector('#perfil-apellido');

  if (perfilDni) {
    perfilDni.textContent = alumnoData.perfil.dni;
  }

  if (perfilNombre) {
    perfilNombre.textContent = alumnoData.perfil.nombre;
  }

  if (perfilApellido) {
    perfilApellido.textContent = alumnoData.perfil.apellido;
  }
}

// Muestra un mensaje de bienvenida al cargar la página.
function mostrarBienvenida() {
  const welcomeTitle = document.querySelector('#welcome-title');

  if (welcomeTitle) {
    welcomeTitle.textContent = alumnoData.welcomeMessage;
  }
}

// Navegación del menú lateral con desplazamiento suave.
function configurarMenuNavegacion() {
  const links = document.querySelectorAll('.sidebar-menu a');

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const destino = link.getAttribute('href');

      if (!destino || destino === '#') {
        event.preventDefault();
        return;
      }

      const target = document.querySelector(destino);

      if (target) {
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// Botón de cerrar sesión: vuelve a la pantalla de login.
function configurarCerrarSesion() {
  const logoutButton = document.querySelector('#logout-button');

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      window.location.href = 'index.html';
    });
  }
}

// Inicializa la lógica del panel cuando la página carga.
function inicializarAlumnoPanel() {
  mostrarBienvenida();
  cargarMaterias();
  cargarNotas();
  cargarAsistencias();
  cargarPerfil();
  configurarMenuNavegacion();
  configurarCerrarSesion();
}

document.addEventListener('DOMContentLoaded', inicializarAlumnoPanel);
