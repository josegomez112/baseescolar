```javascript
import { supabase } from './supabase.js';

console.log('administrador.js conectado a Supabase');

// =====================================================
// MENSAJES
// =====================================================

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

// =====================================================
// CREAR FILA DE TABLA
// =====================================================

function crearFilaTabla(celdas) {
  const fila = document.createElement('tr');

  celdas.forEach((valor) => {
    const celda = document.createElement('td');

    if (valor === null || valor === undefined) {
      celda.textContent = '-';
    } else {
      celda.textContent = valor;
    }

    fila.appendChild(celda);
  });

  return fila;
}

// =====================================================
// RESUMEN DEL ADMINISTRADOR
// =====================================================

async function cargarResumenSupabase() {
  try {
    const [
      resultadoAlumnos,
      resultadoDocentes,
      resultadoMaterias,
      resultadoUsuarios
    ] = await Promise.all([

      supabase
        .from('alumno')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('docente')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('materia')
        .select('*', { count: 'exact', head: true }),

      supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true })
    ]);

    if (resultadoAlumnos.error) throw resultadoAlumnos.error;
    if (resultadoDocentes.error) throw resultadoDocentes.error;
    if (resultadoMaterias.error) throw resultadoMaterias.error;
    if (resultadoUsuarios.error) throw resultadoUsuarios.error;

    const cardAlumnos = document.querySelector('#card-total-alumnos p');
    const cardDocentes = document.querySelector('#card-total-docentes p');
    const cardMaterias = document.querySelector('#card-total-materias p');
    const cardUsuarios = document.querySelector('#card-total-usuarios p');

    if (cardAlumnos) {
      cardAlumnos.textContent = resultadoAlumnos.count ?? 0;
    }

    if (cardDocentes) {
      cardDocentes.textContent = resultadoDocentes.count ?? 0;
    }

    if (cardMaterias) {
      cardMaterias.textContent = resultadoMaterias.count ?? 0;
    }

    if (cardUsuarios) {
      cardUsuarios.textContent = resultadoUsuarios.count ?? 0;
    }

    console.log('Resumen de Supabase:', {
      alumnos: resultadoAlumnos.count,
      docentes: resultadoDocentes.count,
      materias: resultadoMaterias.count,
      usuarios: resultadoUsuarios.count
    });

  } catch (error) {
    console.error('Error cargando resumen:', error);

    mostrarMensaje(
      'No se pudo cargar el resumen del sistema.',
      'error'
    );
  }
}

// =====================================================
// ALUMNOS
// =====================================================

async function cargarAlumnos() {
  const tbody = document.querySelector('#alumnos-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  const { data, error } = await supabase
    .from('alumno')
    .select('dni, nombre, apellido')
    .order('apellido', { ascending: true });

  if (error) {
    console.error('Error cargando alumnos:', error);
    mostrarMensaje('Error al cargar los alumnos.', 'error');
    return;
  }

  data.forEach((alumno) => {

    const fila = crearFilaTabla([
      alumno.dni,
      alumno.nombre,
      alumno.apellido,
      '-'
    ]);

    tbody.appendChild(fila);
  });

  console.log('Alumnos cargados:', data.length);
}

// =====================================================
// DOCENTES
// =====================================================

async function cargarDocentes() {
  const tbody = document.querySelector('#docentes-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  const { data, error } = await supabase
    .from('docente')
    .select('dni, nombre, apellido')
    .order('apellido', { ascending: true });

  if (error) {
    console.error('Error cargando docentes:', error);
    mostrarMensaje('Error al cargar los docentes.', 'error');
    return;
  }

  data.forEach((docente) => {

    const fila = crearFilaTabla([
      docente.dni,
      docente.nombre,
      docente.apellido,
      '-'
    ]);

    tbody.appendChild(fila);
  });

  console.log('Docentes cargados:', data.length);
}

// =====================================================
// PRECEPTORES
// =====================================================

async function cargarPreceptores() {
  const tbody = document.querySelector('#preceptores-table tbody');

  if (!tbody) {
    console.log('No existe tabla de preceptores en este HTML.');
    return;
  }

  tbody.innerHTML = '';

  const { data, error } = await supabase
    .from('preceptor')
    .select('dni, nombre, apellido')
    .order('apellido', { ascending: true });

  if (error) {
    console.error('Error cargando preceptores:', error);
    mostrarMensaje('Error al cargar los preceptores.', 'error');
    return;
  }

  data.forEach((preceptor) => {

    const fila = crearFilaTabla([
      preceptor.dni,
      preceptor.nombre,
      preceptor.apellido
    ]);

    tbody.appendChild(fila);
  });

  console.log('Preceptores cargados:', data.length);
}

// =====================================================
// MATERIAS
// =====================================================

async function cargarMaterias() {
  const tbody = document.querySelector('#materias-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  const { data, error } = await supabase
    .from('materia')
    .select('id, nombre')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error cargando materias:', error);
    mostrarMensaje('Error al cargar las materias.', 'error');
    return;
  }

  data.forEach((materia) => {

    const fila = crearFilaTabla([
      materia.nombre,
      '-',
      '-'
    ]);

    tbody.appendChild(fila);
  });

  console.log('Materias cargadas:', data.length);
}

// =====================================================
// USUARIOS
// =====================================================

async function cargarUsuarios() {

  const tbody = document.querySelector('#usuarios-table tbody');

  if (!tbody) {
    console.log('No existe tabla de usuarios en este HTML.');
    return;
  }

  tbody.innerHTML = '';

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, usuario, rol, dni')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error cargando usuarios:', error);
    mostrarMensaje('Error al cargar los usuarios.', 'error');
    return;
  }

  data.forEach((usuario) => {

    const fila = crearFilaTabla([
      usuario.usuario,
      usuario.rol,
      usuario.dni
    ]);

    tbody.appendChild(fila);
  });

  console.log('Usuarios cargados:', data.length);
}

// =====================================================
// NOTAS
// =====================================================

async function cargarNotas() {

  const tbody = document.querySelector('#notas-table tbody');

  if (!tbody) {
    console.log('Todavía no existe tabla de notas en el HTML.');
    return;
  }

  tbody.innerHTML = '';

  const { data, error } = await supabase
    .from('notas')
    .select('id, nota, dni_alumno, dni_docente, id_materia')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error cargando notas:', error);
    mostrarMensaje('Error al cargar las notas.', 'error');
    return;
  }

  data.forEach((nota) => {

    const fila = crearFilaTabla([
      nota.id,
      nota.dni_alumno,
      nota.dni_docente,
      nota.id_materia,
      nota.nota
    ]);

    tbody.appendChild(fila);
  });

  console.log('Notas cargadas:', data.length);
}

// =====================================================
// ASISTENCIAS
// =====================================================

async function cargarAsistencias() {

  const tbody = document.querySelector('#asistencias-table tbody');

  if (!tbody) {
    console.log('Todavía no existe tabla de asistencias en el HTML.');
    return;
  }

  tbody.innerHTML = '';

  const { data, error } = await supabase
    .from('asistencia')
    .select('id, fecha, estado, dni_alumno, dni_preceptor')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error cargando asistencias:', error);
    mostrarMensaje(
      'Error al cargar las asistencias.',
      'error'
    );
    return;
  }

  data.forEach((asistencia) => {

    const fila = crearFilaTabla([
      asistencia.id,
      asistencia.fecha,
      asistencia.dni_alumno,
      asistencia.estado,
      asistencia.dni_preceptor
    ]);

    tbody.appendChild(fila);
  });

  console.log('Asistencias cargadas:', data.length);
}

// =====================================================
// BIENVENIDA
// =====================================================

function mostrarBienvenida() {

  const welcomeTitle =
    document.querySelector('#welcome-title') ||
    document.querySelector('.welcome-title');

  if (welcomeTitle) {
    welcomeTitle.textContent =
      'Bienvenido/a, administrador';
  }
}

// =====================================================
// CERRAR SESIÓN
// =====================================================

function configurarCerrarSesion() {

  const logoutButton =
    document.querySelector('#logout-button');

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener('click', () => {

    window.location.href = 'index.html';

  });
}

// =====================================================
// INICIALIZACIÓN
// =====================================================

async function inicializarAdministradorPanel() {

  console.log('Inicializando panel administrador...');

  mostrarBienvenida();

  await cargarResumenSupabase();

  await cargarAlumnos();

  await cargarDocentes();

  await cargarPreceptores();

  await cargarMaterias();

  await cargarUsuarios();

  await cargarNotas();

  await cargarAsistencias();

  configurarCerrarSesion();

  console.log(
    'Panel administrador inicializado correctamente.'
  );

  window.adminPanel = {

    cargarResumenSupabase,

    cargarAlumnos,

    cargarDocentes,

    cargarPreceptores,

    cargarMaterias,

    cargarUsuarios,

    cargarNotas,

    cargarAsistencias

  };
}

// =====================================================
// ARRANQUE
// =====================================================

document.addEventListener(
  'DOMContentLoaded',
  inicializarAdministradorPanel
);
```
