import { supabase } from './supabase.js';

const DNI_DOCENTE = 87654321;

// Guardamos en memoria las materias y alumnos del docente
// para poder armar los selects de los formularios sin repetir consultas.
let materiasDelDocente = [];
let alumnosDelDocente = [];

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

// --------- Carga de perfil + encabezado ---------
async function cargarPerfilDocente() {
  const { data: docente, error } = await supabase
    .from('docente')
    .select('*')
    .eq('dni', DNI_DOCENTE)
    .single();

  if (error) {
    console.error('Error al buscar docente:', error);
    return;
  }

  console.log('Docente encontrado:', docente);

  const perfilDni = document.querySelector('#perfil-dni');
  const perfilNombre = document.querySelector('#perfil-nombre');
  const perfilApellido = document.querySelector('#perfil-apellido');
  const teacherName = document.querySelector('#teacher-name');
  const welcomeTitle = document.querySelector('#welcome-title');

  if (perfilDni) perfilDni.textContent = docente.dni;
  if (perfilNombre) perfilNombre.textContent = docente.nombre;
  if (perfilApellido) perfilApellido.textContent = docente.apellido;

  if (teacherName) {
    teacherName.textContent = `Docente: ${docente.nombre} ${docente.apellido}`;
  }

  if (welcomeTitle) {
    welcomeTitle.textContent = `Bienvenido/a, ${docente.nombre} ${docente.apellido}`;
  }
}

// --------- Carga de Mis Materias ---------
// Devuelve el array de materias (id, nombre, cantidadAlumnos) para reutilizar en los selects.
async function cargarMaterias() {
  const tbody = document.querySelector('#mis-materias-table tbody');

  const { data: relaciones, error: errorRelaciones } = await supabase
    .from('profesor_materia')
    .select('*')
    .eq('dni_docente', DNI_DOCENTE);

  if (errorRelaciones) {
    console.error('Error al buscar materias del docente:', errorRelaciones);
    return [];
  }

  console.log('Relaciones docente-materia encontradas:', relaciones);

  if (tbody) tbody.innerHTML = '';

  if (!relaciones || relaciones.length === 0) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="3">No tenés materias asignadas.</td></tr>`;
    }
    return [];
  }

  const materias = [];

  for (const relacion of relaciones) {

    const { data: materia, error: errorMateria } = await supabase
      .from('materia')
      .select('*')
      .eq('id', relacion.id_materia)
      .single();

    if (errorMateria) {
      console.error('Error al buscar materia:', errorMateria);
      continue;
    }

    const { data: alumnosDeMateria, error: errorAlumnosMateria } = await supabase
      .from('alumno_materia')
      .select('*')
      .eq('id_materia', relacion.id_materia);

    const cantidadAlumnos = errorAlumnosMateria || !alumnosDeMateria
      ? 0
      : alumnosDeMateria.length;

    materias.push({
      id: materia.id,
      nombre: materia.nombre,
      cantidadAlumnos
    });

    if (tbody) {
      const fila = crearFilaTabla([materia.nombre, '-', cantidadAlumnos]);
      tbody.appendChild(fila);
    }
  }

  return materias;
}

// --------- Carga de Mis Alumnos ---------
// Junta los alumnos de todas las materias del docente (sin duplicados).
async function cargarAlumnos(materias) {
  const tbody = document.querySelector('#lista-alumnos-table tbody');

  if (!materias || materias.length === 0) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4">No tenés alumnos asignados.</td></tr>`;
    }
    return [];
  }

  const idsDeMaterias = materias.map((m) => m.id);
  const dnisUnicos = new Set();

  for (const idMateria of idsDeMaterias) {

    const { data: relaciones, error } = await supabase
      .from('alumno_materia')
      .select('*')
      .eq('id_materia', idMateria);

    if (error) {
      console.error('Error al buscar alumnos de la materia:', error);
      continue;
    }

    relaciones.forEach((r) => dnisUnicos.add(r.dni_alumno));
  }

  if (tbody) tbody.innerHTML = '';

  if (dnisUnicos.size === 0) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4">No tenés alumnos asignados.</td></tr>`;
    }
    return [];
  }

  const alumnos = [];

  for (const dni of dnisUnicos) {

    const { data: alumno, error: errorAlumno } = await supabase
      .from('alumno')
      .select('*')
      .eq('dni', dni)
      .single();

    if (errorAlumno || !alumno) {
      console.error('Error al buscar alumno:', errorAlumno);
      continue;
    }

    alumnos.push(alumno);

    if (tbody) {
      const fila = crearFilaTabla([alumno.dni, alumno.nombre, alumno.apellido, '-']);
      tbody.appendChild(fila);
    }
  }

  return alumnos;
}

// --------- Tarjetas de resumen ---------
async function cargarResumen(materias, alumnos) {

  const cardMaterias = document.querySelector('#cantidadMateriasDocente');
  const cardAlumnos = document.querySelector('#cantidadAlumnosDocente');
  const cardAsistenciasHoy = document.querySelector('#asistenciasHoyDocente');

  if (cardMaterias) cardMaterias.textContent = materias.length;
  if (cardAlumnos) cardAlumnos.textContent = alumnos.length;

  // Asistencias registradas hoy por este docente
  const hoy = new Date().toISOString().split('T')[0];

  const { data: asistenciasHoy, error } = await supabase
    .from('asistencia')
    .select('*')
    .eq('dni_docente', DNI_DOCENTE)
    .eq('fecha', hoy);

  if (error) {
    console.error('Error al buscar asistencias de hoy:', error);
    if (cardAsistenciasHoy) cardAsistenciasHoy.textContent = '-';
    return;
  }

  if (cardAsistenciasHoy) {
    cardAsistenciasHoy.textContent = asistenciasHoy ? asistenciasHoy.length : 0;
  }

  // "Notas pendientes de cargar" no tiene una fuente de datos real todavía,
  // así que se deja en "-" para no inventar el número.
}

// --------- Poblar selects de los formularios ---------
function poblarSelectAlumnos(selectId, alumnos) {
  const select = document.querySelector(selectId);

  if (!select) return;

  select.innerHTML = '<option value="">Seleccione un alumno</option>';

  alumnos.forEach((alumno) => {
    const option = document.createElement('option');
    option.value = alumno.dni;
    option.textContent = `${alumno.nombre} ${alumno.apellido}`;
    select.appendChild(option);
  });
}

function poblarSelectMaterias(selectId, materias) {
  const select = document.querySelector(selectId);

  if (!select) return;

  select.innerHTML = '<option value="">Seleccione una materia</option>';

  materias.forEach((materia) => {
    const option = document.createElement('option');
    option.value = materia.id;
    option.textContent = materia.nombre;
    select.appendChild(option);
  });
}

// --------- Cerrar sesión ---------
function configurarCerrarSesion() {
  const logoutButton = document.querySelector('#logout-button');

  if (!logoutButton) return;

  logoutButton.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.href = 'index.html';
  });
}

// --------- Validación de formularios ---------
function validarCamposObligatorios(campos) {
  return campos.every((campo) => campo.value.trim() !== '');
}

// --------- Registrar nueva nota (INSERT real en Supabase) ---------
function registrarNota() {
  const form = document.querySelector('#cargar-nota-form');

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const alumnoSelect = document.querySelector('#alumno-nota');
    const materiaSelect = document.querySelector('#materia-nota');
    const notaInput = document.querySelector('#nota');

    const campos = [alumnoSelect, materiaSelect, notaInput];

    if (!validarCamposObligatorios(campos)) {
      alert('Debe completar alumno, materia y nota.');
      return;
    }

    const nuevaNota = {
      dni_alumno: Number(alumnoSelect.value),
      dni_docente: DNI_DOCENTE,
      id_materia: Number(materiaSelect.value),
      nota: Number(notaInput.value),
      fecha: new Date().toISOString().split('T')[0]
    };

    console.log('Insertando nota:', nuevaNota);

    const { error } = await supabase
      .from('notas')
      .insert([nuevaNota]);

    if (error) {
      console.error('Error al guardar la nota:', error);
      alert('Ocurrió un error al guardar la nota. Revisá la consola.');
      return;
    }

    alert('Nota guardada correctamente.');
    form.reset();
  });
}

// --------- Registrar asistencia (INSERT real en Supabase) ---------
function registrarAsistencia() {
  const form = document.querySelector('#registrar-asistencia-form');

  if (!form) return;

  const mapaEstados = {
    presente: 'Presente',
    ausente: 'Ausente',
    tarde: 'Tarde'
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const alumnoSelect = document.querySelector('#alumno-asistencia');
    const fechaInput = document.querySelector('#fecha-asistencia');
    const estadoSelect = document.querySelector('#estado-asistencia');

    const campos = [alumnoSelect, fechaInput, estadoSelect];

    if (!validarCamposObligatorios(campos)) {
      alert('Debe completar alumno, fecha y estado para registrar asistencia.');
      return;
    }

    const nuevoRegistro = {
      dni_alumno: Number(alumnoSelect.value),
      dni_docente: DNI_DOCENTE,
      fecha: fechaInput.value,
      estado: mapaEstados[estadoSelect.value] || estadoSelect.value
    };

    console.log('Insertando asistencia:', nuevoRegistro);

    const { error } = await supabase
      .from('asistencia')
      .insert([nuevoRegistro]);

    if (error) {
      console.error('Error al registrar la asistencia:', error);
      alert('Ocurrió un error al registrar la asistencia. Revisá la consola.');
      return;
    }

    alert('Asistencia registrada correctamente.');
    form.reset();
  });
}

// --------- Inicialización del panel ---------
async function inicializarDocentePanel() {

  await cargarPerfilDocente();

  materiasDelDocente = await cargarMaterias();
  alumnosDelDocente = await cargarAlumnos(materiasDelDocente);

  await cargarResumen(materiasDelDocente, alumnosDelDocente);

  poblarSelectAlumnos('#alumno-nota', alumnosDelDocente);
  poblarSelectMaterias('#materia-nota', materiasDelDocente);
  poblarSelectAlumnos('#alumno-asistencia', alumnosDelDocente);

  configurarCerrarSesion();
  registrarNota();
  registrarAsistencia();
}

document.addEventListener('DOMContentLoaded', inicializarDocentePanel);