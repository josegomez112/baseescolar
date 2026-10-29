import { supabase } from './supabase.js';

// DNI del preceptor que inició sesión. Si el login no guardó ninguno,
// se usa el preceptor de prueba.
function obtenerDniSesion() {
  try {
    return Number(sessionStorage.getItem('dni')) || null;
  } catch (error) {
    return null;
  }
}

const DNI_PRECEPTOR = obtenerDniSesion() || 44556677;

// Datos en memoria del preceptor: solo ve los cursos que tiene asignados.
let cursos = [];   // { id, nombre }
let alumnos = [];  // { dni, nombre, apellido, id_curso }
let docentes = []; // { dni, nombre, apellido, detalle: ['Materia (Curso)', ...] }

let tokenControl = 0;

// =====================================================
// UTILIDADES
// =====================================================

// Fecha local YYYY-MM-DD (toISOString usa UTC y después de las 21:00
// en Argentina devolvería el día siguiente).
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
    celda.textContent = valor === null || valor === undefined || valor === '' ? '-' : valor;
    fila.appendChild(celda);
  });

  return fila;
}

function filaMensaje(tbody, columnas, mensaje) {
  tbody.innerHTML = '';

  const fila = document.createElement('tr');
  const celda = document.createElement('td');

  celda.colSpan = columnas;
  celda.textContent = mensaje;
  fila.appendChild(celda);
  tbody.appendChild(fila);
}

function setTexto(selector, valor) {
  const elemento = document.querySelector(selector);

  if (elemento) {
    elemento.textContent = valor;
  }
}

function mostrarMensaje(mensaje, tipo = 'success') {
  const existente = document.querySelector('#message-box');

  if (existente) {
    existente.remove();
  }

  const caja = document.createElement('p');

  caja.id = 'message-box';
  caja.textContent = mensaje;
  caja.style.position = 'sticky';
  caja.style.top = '8px';
  caja.style.zIndex = '20';
  caja.style.margin = '0 0 12px';
  caja.style.padding = '10px 12px';
  caja.style.borderRadius = '8px';
  caja.style.fontWeight = '600';
  caja.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';

  if (tipo === 'error') {
    caja.style.background = '#fdecec';
    caja.style.color = '#b42318';
  } else {
    caja.style.background = '#eafaf3';
    caja.style.color = '#1f7a52';
  }

  const main = document.querySelector('#main-content');

  if (main) {
    main.insertBefore(caja, main.firstChild);
  }

  setTimeout(() => caja.remove(), 10000);
}

function poblarSelect(select, opciones, textoVacio) {
  if (!select) return;

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

function nombreCurso(idCurso) {
  return cursos.find((c) => c.id === idCurso)?.nombre ?? '-';
}

// Trae las asistencias de unos cursos en una fecha y deja el último
// estado registrado de cada alumno (dni -> estado).
async function estadosPorAlumno(idsCursos, fecha) {
  const { data, error } = await supabase
    .from('asistencia')
    .select('id, dni_alumno, estado')
    .in('id_curso', idsCursos)
    .eq('fecha', fecha)
    .order('id', { ascending: true });

  if (error) {
    console.error('Error al buscar asistencias:', error);
    return null;
  }

  const estados = new Map();

  (data || []).forEach((registro) => estados.set(registro.dni_alumno, registro.estado));

  return estados;
}

// =====================================================
// CARGA DE DATOS
// =====================================================

async function cargarPerfil() {
  const { data: preceptor, error } = await supabase
    .from('preceptor')
    .select('*')
    .eq('dni', DNI_PRECEPTOR)
    .single();

  if (error) {
    console.error('Error al buscar preceptor:', error);
    return;
  }

  setTexto('#perfil-dni', preceptor.dni);
  setTexto('#perfil-nombre', preceptor.nombre);
  setTexto('#perfil-apellido', preceptor.apellido);
  setTexto('#preceptor-name', `Preceptor: ${preceptor.nombre} ${preceptor.apellido}`);
  setTexto('#welcome-title', `Bienvenido/a, ${preceptor.nombre} ${preceptor.apellido}`);
}

async function cargarDatos() {
  cursos = [];
  alumnos = [];
  docentes = [];

  const { data: relaciones, error: errorCursos } = await supabase
    .from('preceptor_curso')
    .select('id_curso, curso(id, nombre)')
    .eq('dni_preceptor', DNI_PRECEPTOR);

  if (errorCursos) {
    console.error('Error al buscar los cursos del preceptor:', errorCursos);
    mostrarMensaje('No se pudieron cargar tus cursos.', 'error');
    return;
  }

  cursos = (relaciones || [])
    .map((r) => ({ id: r.id_curso, nombre: r.curso?.nombre ?? '-' }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  setTexto('#perfil-cursos', cursos.length > 0 ? cursos.map((c) => c.nombre).join(', ') : 'Sin cursos asignados');

  if (cursos.length === 0) {
    return;
  }

  const idsCursos = cursos.map((c) => c.id);

  const [resAlumnos, resDictados] = await Promise.all([
    supabase
      .from('alumno')
      .select('dni, nombre, apellido, id_curso')
      .in('id_curso', idsCursos)
      .order('apellido', { ascending: true }),
    supabase
      .from('dictado')
      .select('id_curso, materia(nombre), docente(dni, nombre, apellido)')
      .in('id_curso', idsCursos)
  ]);

  if (resAlumnos.error || resDictados.error) {
    console.error('Error cargando alumnos o docentes:', resAlumnos.error, resDictados.error);
    mostrarMensaje('No se pudieron cargar los alumnos o docentes.', 'error');
    return;
  }

  alumnos = resAlumnos.data || [];

  // Docentes que dictan en alguno de los cursos del preceptor.
  const porDni = new Map();

  (resDictados.data || []).forEach((d) => {
    if (!d.docente) return;

    const actual = porDni.get(d.docente.dni) || { ...d.docente, detalle: [] };
    actual.detalle.push(`${d.materia?.nombre} (${nombreCurso(d.id_curso)})`);
    porDni.set(d.docente.dni, actual);
  });

  docentes = [...porDni.values()].sort((a, b) => a.apellido.localeCompare(b.apellido));
}

// =====================================================
// RESUMEN
// =====================================================

async function renderResumen() {
  setTexto('#totalAlumnosPreceptor', alumnos.length);

  // "Justificaciones" todavía no existe en la base de datos.
  setTexto('#justificacionesPreceptor', '-');

  if (cursos.length === 0) {
    setTexto('#presentesHoyPreceptor', 0);
    setTexto('#ausentesHoyPreceptor', 0);
    return;
  }

  const estados = await estadosPorAlumno(cursos.map((c) => c.id), fechaLocalISO());

  if (!estados) {
    setTexto('#presentesHoyPreceptor', '-');
    setTexto('#ausentesHoyPreceptor', '-');
    return;
  }

  const valores = [...estados.values()];

  setTexto('#presentesHoyPreceptor', valores.filter((e) => e === 'Presente').length);
  setTexto('#ausentesHoyPreceptor', valores.filter((e) => e === 'Ausente').length);
}

// =====================================================
// BUSCADORES
// =====================================================

function renderBuscadorAlumnos() {
  const input = document.querySelector('#buscador-alumno');
  const tbody = document.querySelector('#alumnos-resultados-table tbody');

  if (!input || !tbody) return;

  const termino = normalizar(input.value);

  if (!termino) {
    filaMensaje(tbody, 4, 'Escribí un DNI, nombre o apellido para buscar.');
    return;
  }

  const resultados = alumnos.filter(
    (a) =>
      String(a.dni).includes(termino) ||
      normalizar(`${a.nombre} ${a.apellido}`).includes(termino) ||
      normalizar(`${a.apellido} ${a.nombre}`).includes(termino)
  );

  if (resultados.length === 0) {
    filaMensaje(tbody, 4, 'No se encontraron alumnos en tus cursos.');
    return;
  }

  tbody.innerHTML = '';

  resultados.slice(0, 20).forEach((a) => {
    tbody.appendChild(crearFilaTabla([a.dni, a.nombre, a.apellido, nombreCurso(a.id_curso)]));
  });
}

function renderBuscadorDocentes() {
  const input = document.querySelector('#buscador-docente');
  const tbody = document.querySelector('#docentes-resultados-table tbody');

  if (!input || !tbody) return;

  const termino = normalizar(input.value);

  if (!termino) {
    filaMensaje(tbody, 4, 'Escribí un DNI, nombre o apellido para buscar.');
    return;
  }

  const resultados = docentes.filter(
    (d) =>
      String(d.dni).includes(termino) ||
      normalizar(`${d.nombre} ${d.apellido}`).includes(termino) ||
      normalizar(`${d.apellido} ${d.nombre}`).includes(termino)
  );

  if (resultados.length === 0) {
    filaMensaje(tbody, 4, 'No se encontraron docentes en tus cursos.');
    return;
  }

  tbody.innerHTML = '';

  resultados.slice(0, 20).forEach((d) => {
    tbody.appendChild(crearFilaTabla([d.dni, d.nombre, d.apellido, d.detalle.join(', ')]));
  });
}

// =====================================================
// CONTROL DE ASISTENCIA (por curso y fecha)
// =====================================================

async function renderControl() {
  const idCurso = Number(document.querySelector('#control-curso').value);
  const fecha = document.querySelector('#control-fecha').value;
  const tbody = document.querySelector('#control-asistencia-table tbody');

  if (!tbody) return;

  const token = ++tokenControl;

  if (!idCurso || !fecha) {
    tbody.innerHTML = '';
    setTexto('#control-resumen', 'Seleccioná un curso y una fecha para ver la asistencia.');
    return;
  }

  const estados = await estadosPorAlumno([idCurso], fecha);

  if (token !== tokenControl) return;

  if (!estados) {
    setTexto('#control-resumen', 'No se pudo cargar la asistencia.');
    return;
  }

  const alumnosCurso = alumnos.filter((a) => a.id_curso === idCurso);

  tbody.innerHTML = '';

  if (alumnosCurso.length === 0) {
    filaMensaje(tbody, 6, 'Este curso todavía no tiene alumnos.');
    setTexto('#control-resumen', `${nombreCurso(idCurso)}: sin alumnos.`);
    return;
  }

  const conteo = { Presente: 0, Ausente: 0, Tarde: 0, 'Sin registrar': 0 };

  alumnosCurso.forEach((a) => {
    const estado = estados.get(a.dni) || 'Sin registrar';

    conteo[estado] = (conteo[estado] || 0) + 1;

    tbody.appendChild(
      crearFilaTabla([a.dni, a.nombre, a.apellido, nombreCurso(idCurso), estado, fecha])
    );
  });

  setTexto(
    '#control-resumen',
    `${nombreCurso(idCurso)} - ${fecha}: ${conteo.Presente} presente(s), ${conteo.Ausente} ausente(s), ` +
      `${conteo.Tarde} tarde(s), ${conteo['Sin registrar']} sin registrar.`
  );
}

// =====================================================
// FORMULARIO: REGISTRAR ASISTENCIA
// =====================================================

function actualizarAlumnosFormulario() {
  const idCurso = Number(document.querySelector('#curso-asistencia').value);
  const select = document.querySelector('#alumno-asistencia');

  const alumnosCurso = idCurso ? alumnos.filter((a) => a.id_curso === idCurso) : [];

  poblarSelect(
    select,
    alumnosCurso.map((a) => ({ valor: a.dni, texto: `${a.apellido}, ${a.nombre} (${a.dni})` })),
    idCurso ? 'Seleccione un alumno' : 'Primero elija un curso'
  );
}

function refrescarSelectsCursos() {
  const opciones = cursos.map((c) => ({ valor: c.id, texto: c.nombre }));

  const controlCurso = document.querySelector('#control-curso');
  const previo = controlCurso.value;

  poblarSelect(controlCurso, opciones, 'Seleccione un curso');

  if ([...controlCurso.options].some((o) => o.value === previo)) {
    controlCurso.value = previo;
  }

  poblarSelect(document.querySelector('#curso-asistencia'), opciones, 'Seleccione un curso');
  actualizarAlumnosFormulario();
}

function configurarFormularioAsistencia() {
  const form = document.querySelector('#registrar-asistencia-form');

  if (!form) return;

  const estados = { presente: 'Presente', ausente: 'Ausente', tarde: 'Tarde' };

  document.querySelector('#curso-asistencia').addEventListener('change', actualizarAlumnosFormulario);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const idCurso = document.querySelector('#curso-asistencia').value;
    const dniAlumno = document.querySelector('#alumno-asistencia').value;
    const fecha = document.querySelector('#fecha-asistencia').value;
    const estadoElegido = document.querySelector('#estado-asistencia').value;

    if (!idCurso || !dniAlumno || !fecha || !estadoElegido) {
      mostrarMensaje('Completá curso, alumno, fecha y estado.', 'error');
      return;
    }

    const estado = estados[estadoElegido] || estadoElegido;
    const alumno = alumnos.find((a) => a.dni === Number(dniAlumno));
    const nombreAlumno = alumno ? `${alumno.nombre} ${alumno.apellido}` : dniAlumno;

    // Si ese alumno ya tiene asistencia ese día, se corrige en vez de duplicarla.
    const { data: existentes, error: errorExistentes } = await supabase
      .from('asistencia')
      .select('id, estado')
      .eq('dni_alumno', Number(dniAlumno))
      .eq('fecha', fecha)
      .order('id', { ascending: true });

    if (errorExistentes) {
      console.error('Error al verificar la asistencia:', errorExistentes);
      mostrarMensaje('No se pudo verificar la asistencia del alumno.', 'error');
      return;
    }

    if (existentes && existentes.length > 0) {
      const ultimo = existentes[existentes.length - 1];

      const reemplazar = confirm(
        `${nombreAlumno} ya tiene asistencia el ${fecha} (${ultimo.estado}).\n¿Querés cambiarla por "${estado}"?`
      );

      if (!reemplazar) return;

      const { error } = await supabase
        .from('asistencia')
        .update({ estado, id_curso: Number(idCurso), dni_preceptor: DNI_PRECEPTOR })
        .eq('id', ultimo.id);

      if (error) {
        console.error('Error al actualizar la asistencia:', error);
        mostrarMensaje('No se pudo actualizar la asistencia.', 'error');
        return;
      }

      mostrarMensaje(`Asistencia de ${nombreAlumno} actualizada: ${estado} (${fecha}).`);
    } else {
      const { error } = await supabase.from('asistencia').insert([
        {
          fecha,
          estado,
          dni_alumno: Number(dniAlumno),
          id_curso: Number(idCurso),
          dni_preceptor: DNI_PRECEPTOR
        }
      ]);

      if (error) {
        console.error('Error al registrar la asistencia:', error);
        mostrarMensaje('No se pudo registrar la asistencia. Revisá la consola.', 'error');
        return;
      }

      mostrarMensaje(`Asistencia registrada: ${nombreAlumno} - ${estado} (${fecha}).`);
    }

    form.reset();
    document.querySelector('#fecha-asistencia').value = fechaLocalISO();
    actualizarAlumnosFormulario();

    await renderResumen();
    await renderControl();
  });
}

// =====================================================
// EVENTOS E INICIO
// =====================================================

function configurarEventos() {
  document.querySelector('#buscador-alumno').addEventListener('input', renderBuscadorAlumnos);
  document.querySelector('#buscador-docente').addEventListener('input', renderBuscadorDocentes);

  ['#buscar-alumno-form', '#buscar-docente-form', '#control-asistencia-form'].forEach((id) => {
    document.querySelector(id).addEventListener('submit', (event) => event.preventDefault());
  });

  document.querySelector('#control-curso').addEventListener('change', renderControl);
  document.querySelector('#control-fecha').addEventListener('change', renderControl);

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

async function inicializarPreceptorPanel() {
  configurarEventos();
  configurarFormularioAsistencia();

  const hoy = fechaLocalISO();

  document.querySelector('#control-fecha').value = hoy;
  document.querySelector('#fecha-asistencia').value = hoy;

  await cargarPerfil();
  await cargarDatos();

  refrescarSelectsCursos();
  renderBuscadorAlumnos();
  renderBuscadorDocentes();

  await renderResumen();
  await renderControl();
}

document.addEventListener('DOMContentLoaded', inicializarPreceptorPanel);