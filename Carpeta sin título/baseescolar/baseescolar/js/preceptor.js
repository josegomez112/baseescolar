import { supabase } from './supabase.js';
import {
  FALTAS_MAXIMAS_POR_BIMESTRE,
  fechaLocalISO,
  bimestreActual,
  calendarioBimestres,
  etiquetaBimestre,
  asistenciasDelBimestre,
  resumenAsistencias,
  estadoPorFaltas,
  mostrarMotivo,
  botonSuave,
  botonPrincipal,
  crearVentana,
  crearCuadroResumen
} from './bimestres.js';

const ANIO = new Date().getFullYear();
const BIMESTRE_ACTUAL = bimestreActual();

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
// registro de cada alumno (dni -> { id, estado, justificada, motivo }).
async function estadosPorAlumno(idsCursos, fecha) {
  const { data, error } = await supabase
    .from('asistencia')
    .select('id, dni_alumno, estado, justificada, motivo')
    .in('id_curso', idsCursos)
    .eq('fecha', fecha)
    .order('id', { ascending: true });

  if (error) {
    console.error('Error al buscar asistencias:', error);
    return null;
  }

  const estados = new Map();

  (data || []).forEach((registro) => estados.set(registro.dni_alumno, registro));

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

  if (cursos.length === 0) {
    setTexto('#presentesHoyPreceptor', 0);
    setTexto('#ausentesHoyPreceptor', 0);
    setTexto('#justificacionesPreceptor', 0);
    return;
  }

  // Justificaciones pendientes: faltas sin justificar del bimestre actual.
  const bimestre = calendarioBimestres(ANIO)[BIMESTRE_ACTUAL - 1];

  const { count, error: errorPendientes } = await supabase
    .from('asistencia')
    .select('*', { count: 'exact', head: true })
    .in('id_curso', cursos.map((c) => c.id))
    .eq('estado', 'Ausente')
    .eq('justificada', false)
    .gte('fecha', bimestre.inicio)
    .lte('fecha', bimestre.fin);

  if (errorPendientes) {
    console.error('Error al contar faltas sin justificar:', errorPendientes);
    setTexto('#justificacionesPreceptor', '-');
  } else {
    setTexto('#justificacionesPreceptor', count ?? 0);
  }

  const estados = await estadosPorAlumno(cursos.map((c) => c.id), fechaLocalISO());

  if (!estados) {
    setTexto('#presentesHoyPreceptor', '-');
    setTexto('#ausentesHoyPreceptor', '-');
    return;
  }

  const valores = [...estados.values()].map((r) => r.estado);

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

  const cuadroControl = document.querySelector('#control-cuadro');

  if (!idCurso || !fecha) {
    tbody.innerHTML = '';
    cuadroControl.innerHTML = '';
    cuadroControl.className = '';
    setTexto('#control-resumen', 'Seleccioná un curso y una fecha para ver la asistencia.');
    return;
  }

  const estados = await estadosPorAlumno([idCurso], fecha);

  if (token !== tokenControl) return;

  if (!estados) {
    cuadroControl.innerHTML = '';
    cuadroControl.className = '';
    setTexto('#control-resumen', 'No se pudo cargar la asistencia.');
    return;
  }

  const alumnosCurso = alumnos.filter((a) => a.id_curso === idCurso);

  tbody.innerHTML = '';

  if (alumnosCurso.length === 0) {
    filaMensaje(tbody, 8, 'Este curso todavía no tiene alumnos.');
    cuadroControl.innerHTML = '';
    cuadroControl.className = '';
    setTexto('#control-resumen', `${nombreCurso(idCurso)}: sin alumnos.`);
    return;
  }

  const conteo = { Presente: 0, Ausente: 0, Tarde: 0, 'Sin registrar': 0 };

  alumnosCurso.forEach((a) => {
    const registro = estados.get(a.dni);
    const estado = registro?.estado || 'Sin registrar';

    conteo[estado] = (conteo[estado] || 0) + 1;

    const justificacion =
      estado !== 'Ausente' ? '-' : registro.justificada ? 'Justificada' : 'Sin justificar';

    const fila = crearFilaTabla([a.dni, a.nombre, a.apellido, nombreCurso(idCurso), estado, fecha, justificacion]);
    const celdaAcciones = document.createElement('td');

    if (estado === 'Ausente') {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.textContent = registro.justificada ? 'Quitar justificación' : 'Justificar';
      boton.addEventListener('click', () => cambiarJustificacion(registro, a));

      if (registro.justificada) {
        const ver = botonSuave('Ver motivo', () =>
          mostrarMotivo(`Motivo de la falta de ${a.nombre} ${a.apellido}`, registro.motivo)
        );
        ver.style.marginRight = '6px';
        celdaAcciones.appendChild(ver);
      }

      celdaAcciones.appendChild(boton);
    } else {
      celdaAcciones.textContent = '-';
    }

    fila.appendChild(celdaAcciones);
    tbody.appendChild(fila);
  });

  setTexto('#control-resumen', `${nombreCurso(idCurso)} - ${fecha}`);

  const justificadas = [...estados.values()].filter(
    (r) => r.estado === 'Ausente' && r.justificada
  ).length;

  const sinRegistrar = conteo['Sin registrar'];

  crearCuadroResumen(
    document.querySelector('#control-cuadro'),
    [
      ['Presentes', conteo.Presente],
      ['Ausentes', conteo.Ausente],
      ['Tardes', conteo.Tarde],
      ['Justificadas', justificadas],
      ['Sin registrar', sinRegistrar]
    ],
    sinRegistrar > 0
      ? `Faltan registrar ${sinRegistrar} alumno(s) en esta fecha`
      : 'Asistencia completa en esta fecha',
    sinRegistrar > 0 ? 'aviso' : 'ok'
  );
}

const MOTIVOS_FRECUENTES = [
  'Enfermedad (certificado médico)',
  'Turno médico o trámite',
  'Problema familiar'
];

// Ventana para elegir el motivo de una falta. Devuelve el texto del motivo
// o null si se cancela.
function pedirMotivo(nombreAlumno) {
  return new Promise((resolve) => {
    const { dialogo, cuerpo, pie } = crearVentana(`Justificar falta de ${nombreAlumno}`);

    const form = document.createElement('form');
    form.method = 'dialog';

    [...MOTIVOS_FRECUENTES, 'Otro'].forEach((texto, indice) => {
      const etiqueta = document.createElement('label');
      etiqueta.className = 'opcion';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'motivo';
      radio.value = texto;
      radio.checked = indice === 0;

      etiqueta.append(radio, document.createTextNode(texto));
      form.appendChild(etiqueta);
    });

    const nota = document.createElement('input');
    nota.type = 'text';
    nota.maxLength = 100;
    nota.placeholder = 'Escribí una nota breve del motivo';
    nota.style.display = 'none';
    form.appendChild(nota);

    const error = document.createElement('p');
    error.className = 'dlg-error';
    form.appendChild(error);

    form.addEventListener('change', () => {
      const esOtro = form.elements.motivo.value === 'Otro';
      nota.style.display = esOtro ? 'block' : 'none';
      if (esOtro) nota.focus();
    });

    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.className = 'btn-suave';
    cancelar.textContent = 'Cancelar';
    cancelar.addEventListener('click', () => dialogo.close());

    const guardar = botonPrincipal('Justificar', 'submit');
    guardar.setAttribute('form', 'form-motivo');
    form.id = 'form-motivo';

    pie.append(cancelar, guardar);
    cuerpo.appendChild(form);

    let resultado = null;

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const elegido = form.elements.motivo.value;

      if (elegido === 'Otro') {
        const texto = nota.value.trim();

        if (!texto) {
          error.textContent = 'Escribí una nota breve del motivo.';
          return;
        }

        resultado = `Otro: ${texto}`;
      } else {
        resultado = elegido;
      }

      dialogo.close();
    });

    dialogo.addEventListener('close', () => resolve(resultado));

    document.body.appendChild(dialogo);
    dialogo.showModal();
  });
}

async function cambiarJustificacion(registro, alumno) {
  const nombre = `${alumno.nombre} ${alumno.apellido}`;
  let cambios;

  if (registro.justificada) {
    if (!confirm(`¿Quitar la justificación de la falta de ${nombre}?`)) return;
    cambios = { justificada: false, motivo: null };
  } else {
    const motivo = await pedirMotivo(nombre);

    if (motivo === null) return;

    cambios = { justificada: true, motivo };
  }

  const { error } = await supabase.from('asistencia').update(cambios).eq('id', registro.id);

  if (error) {
    console.error('Error al cambiar la justificación:', error);
    mostrarMensaje('No se pudo cambiar la justificación. Revisá la consola.', 'error');
    return;
  }

  mostrarMensaje(
    cambios.justificada ? `Falta de ${nombre} justificada.` : `Se quitó la justificación de ${nombre}.`
  );

  await renderResumen();
  await renderControl();
  await renderFaltas();
}

// =====================================================
// FALTAS POR BIMESTRE (por curso)
// =====================================================

let tokenFaltas = 0;

async function renderFaltas() {
  const idCurso = Number(document.querySelector('#faltas-curso')?.value);
  const bimestre = Number(document.querySelector('#faltas-bimestre')?.value);
  const tbody = document.querySelector('#faltas-table tbody');

  if (!tbody) return;

  const token = ++tokenFaltas;

  const cuadroFaltas = document.querySelector('#faltas-cuadro');

  cuadroFaltas.innerHTML = '';
  cuadroFaltas.className = '';

  if (!idCurso || !bimestre) {
    tbody.innerHTML = '';
    setTexto('#faltas-resumen', 'Seleccioná un curso y un bimestre.');
    return;
  }

  const inicio = calendarioBimestres(ANIO)[0].inicio;

  const { data, error } = await supabase
    .from('asistencia')
    .select('id, dni_alumno, fecha, estado, justificada')
    .eq('id_curso', idCurso)
    .gte('fecha', inicio)
    .lte('fecha', `${ANIO}-12-31`);

  if (token !== tokenFaltas) return;

  if (error) {
    console.error('Error al buscar las faltas:', error);
    setTexto('#faltas-resumen', 'No se pudieron cargar las faltas.');
    return;
  }

  const alumnosCurso = alumnos.filter((a) => a.id_curso === idCurso);

  tbody.innerHTML = '';

  setTexto('#faltas-resumen', `${nombreCurso(idCurso)} - ${etiquetaBimestre(bimestre, ANIO)}`);

  if (alumnosCurso.length === 0) {
    filaMensaje(tbody, 7, 'Este curso todavía no tiene alumnos.');
    return;
  }

  const total = { presentes: 0, tardes: 0, faltas: 0, justificadas: 0, injustificadas: 0 };
  const noRegulares = [];

  alumnosCurso.forEach((a) => {
    const propias = (data || []).filter((r) => r.dni_alumno === a.dni);
    const resumen = resumenAsistencias(asistenciasDelBimestre(propias, bimestre, ANIO));

    Object.keys(total).forEach((clave) => {
      total[clave] += resumen[clave];
    });

    if (!resumen.regular) noRegulares.push(`${a.apellido}, ${a.nombre}`);

    tbody.appendChild(
      crearFilaTabla([
        `${a.apellido}, ${a.nombre}`,
        resumen.presentes,
        resumen.tardes,
        resumen.faltas,
        resumen.justificadas,
        resumen.injustificadas,
        estadoPorFaltas(resumen)
      ])
    );
  });

  crearCuadroResumen(
    cuadroFaltas,
    [
      ['Presentes', total.presentes],
      ['Tardes', total.tardes],
      ['Faltas', total.faltas],
      ['Justificadas', total.justificadas],
      ['Sin justificar', total.injustificadas]
    ],
    noRegulares.length > 0
      ? `No regulares en este bimestre (${noRegulares.length}): ${noRegulares.join(' · ')}`
      : 'Todos los alumnos del curso siguen regulares en este bimestre',
    noRegulares.length > 0 ? 'error' : 'ok'
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

  const faltasCurso = document.querySelector('#faltas-curso');
  const previoFaltas = faltasCurso.value;

  poblarSelect(faltasCurso, opciones, 'Seleccione un curso');

  if ([...faltasCurso.options].some((o) => o.value === previoFaltas)) {
    faltasCurso.value = previoFaltas;
  }
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
        .update({ estado, id_curso: Number(idCurso), dni_preceptor: DNI_PRECEPTOR, justificada: false, motivo: null })
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
    await renderFaltas();
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

  const faltasBimestre = document.querySelector('#faltas-bimestre');

  for (let numero = 1; numero <= 4; numero += 1) {
    const option = document.createElement('option');
    option.value = numero;
    option.textContent =
      etiquetaBimestre(numero, ANIO) + (numero === BIMESTRE_ACTUAL ? ' - actual' : '');
    faltasBimestre.appendChild(option);
  }

  faltasBimestre.value = BIMESTRE_ACTUAL;

  document.querySelector('#faltas-curso').addEventListener('change', renderFaltas);
  faltasBimestre.addEventListener('change', renderFaltas);
  document.querySelector('#faltas-form').addEventListener('submit', (event) => event.preventDefault());

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
  await renderFaltas();
}

document.addEventListener('DOMContentLoaded', inicializarPreceptorPanel);