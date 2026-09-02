// Datos simulados para el panel administrativo.
// Se reemplazarán por consultas reales a Supabase cuando se conecte la base de datos.
const adminData = {
  usuarios: [
    { nombre: 'Juan', apellido: 'Pérez', email: 'juan@escuela.com', rol: 'alumno' },
    { nombre: 'María', apellido: 'García', email: 'maria@escuela.com', rol: 'docente' },
    { nombre: 'Laura', apellido: 'Ramírez', email: 'laura@escuela.com', rol: 'preceptor' },
    { nombre: 'Lic. Torres', apellido: 'Admin', email: 'admin@escuela.com', rol: 'administrador' }
  ],
  alumnos: [
    { dni: '40123456', nombre: 'Juan', apellido: 'Pérez', curso: '5° A' },
    { dni: '40234567', nombre: 'María', apellido: 'Gómez', curso: '6° B' },
    { dni: '40345678', nombre: 'Luis', apellido: 'Fernández', curso: '7° A' }
  ],
  docentes: [
    { dni: '30123456', nombre: 'María', apellido: 'García', especialidad: 'Matemática' },
    { dni: '30234567', nombre: 'Pedro', apellido: 'López', especialidad: 'Historia' },
    { dni: '30345678', nombre: 'Ana', apellido: 'Romero', especialidad: 'Lengua' }
  ],
  preceptores: [
    { dni: '20012345', nombre: 'Laura', apellido: 'Ramírez', curso: '5° A' },
    { dni: '20023456', nombre: 'Carlos', apellido: 'Sosa', curso: '6° B' }
  ],
  materias: [
    { id: 1, nombre: 'Matemática', curso: '5° A', docente: 'María García' },
    { id: 2, nombre: 'Historia', curso: '4° B', docente: 'Pedro López' },
    { id: 3, nombre: 'Lengua', curso: '6° A', docente: 'Ana Romero' }
  ]
};

// Función auxiliar para crear filas de tabla.
function crearFilaTabla(celdas) {
  const fila = document.createElement('tr');

  celdas.forEach((valor) => {
    const celda = document.createElement('td');
    celda.textContent = valor;
    fila.appendChild(celda);
  });

  return fila;
}

// Función reutilizable para mostrar mensajes dentro de la interfaz.
function mostrarMensaje(mensaje, tipo = 'success') {
  const existing = document.querySelector('#admin-message');

  if (existing) {
    existing.remove();
  }

  const box = document.createElement('p');
  box.id = 'admin-message';
  box.textContent = mensaje;
  box.style.marginTop = '12px';
  box.style.padding = '10px 12px';
  box.style.borderRadius = '8px';
  box.style.fontWeight = '600';

  if (tipo === 'error') {
    box.style.background = '#fdecec';
    box.style.color = '#b42318';
  } else {
    box.style.background = '#eafaf3';
    box.style.color = '#1f7a52';
  }

  const mainContent = document.querySelector('#main-content');

  if (mainContent) {
    mainContent.appendChild(box);
  }
}

// ----- Carga usuarios -----
function cargarUsuarios() {
  const tbody = document.querySelector('#usuarios-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  adminData.usuarios.forEach((usuario) => {
    const fila = crearFilaTabla([
      usuario.nombre,
      usuario.apellido,
      usuario.email,
      usuario.rol
    ]);
    tbody.appendChild(fila);
  });
}

// ----- Carga alumnos -----
function cargarAlumnos() {
  const tbody = document.querySelector('#alumnos-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  adminData.alumnos.forEach((alumno) => {
    const fila = crearFilaTabla([
      alumno.dni,
      alumno.nombre,
      alumno.apellido,
      alumno.curso
    ]);
    tbody.appendChild(fila);
  });
}

// ----- Carga docentes -----
function cargarDocentes() {
  const tbody = document.querySelector('#docentes-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  adminData.docentes.forEach((docente) => {
    const fila = crearFilaTabla([
      docente.dni,
      docente.nombre,
      docente.apellido,
      docente.especialidad
    ]);
    tbody.appendChild(fila);
  });
}

// ----- Carga preceptores -----
function cargarPreceptores() {
  const tbody = document.querySelector('#preceptores-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  adminData.preceptores.forEach((preceptor) => {
    const fila = crearFilaTabla([
      preceptor.dni,
      preceptor.nombre,
      preceptor.apellido,
      preceptor.curso
    ]);
    tbody.appendChild(fila);
  });
}

// ----- Carga materias -----
function cargarMaterias() {
  const tbody = document.querySelector('#materias-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  adminData.materias.forEach((materia) => {
    const fila = crearFilaTabla([
      materia.id,
      materia.nombre,
      materia.curso,
      materia.docente
    ]);
    tbody.appendChild(fila);
  });
}

// Validación simple de campos obligatorios.
function validarCamposObligatorios(campos) {
  return campos.every((campo) => {
    const valor = campo.value.trim();
    return valor !== '';
  });
}

// ----- CRUD Alumnos -----
function agregarAlumno() {
  const form = document.querySelector('#form-agregar-alumno');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const dni = document.querySelector('#alumno-dni');
    const nombre = document.querySelector('#alumno-nombre');
    const apellido = document.querySelector('#alumno-apellido');
    const curso = document.querySelector('#alumno-curso');

    if (!validarCamposObligatorios([dni, nombre, apellido, curso])) {
      mostrarMensaje('Debe completar todos los campos del alumno.', 'error');
      return;
    }

    adminData.alumnos.push({
      dni: dni.value.trim(),
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      curso: curso.value.trim()
    });

    cargarAlumnos();
    form.reset();
    mostrarMensaje('Alumno agregado correctamente.');
  });
}

function editarAlumno() {
  if (!adminData.alumnos.length) {
    mostrarMensaje('No hay alumnos para editar.', 'error');
    return;
  }

  const alumno = adminData.alumnos[0];
  alumno.nombre = 'Alumno';
  alumno.apellido = 'Modificado';
  alumno.curso = '8° C';

  cargarAlumnos();
  mostrarMensaje('Alumno editado correctamente.');
}

function eliminarAlumno() {
  if (!adminData.alumnos.length) {
    mostrarMensaje('No hay alumnos para eliminar.', 'error');
    return;
  }

  adminData.alumnos.pop();
  cargarAlumnos();
  mostrarMensaje('Alumno eliminado correctamente.');
}

// ----- CRUD Docentes -----
function agregarDocente() {
  const form = document.querySelector('#form-agregar-docente');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const dni = document.querySelector('#docente-dni');
    const nombre = document.querySelector('#docente-nombre');
    const apellido = document.querySelector('#docente-apellido');
    const especialidad = document.querySelector('#docente-especialidad');

    if (!validarCamposObligatorios([dni, nombre, apellido, especialidad])) {
      mostrarMensaje('Debe completar todos los campos del docente.', 'error');
      return;
    }

    adminData.docentes.push({
      dni: dni.value.trim(),
      nombre: nombre.value.trim(),
      apellido: apellido.value.trim(),
      especialidad: especialidad.value.trim()
    });

    cargarDocentes();
    form.reset();
    mostrarMensaje('Docente agregado correctamente.');
  });
}

function editarDocente() {
  if (!adminData.docentes.length) {
    mostrarMensaje('No hay docentes para editar.', 'error');
    return;
  }

  const docente = adminData.docentes[0];
  docente.nombre = 'Docente';
  docente.apellido = 'Editado';
  docente.especialidad = 'Informática';

  cargarDocentes();
  mostrarMensaje('Docente editado correctamente.');
}

function eliminarDocente() {
  if (!adminData.docentes.length) {
    mostrarMensaje('No hay docentes para eliminar.', 'error');
    return;
  }

  adminData.docentes.pop();
  cargarDocentes();
  mostrarMensaje('Docente eliminado correctamente.');
}

// ----- CRUD Materias -----
function agregarMateria() {
  const form = document.querySelector('#form-agregar-materia');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const id = document.querySelector('#materia-id');
    const nombre = document.querySelector('#materia-nombre');
    const curso = document.querySelector('#materia-curso');
    const docente = document.querySelector('#materia-docente');

    if (!validarCamposObligatorios([id, nombre, curso, docente])) {
      mostrarMensaje('Debe completar todos los campos de la materia.', 'error');
      return;
    }

    adminData.materias.push({
      id: Number(id.value),
      nombre: nombre.value.trim(),
      curso: curso.value.trim(),
      docente: docente.value.trim()
    });

    cargarMaterias();
    form.reset();
    mostrarMensaje('Materia agregada correctamente.');
  });
}

function editarMateria() {
  if (!adminData.materias.length) {
    mostrarMensaje('No hay materias para editar.', 'error');
    return;
  }

  const materia = adminData.materias[0];
  materia.nombre = 'Materia editada';
  materia.curso = '9° A';

  cargarMaterias();
  mostrarMensaje('Materia editada correctamente.');
}

function eliminarMateria() {
  if (!adminData.materias.length) {
    mostrarMensaje('No hay materias para eliminar.', 'error');
    return;
  }

  adminData.materias.pop();
  cargarMaterias();
  mostrarMensaje('Materia eliminada correctamente.');
}

// Muestra un mensaje de bienvenida al cargar la página.
function mostrarBienvenida() {
  const welcomeTitle = document.querySelector('#welcome-title');

  if (welcomeTitle) {
    welcomeTitle.textContent = 'Bienvenido/a, administrador';
  }
}

// Botón de cerrar sesión.
function configurarCerrarSesion() {
  const logoutButton = document.querySelector('#logout-button');

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

// Inicialización del panel administrativo.
function inicializarAdministradorPanel() {
  mostrarBienvenida();
  cargarUsuarios();
  cargarAlumnos();
  cargarDocentes();
  cargarPreceptores();
  cargarMaterias();
  configurarCerrarSesion();
  agregarAlumno();
  agregarDocente();
  agregarMateria();

  window.adminPanel = {
    agregarAlumno,
    editarAlumno,
    eliminarAlumno,
    agregarDocente,
    editarDocente,
    eliminarDocente,
    agregarMateria,
    editarMateria,
    eliminarMateria,
    cargarUsuarios,
    cargarAlumnos,
    cargarDocentes,
    cargarPreceptores,
    cargarMaterias
  };
}

document.addEventListener('DOMContentLoaded', inicializarAdministradorPanel);
