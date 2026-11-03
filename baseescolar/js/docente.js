import { supabase } from './supabase.js';
import {
  NOTAS_POR_BIMESTRE,
  fechaLocalISO,
  bimestreActual,
  etiquetaBimestre,
  promedio as promediar,
  estadoDePromedio,
  notasDelAnio,
  promedioGeneral
} from './bimestres.js';

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

const ANIO = new Date().getFullYear();
const BIMESTRE_ACTUAL = bimestreActual();

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
    .select('id, dni_alumno, dni_docente, id_materia, nota, fecha, bimestre')
    .in('dni_alumno', alumnos.map((a) => a.dni));

  if (errorNotas) {
    console.error('Error al buscar las notas:', errorNotas);
    return;
  }

  notasDeAlumnos = notasData || [];

  // Promedio general por alumno: promedio de sus promedios por materia y bimestre (año actual).
  const porAlumno = new Map();

  notasDelAnio(notasDeAlumnos, ANIO).forEach((n) => {
    const lista = porAlumno.get(n.dni_alumno) || [];
    lista.push(n);
    porAlumno.set(n.dni_alumno, lista);
  });

  porAlumno.forEach((lista, dni) => {
    promedios.set(dni, promedioGeneral(lista));
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

  // Notas pendientes: se esperan 3 por alumno y materia en el bimestre actual.
  let pendientes = 0;

  dictados.forEach((d) => {
    alumnos
      .filter((a) => a.id_curso === d.id_curso)
      .forEach((a) => {
        const cargadas = notasDeAlumnos.filter(
          (n) =>
            n.dni_alumno === a.dni &&
            n.id_materia === d.id_materia &&
            n.bimestre === BIMESTRE_ACTUAL &&
            String(n.fecha).startsWith(String(ANIO))
        ).length;

        pendientes += Math.max(0, NOTAS_POR_BIMESTRE - cargadas);
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
      promedio === undefined || promedio === null
        ? '-'
        : estadoDePromedio(promedio) === 'Aprobado'
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

  // Se recuerda lo elegido en "Cargar nota" para cargar la siguiente más rápido.
  const previos = ['#curso-nota', '#alumno-nota', '#materia-nota'].map(
    (sel) => document.querySelector(sel)?.value ?? ''
  );

  formularios.forEach(refrescarFormulario);

  const [prevCurso, prevAlumno, prevMateria] = previos;
  const selCursoNota = document.querySelector('#curso-nota');

  if (prevCurso && selCursoNota && [...selCursoNota.options].some((o) => o.value === prevCurso)) {
    selCursoNota.value = prevCurso;
    actualizarDependientes(formularios[0]);
    document.querySelector('#alumno-nota').value = prevAlumno;
    document.querySelector('#materia-nota').value = prevMateria;
  }

  actualizarInfoNota();
  refrescarFiltrosNotas();
  renderNotasCargadas();

  const fecha = document.querySelector('#fecha-asistencia');
  if (fecha) fecha.value = fechaLocalISO();
}

// --------- Bimestres (selects) ---------
function poblarBimestres(selector) {
  const select = document.querySelector(selector);

  if (!select) return;

  select.innerHTML = '';

  for (let numero = 1; numero <= 4; numero += 1) {
    const option = document.createElement('option');
    option.value = numero;
    option.textContent =
      etiquetaBimestre(numero, ANIO) + (numero === BIMESTRE_ACTUAL ? ' - actual' : '');
    select.appendChild(option);
  }

  select.value = BIMESTRE_ACTUAL;
}

function notasDe(dniAlumno, idMateria, bimestre) {
  return notasDeAlumnos
    .filter(
      (n) =>
        n.dni_alumno === dniAlumno &&
        n.id_materia === idMateria &&
        n.bimestre === bimestre &&
        String(n.fecha).startsWith(String(ANIO))
    )
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || a.id - b.id);
}

// --------- Cargar nota (INSERT en Supabase) ---------
function actualizarInfoNota() {
  const info = document.querySelector('#info-notas-cargadas');

  if (!info) return;

  const alumno = Number(document.querySelector('#alumno-nota')?.value);
  const materia = Number(document.querySelector('#materia-nota')?.value);
  const bimestre = Number(document.querySelector('#bimestre-nota')?.value);

  if (!alumno || !materia || !bimestre) {
    info.textContent = 'Elegí alumno, materia y bimestre para ver las notas ya cargadas.';
    return;
  }

  const cargadas = notasDe(alumno, materia, bimestre);
  const restantes = NOTAS_POR_BIMESTRE - cargadas.length;

  if (cargadas.length === 0) {
    info.textContent = `Todavía no tiene notas en este bimestre (se pueden cargar ${NOTAS_POR_BIMESTRE}).`;
  } else if (restantes <= 0) {
    info.textContent = `Notas cargadas: ${cargadas.map((n) => n.nota).join(', ')}. Ya tiene las ${NOTAS_POR_BIMESTRE} notas del bimestre.`;
  } else {
    info.textContent = `Notas cargadas: ${cargadas.map((n) => n.nota).join(', ')}. Faltan ${restantes}.`;
  }
}

function configurarFormularioNota() {
  const form = document.querySelector('#cargar-nota-form');

  if (!form) return;

  poblarBimestres('#bimestre-nota');

  ['#alumno-nota', '#materia-nota', '#bimestre-nota'].forEach((selector) => {
    const campo = document.querySelector(selector);
    if (campo) campo.addEventListener('change', actualizarInfoNota);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const curso = document.querySelector('#curso-nota').value;
    const alumno = document.querySelector('#alumno-nota').value;
    const materia = document.querySelector('#materia-nota').value;
    const bimestre = document.querySelector('#bimestre-nota').value;
    const nota = document.querySelector('#nota').value;

    if (!curso || !alumno || !materia || !bimestre || nota === '') {
      alert('Debe completar curso, alumno, materia, bimestre y nota.');
      return;
    }

    const valorNota = Number(nota);

    if (Number.isNaN(valorNota) || valorNota < 0 || valorNota > 10) {
      alert('La nota debe estar entre 0 y 10.');
      return;
    }

    // Se consulta la base (no la memoria) para no pasarse de 3 notas.
    const { count, error: errorConteo } = await supabase
      .from('notas')
      .select('*', { count: 'exact', head: true })
      .eq('dni_alumno', Number(alumno))
      .eq('id_materia', Number(materia))
      .eq('bimestre', Number(bimestre))
      .gte('fecha', `${ANIO}-01-01`)
      .lte('fecha', `${ANIO}-12-31`);

    if (errorConteo) {
      console.error('Error al contar las notas del bimestre:', errorConteo);
      alert('No se pudo verificar las notas del bimestre. Revisá la consola.');
      return;
    }

    if ((count ?? 0) >= NOTAS_POR_BIMESTRE) {
      alert(`Este alumno ya tiene las ${NOTAS_POR_BIMESTRE} notas de este bimestre en esa materia.`);
      return;
    }

    const nuevaNota = {
      dni_alumno: Number(alumno),
      dni_docente: DNI_DOCENTE,
      id_materia: Number(materia),
      nota: valorNota,
      bimestre: Number(bimestre),
      fecha: fechaLocalISO()
    };

    const { error } = await supabase.from('notas').insert([nuevaNota]);

    if (error) {
      console.error('Error al guardar la nota:', error);
      alert(
        String(error.message || '').includes('ya tiene 3 notas')
          ? 'Este alumno ya tiene las 3 notas de este bimestre en esa materia.'
          : 'Ocurrió un error al guardar la nota. Revisá la consola.'
      );
      return;
    }

    alert('Nota guardada correctamente.');

    // Se mantienen curso, materia y bimestre para cargar la siguiente nota más rápido.
    document.querySelector('#nota').value = '';
    await recargarTodo();
  });
}

// --------- Notas cargadas (ver, promediar, editar, eliminar) ---------
function actualizarFiltrosNotas() {
  const selCurso = document.querySelector('#filtro-curso');
  const selMateria = document.querySelector('#filtro-materia');

  if (!selCurso || !selMateria) return;

  const idCurso = Number(selCurso.value);
  const materiasCurso = idCurso ? dictados.filter((d) => d.id_curso === idCurso) : [];

  poblarSelect(
    selMateria,
    materiasCurso.map((d) => ({ valor: d.id_materia, texto: d.materia?.nombre })),
    idCurso ? 'Seleccione una materia' : 'Primero elija un curso'
  );

  if (materiasCurso.length === 1) {
    selMateria.value = materiasCurso[0].id_materia;
  }
}

function refrescarFiltrosNotas() {
  const selCurso = document.querySelector('#filtro-curso');

  if (!selCurso) return;

  const anterior = selCurso.value;

  poblarSelect(
    selCurso,
    [...mapaDeCursos()].map(([id, nombre]) => ({ valor: id, texto: nombre })),
    'Seleccione un curso'
  );

  const materiaAnterior = document.querySelector('#filtro-materia')?.value;

  if (anterior && [...selCurso.options].some((o) => o.value === anterior)) {
    selCurso.value = anterior;
  }

  actualizarFiltrosNotas();

  const selMateria = document.querySelector('#filtro-materia');

  if (materiaAnterior && selMateria && [...selMateria.options].some((o) => o.value === materiaAnterior)) {
    selMateria.value = materiaAnterior;
  }
}

function renderNotasCargadas() {
  const tbodyProm = document.querySelector('#promedios-table tbody');
  const tbodyDetalle = document.querySelector('#detalle-notas-table tbody');
  const resumen = document.querySelector('#notas-resumen');

  if (!tbodyProm || !tbodyDetalle) return;

  tbodyProm.innerHTML = '';
  tbodyDetalle.innerHTML = '';

  const idCurso = Number(document.querySelector('#filtro-curso')?.value);
  const idMateria = Number(document.querySelector('#filtro-materia')?.value);
  const bimestre = Number(document.querySelector('#filtro-bimestre')?.value);

  if (!idCurso || !idMateria || !bimestre) {
    if (resumen) resumen.textContent = 'Elegí curso, materia y bimestre para ver las notas.';
    tbodyProm.innerHTML = '<tr><td colspan="6">Sin datos para mostrar.</td></tr>';
    tbodyDetalle.innerHTML = '<tr><td colspan="4">Sin datos para mostrar.</td></tr>';
    return;
  }

  const alumnosCurso = alumnos.filter((a) => a.id_curso === idCurso);

  if (resumen) {
    resumen.textContent = `${etiquetaBimestre(bimestre, ANIO)}. Máximo ${NOTAS_POR_BIMESTRE} notas por alumno. 6 o más: Aprobado.`;
  }

  if (alumnosCurso.length === 0) {
    tbodyProm.innerHTML = '<tr><td colspan="6">El curso no tiene alumnos.</td></tr>';
    tbodyDetalle.innerHTML = '<tr><td colspan="4">Sin notas.</td></tr>';
    return;
  }

  let hayDetalle = false;

  alumnosCurso.forEach((a) => {
    const notas = notasDe(a.dni, idMateria, bimestre);
    const valor = promediar(notas.map((n) => n.nota));
    const celdas = [`${a.apellido}, ${a.nombre}`];

    for (let i = 0; i < NOTAS_POR_BIMESTRE; i += 1) {
      celdas.push(notas[i] ? notas[i].nota : '-');
    }

    celdas.push(valor === null ? '-' : valor.toFixed(2));
    celdas.push(estadoDePromedio(valor));
    tbodyProm.appendChild(crearFilaTabla(celdas));

    notas.forEach((n) => {
      hayDetalle = true;

      const fila = crearFilaTabla([`${a.apellido}, ${a.nombre}`, n.nota, n.fecha]);
      const celdaAcciones = document.createElement('td');

      const editar = document.createElement('button');
      editar.type = 'button';
      editar.textContent = 'Editar';
      editar.addEventListener('click', () => editarNota(n));

      const eliminar = document.createElement('button');
      eliminar.type = 'button';
      eliminar.textContent = 'Eliminar';
      eliminar.style.marginLeft = '6px';
      eliminar.addEventListener('click', () => eliminarNota(n, a));

      celdaAcciones.append(editar, eliminar);
      fila.appendChild(celdaAcciones);
      tbodyDetalle.appendChild(fila);
    });
  });

  if (!hayDetalle) {
    tbodyDetalle.innerHTML = '<tr><td colspan="4">Todavía no hay notas cargadas en este bimestre.</td></tr>';
  }
}

async function editarNota(nota) {
  const respuesta = prompt('Nueva nota (0 a 10):', nota.nota);

  if (respuesta === null) return;

  const valor = Number(String(respuesta).replace(',', '.'));

  if (respuesta.trim() === '' || Number.isNaN(valor) || valor < 0 || valor > 10) {
    alert('La nota debe estar entre 0 y 10.');
    return;
  }

  const { error } = await supabase.from('notas').update({ nota: valor }).eq('id', nota.id);

  if (error) {
    console.error('Error al editar la nota:', error);
    alert('No se pudo editar la nota. Revisá la consola.');
    return;
  }

  await recargarTodo();
}

async function eliminarNota(nota, alumno) {
  if (!confirm(`¿Eliminar la nota ${nota.nota} de ${alumno.apellido}, ${alumno.nombre}?`)) return;

  const { error } = await supabase.from('notas').delete().eq('id', nota.id);

  if (error) {
    console.error('Error al eliminar la nota:', error);
    alert('No se pudo eliminar la nota. Revisá la consola.');
    return;
  }

  await recargarTodo();
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

  const filtroCurso = document.querySelector('#filtro-curso');

  if (filtroCurso) {
    filtroCurso.addEventListener('change', () => {
      actualizarFiltrosNotas();
      renderNotasCargadas();
    });
  }

  ['#filtro-materia', '#filtro-bimestre'].forEach((selector) => {
    const campo = document.querySelector(selector);
    if (campo) campo.addEventListener('change', renderNotasCargadas);
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
  poblarBimestres('#filtro-bimestre');
  configurarEventos();
  configurarFormularioNota();
  configurarFormularioAsistencia();

  await cargarPerfilDocente();
  await recargarTodo();
}

document.addEventListener('DOMContentLoaded', inicializarDocentePanel);