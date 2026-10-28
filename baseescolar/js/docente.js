import { supabase } from './supabase.js';

// DNI del docente que inició sesión. Por ahora, si el login todavía no
// guarda el DNI, se usa Pepito Sanchez como docente de prueba.
function obtenerDniSesion() {
  try {
    return Number(sessionStorage.getItem('dni')) || null;
  } catch (error) {
    return null;
  }
}

const DNI_DOCENTE = obtenerDniSesion() || 87654321;

const NOTAS_ESPERADAS_POR_MES = 3;
const NOTA_APROBACION = 6;

// Datos en memoria del docente (se recargan después de cada alta).
let dictados = [];       // curso + materia que dicta este docente
let alumnos = [];        // alumnos de los cursos del docente
let notasDeAlumnos = []; // notas de esos alumnos
let promedios = new Map(); // dni -> promedio

const formularios = [
  { curso: '#curso-nota', alumno: '#alumno-nota', materia: '#materia-nota' },
  { curso: '#curso-asistencia', alumno: '#alumno-asistencia', materia: null }
];

// --------- Utilidades ---------
// Fecha local en formato YYYY-MM-DD (toISOString usa UTC y después de las
// 21:00 en Argentina devolvería el día siguiente).
function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function crearFilaTabla(celdas) {
  const fila = document.createElement('tr');

  celdas.forEach((valor) => {
    const celda = document.createElement('td');
    celda.textContent = valor ?? '-';
    fila.appendChild(celda);
  });

  return fila;
}

function setTexto(selector, valor) {
  const elemento = document.querySelector(selector);

  if (elemento) {
    elemento.textContent = valor;
  }
}

function mapaDeCursos() {
  const cursos = new Map();
  dictados.forEach((d) => cursos.set(d.id_curso, d.curso?.nombre ?? '-'));
  return cursos;
}

// --------- Perfil ---------
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

  setTexto('#perfil-dni', docente.dni);
  setTexto('#perfil-nombre', docente.nombre);
  setTexto('#perfil-apellido', docente.apellido);
  setTexto('#teacher-name', `Docente: ${docente.nombre} ${docente.apellido}`);
  setTexto('#welcome-title', `Bienvenido/a, ${docente.nombre} ${docente.apellido}`);
}

// --------- Carga de datos ---------
async function cargarDatos() {
  dictados = [];
  alumnos = [];
  notasDeAlumnos = [];
  promedios = new Map();

  const { data: dictadosData, error: errorDictados } = await supabase
    .from('dictado')
    .select('id, id_curso, id_materia, curso(id, nombre), materia(id, nombre)')
    .eq('dni_docente', DNI_DOCENTE);

  if (errorDictados) {
    console.error('Error al buscar las materias del docente:', errorDictados);
    return;
  }

  dictados = (dictadosData || []).sort((a, b) => {
    const porCurso = (a.curso?.nombre ?? '').localeCompare(b.curso?.nombre ?? '');
    return porCurso !== 0
      ? porCurso
      : (a.materia?.nombre ?? '').localeCompare(b.materia?.nombre ?? '');
  });

  console.log('Materias del docente:', dictados);

  const idsCursos = [...new Set(dictados.map((d) => d.id_curso))];

  if (idsCursos.length === 0) {
    return;
  }

  const { data: alumnosData, error: errorAlumnos } = await supabase
    .from('alumno')
    .select('dni, nombre, apellido, id_curso')
    .in('id_curso', idsCursos)
    .order('apellido', { ascending: true });

  if (errorAlumnos) {
    console.error('Error al buscar los alumnos del docente:', errorAlumnos);
    return;
  }

  alumnos = alumnosData || [];

  if (alumnos.length === 0) {
    return;
  }

  const { data: notasData, error: errorNotas } = await supabase
    .from('notas')
    .select('dni_alumno, dni_docente, id_materia, nota, fecha')
    .in('dni_alumno', alumnos.map((a) => a.dni));

  if (errorNotas) {
    console.error('Error al buscar las notas:', errorNotas);
    return;
  }

  notasDeAlumnos = notasData || [];

  // Promedio general por alumno (todas las materias), igual que en el panel del alumno.
  const acumulado = new Map();

  notasDeAlumnos.forEach((n) => {
    const actual = acumulado.get(n.dni_alumno) || { suma: 0, cantidad: 0 };
    actual.suma += Number(n.nota);
    actual.cantidad += 1;
    acumulado.set(n.dni_alumno, actual);
  });

  acumulado.forEach((valor, dni) => {
    promedios.set(dni, valor.suma / valor.cantidad);
  });
}

// --------- Mis Materias ---------
function renderMaterias() {
  const tbody = document.querySelector('#mis-materias-table tbody');

  if (!tbody) return;

  tbody.innerHTML = '';

  if (dictados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3">No tenés materias asignadas.</td></tr>';
    return;
  }

  dictados.forEach((d) => {
    const cantidad = alumnos.filter((a) => a.id_curso === d.id_curso).length;
    tbody.appendChild(
      crearFilaTabla([d.materia?.nombre, d.curso?.nombre, cantidad])
    );
  });
}

// --------- Tarjetas de resumen ---------
async function renderResumen() {
  setTexto('#cantidadMateriasDocente', dictados.length);
  setTexto('#cantidadAlumnosDocente', alumnos.length);

  // Asistencias que este docente registró hoy.
  const { count, error } = await supabase
    .from('asistencia')
    .select('*', { count: 'exact', head: true })
    .eq('dni_docente', DNI_DOCENTE)
    .eq('fecha', fechaLocalISO());

  if (error) {
    console.error('Error al contar asistencias de hoy:', error);
    setTexto('#asistenciasHoyDocente', '-');
  } else {
    setTexto('#asistenciasHoyDocente', count ?? 0);
  }

  // Notas pendientes: se esperan 3 por alumno, por materia, por mes.
  const hoy = new Date();
  const inicioMes = fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const finMes = fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0));

  let pendientes = 0;

  dictados.forEach((d) => {
    alumnos
      .filter((a) => a.id_curso === d.id_curso)
      .forEach((a) => {
        const cargadas = notasDeAlumnos.filter(
          (n) =>
            n.dni_alumno === a.dni &&
            n.id_materia === d.id_materia &&
            n.dni_docente === DNI_DOCENTE &&
            n.fecha >= inicioMes &&
            n.fecha <= finMes
        ).length;

        pendientes += Math.max(0, NOTAS_ESPERADAS_POR_MES - cargadas);
      });
  });

  setTexto('#notasPendientesDocente', pendientes);
}

// --------- Buscador de alumnos ---------
function renderBusqueda() {
  const input = document.querySelector('#buscar-alumno');
  const tbody = document.querySelector('#lista-alumnos-table tbody');

  if (!input || !tbody) return;

  const termino = normalizar(input.value);

  tbody.innerHTML = '';

  if (!termino) {
    tbody.innerHTML =
      '<tr><td colspan="5">Escribí un DNI, nombre o apellido para buscar.</td></tr>';
    return;
  }

  const cursos = mapaDeCursos();

  const resultados = alumnos.filter(
    (a) =>
      String(a.dni).includes(termino) ||
      normalizar(`${a.nombre} ${a.apellido}`).includes(termino) ||
      normalizar(`${a.apellido} ${a.nombre}`).includes(termino)
  );

  if (resultados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No se encontraron alumnos.</td></tr>';
    return;
  }

  resultados.slice(0, 20).forEach((a) => {
    const promedio = promedios.get(a.dni);
    const estado =
      promedio === undefined
        ? '-'
        : promedio >= NOTA_APROBACION
          ? 'Regular'
          : 'Libre';

    tbody.appendChild(
      crearFilaTabla([a.dni, a.nombre, a.apellido, cursos.get(a.id_curso), estado])
    );
  });
}

// --------- Selects de los formularios ---------
function poblarSelect(select, opciones, textoVacio) {
  select.innerHTML = '';

  const base = document.createElement('option');
  base.value = '';
  base.textContent = textoVacio;
  select.appendChild(base);

  opciones.forEach(({ valor, texto }) => {
    const option = document.createElement('option');
    option.value = valor;
    option.textContent = texto;
    select.appendChild(option);
  });
}

function actualizarDependientes(config) {
  const selCurso = document.querySelector(config.curso);
  const selAlumno = document.querySelector(config.alumno);
  const selMateria = config.materia ? document.querySelector(config.materia) : null;

  if (!selCurso || !selAlumno) return;

  const idCurso = Number(selCurso.value);
  const textoVacio = idCurso ? null : 'Primero elija un curso';

  const alumnosCurso = idCurso ? alumnos.filter((a) => a.id_curso === idCurso) : [];

  poblarSelect(
    selAlumno,
    alumnosCurso.map((a) => ({
      valor: a.dni,
      texto: `${a.apellido}, ${a.nombre} (${a.dni})`
    })),
    textoVacio || 'Seleccione un alumno'
  );

  if (selMateria) {
    const materiasCurso = idCurso ? dictados.filter((d) => d.id_curso === idCurso) : [];

    poblarSelect(
      selMateria,
      materiasCurso.map((d) => ({ valor: d.id_materia, texto: d.materia?.nombre })),
      textoVacio || 'Seleccione una materia'
    );
  }
}

function refrescarFormulario(config) {
  const selCurso = document.querySelector(config.curso);

  if (!selCurso) return;

  const cursos = mapaDeCursos();

  poblarSelect(
    selCurso,
    [...cursos].map(([id, nombre]) => ({ valor: id, texto: nombre })),
    'Seleccione un curso'
  );

  actualizarDependientes(config);
}

// --------- Recarga completa ---------
async function recargarTodo() {
  await cargarDatos();

  renderMaterias();
  await renderResumen();
  renderBusqueda();

  formularios.forEach(refrescarFormulario);

  const fecha = document.querySelector('#fecha-asistencia');
  if (fecha) fecha.value = fechaLocalISO();
}

// --------- Cargar nota (INSERT en Supabase) ---------
function configurarFormularioNota() {
  const form = document.querySelector('#cargar-nota-form');

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const curso = document.querySelector('#curso-nota').value;
    const alumno = document.querySelector('#alumno-nota').value;
    const materia = document.querySelector('#materia-nota').value;
    const nota = document.querySelector('#nota').value;

    if (!curso || !alumno || !materia || nota === '') {
      alert('Debe completar curso, alumno, materia y nota.');
      return;
    }

    const valorNota = Number(nota);

    if (Number.isNaN(valorNota) || valorNota < 0 || valorNota > 10) {
      alert('La nota debe estar entre 0 y 10.');
      return;
    }

    const nuevaNota = {
      dni_alumno: Number(alumno),
      dni_docente: DNI_DOCENTE,
      id_materia: Number(materia),
      nota: valorNota,
      fecha: fechaLocalISO()
    };

    const { error } = await supabase.from('notas').insert([nuevaNota]);

    if (error) {
      console.error('Error al guardar la nota:', error);
      alert('Ocurrió un error al guardar la nota. Revisá la consola.');
      return;
    }

    alert('Nota guardada correctamente.');
    form.reset();
    await recargarTodo();
  });
}

// --------- Registrar asistencia (INSERT en Supabase) ---------
function configurarFormularioAsistencia() {
  const form = document.querySelector('#registrar-asistencia-form');

  if (!form) return;

  const estados = { presente: 'Presente', ausente: 'Ausente', tarde: 'Tarde' };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const curso = document.querySelector('#curso-asistencia').value;
    const alumno = document.querySelector('#alumno-asistencia').value;
    const fecha = document.querySelector('#fecha-asistencia').value;
    const estado = document.querySelector('#estado-asistencia').value;

    if (!curso || !alumno || !fecha || !estado) {
      alert('Debe completar curso, alumno, fecha y estado.');
      return;
    }

    const nuevoRegistro = {
      dni_alumno: Number(alumno),
      id_curso: Number(curso),
      dni_docente: DNI_DOCENTE,
      fecha,
      estado: estados[estado] || estado
    };

    const { error } = await supabase.from('asistencia').insert([nuevoRegistro]);

    if (error) {
      console.error('Error al registrar la asistencia:', error);
      alert('Ocurrió un error al registrar la asistencia. Revisá la consola.');
      return;
    }

    alert('Asistencia registrada correctamente.');
    form.reset();
    await recargarTodo();
  });
}

// --------- Eventos generales ---------
function configurarEventos() {
  const buscador = document.querySelector('#buscar-alumno');
  const formBuscar = document.querySelector('#buscar-alumno-form');

  if (buscador) buscador.addEventListener('input', renderBusqueda);

  if (formBuscar) {
    formBuscar.addEventListener('submit', (event) => event.preventDefault());
  }

  formularios.forEach((config) => {
    const selCurso = document.querySelector(config.curso);

    if (selCurso) {
      selCurso.addEventListener('change', () => actualizarDependientes(config));
    }
  });

  const logout = document.querySelector('#logout-button');

  if (logout) {
    logout.addEventListener('click', (event) => {
      event.preventDefault();

      try {
        sessionStorage.clear();
      } catch (error) {
        // Sin acceso a sessionStorage: se ignora.
      }

      window.location.href = 'index.html';
    });
  }
}

// --------- Inicio ---------
async function inicializarDocentePanel() {
  configurarEventos();
  configurarFormularioNota();
  configurarFormularioAsistencia();

  await cargarPerfilDocente();
  await recargarTodo();
}

document.addEventListener('DOMContentLoaded', inicializarDocentePanel);