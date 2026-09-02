// Datos simulados del docente para desarrollar la lógica del panel.
// Estos datos se sustituyen más adelante por consultas a Supabase.
const docenteData = {
  docente: {
    dni: '30123456',
    nombre: 'María',
    apellido: 'García'
  },
  materias: [
    { materia: 'Matemática', curso: '5° A', cantidadAlumnos: 32 },
    { materia: 'Historia', curso: '4° B', cantidadAlumnos: 28 },
    { materia: 'Lengua', curso: '6° A', cantidadAlumnos: 30 },
    { materia: 'Biología', curso: '3° C', cantidadAlumnos: 24 }
  ],
  alumnos: [
    { dni: '40123456', nombre: 'Juan', apellido: 'Pérez', estado: 'Regular' },
    { dni: '40234567', nombre: 'María', apellido: 'Gómez', estado: 'Regular' },
    { dni: '40345678', nombre: 'Luis', apellido: 'Fernández', estado: 'Observado' },
    { dni: '40456789', nombre: 'Ana', apellido: 'Martínez', estado: 'Regular' }
  ],
  notas: [
    { alumno: 'Juan Pérez', materia: 'Matemática', nota: 9, fecha: '2026-08-01' },
    { alumno: 'María Gómez', materia: 'Historia', nota: 8, fecha: '2026-07-28' },
    { alumno: 'Luis Fernández', materia: 'Lengua', nota: 7.5, fecha: '2026-07-25' }
  ],
  asistencias: [
    { alumno: 'Juan Pérez', fecha: '2026-08-03', estado: 'Presente' },
    { alumno: 'María Gómez', fecha: '2026-08-03', estado: 'Ausente' },
    { alumno: 'Luis Fernández', fecha: '2026-08-03', estado: 'Tarde' }
  ]
};

// Función reutilizable para crear filas de tabla.
function crearFilaTabla(celdas) {
  const fila = document.createElement('tr');

  celdas.forEach((valor) => {
    const celda = document.createElement('td');
    celda.textContent = valor;
    fila.appendChild(celda);
  });

  return fila;
}

// --------- Carga de perfil ---------
function cargarPerfilDocente() {
  const dniElement = document.querySelector('#perfil-dni');
  const nombreElement = document.querySelector('#perfil-nombre');
  const apellidoElement = document.querySelector('#perfil-apellido');

  if (dniElement) {
    dniElement.textContent = docenteData.docente.dni;
  }

  if (nombreElement) {
    nombreElement.textContent = docenteData.docente.nombre;
  }

  if (apellidoElement) {
    apellidoElement.textContent = docenteData.docente.apellido;
  }
}

// --------- Carga de materias ---------
function cargarMaterias() {
  const tbody = document.querySelector('#mis-materias-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  docenteData.materias.forEach((materia) => {
    const fila = crearFilaTabla([
      materia.materia,
      materia.curso,
      materia.cantidadAlumnos
    ]);
    tbody.appendChild(fila);
  });
}

// --------- Carga de alumnos ---------
function cargarAlumnos() {
  const tbody = document.querySelector('#lista-alumnos-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  docenteData.alumnos.forEach((alumno) => {
    const fila = crearFilaTabla([
      alumno.dni,
      alumno.nombre,
      alumno.apellido,
      alumno.estado
    ]);
    tbody.appendChild(fila);
  });
}

// --------- Carga de notas ---------
function cargarNotas() {
  const container = document.querySelector('#notas-container');

  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (docenteData.notas.length === 0) {
    container.textContent = 'No hay notas cargadas.';
    return;
  }

  const list = document.createElement('ul');

  docenteData.notas.forEach((nota) => {
    const item = document.createElement('li');
    item.textContent = `${nota.alumno} - ${nota.materia}: ${nota.nota} (${nota.fecha})`;
    list.appendChild(item);
  });

  container.appendChild(list);
}

// --------- Carga de asistencias ---------
function cargarAsistencias() {
  const container = document.querySelector('#asistencias-container');

  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (docenteData.asistencias.length === 0) {
    container.textContent = 'No hay asistencias registradas.';
    return;
  }

  const list = document.createElement('ul');

  docenteData.asistencias.forEach((registro) => {
    const item = document.createElement('li');
    item.textContent = `${registro.alumno} - ${registro.fecha}: ${registro.estado}`;
    list.appendChild(item);
  });

  container.appendChild(list);
}

// --------- Mensaje de bienvenida ---------
function mostrarBienvenida() {
  const welcomeTitle = document.querySelector('#welcome-title');

  if (welcomeTitle) {
    welcomeTitle.textContent = `Bienvenido/a, ${docenteData.docente.nombre} ${docenteData.docente.apellido}`;
  }
}

// --------- Cerrar sesión ---------
function configurarCerrarSesion() {
  const logoutButton = document.querySelector('#logout-button');

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

// --------- Validación de formularios ---------
function validarCamposObligatorios(campos) {
  return campos.every((campo) => {
    const value = campo.value.trim();
    return value !== '';
  });
}

// --------- Registrar nueva nota ---------
function registrarNota() {
  const form = document.querySelector('#cargar-nota-form');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const alumnoInput = document.querySelector('#alumno-nota');
    const materiaInput = document.querySelector('#materia-nota');
    const notaInput = document.querySelector('#nota');

    const campos = [alumnoInput, materiaInput, notaInput];

    if (!validarCamposObligatorios(campos)) {
      alert('Debe completar alumno, materia y nota.');
      return;
    }

    const nuevaNota = {
      alumno: alumnoInput.value.trim(),
      materia: materiaInput.value.trim(),
      nota: Number(notaInput.value),
      fecha: new Date().toISOString().split('T')[0]
    };

    docenteData.notas.push(nuevaNota);
    cargarNotas();
    form.reset();
  });
}

// --------- Registrar asistencia ---------
function registrarAsistencia() {
  const form = document.querySelector('#registrar-asistencia-form');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const alumnoInput = document.querySelector('#alumno-asistencia');
    const fechaInput = document.querySelector('#fecha-asistencia');
    const estadoSelect = document.querySelector('#estado-asistencia');

    const campos = [alumnoInput, fechaInput, estadoSelect];

    if (!validarCamposObligatorios(campos)) {
      alert('Debe completar alumno, fecha y estado para registrar asistencia.');
      return;
    }

    const nuevoRegistro = {
      alumno: alumnoInput.value.trim(),
      fecha: fechaInput.value,
      estado: estadoSelect.value
    };

    docenteData.asistencias.push(nuevoRegistro);
    cargarAsistencias();
    form.reset();
  });
}

// --------- Inicialización del panel ---------
function inicializarDocentePanel() {
  mostrarBienvenida();
  cargarPerfilDocente();
  cargarMaterias();
  cargarAlumnos();
  cargarNotas();
  cargarAsistencias();
  configurarCerrarSesion();
  registrarNota();
  registrarAsistencia();
}

document.addEventListener('DOMContentLoaded', inicializarDocentePanel);
