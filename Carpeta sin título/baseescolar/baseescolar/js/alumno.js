import { supabase } from './supabase.js';
import {
  NOTAS_POR_BIMESTRE,
  bimestreActual,
  etiquetaBimestre,
  promedio as promediar,
  estadoDePromedio,
  notasDelAnio,
  promedioGeneral,
  FALTAS_MAXIMAS_POR_BIMESTRE,
  asistenciasDelBimestre,
  resumenAsistencias,
  estadoPorFaltas,
  mostrarMotivo,
  botonSuave,
  crearCuadroResumen
} from './bimestres.js';

const ANIO = new Date().getFullYear();
const BIMESTRE_ACTUAL = bimestreActual();

// DNI del alumno que inició sesión. Si el login todavía no guarda el DNI,
// se usa Jose Gomez como alumno de prueba.
function obtenerDniSesion() {
  try {
    return Number(sessionStorage.getItem('dni')) || null;
  } catch (error) {
    return null;
  }
}

const DNI_ALUMNO = obtenerDniSesion() || 12345678;

async function cargarAlumno() {

  const { data: alumno, error: errorAlumno } = await supabase
    .from('alumno')
    .select('*, curso(nombre)')
    .eq('dni', DNI_ALUMNO)
    .single();

  if (errorAlumno) {
    console.error('Error al buscar alumno:', errorAlumno);
    return;
  }

  console.log('Alumno encontrado:', alumno);

  document.getElementById('bienvenida').textContent =
    `Bienvenido/a, ${alumno.nombre}`;

  document.getElementById('perfilDni').textContent =
    alumno.dni;

  document.getElementById('perfilNombre').textContent =
    alumno.nombre;

  document.getElementById('perfilApellido').textContent =
    alumno.apellido;

  const perfilCurso = document.getElementById('perfilCurso');

  if (perfilCurso) {
    perfilCurso.textContent = alumno.curso?.nombre ?? '-';
  }

  const nombreHeader = document.getElementById('nombreHeader');

  if (nombreHeader) {
    nombreHeader.textContent = `Alumno: ${alumno.nombre} ${alumno.apellido}`;
  }

  // ==================================================
  // MIS MATERIAS
  // El alumno pertenece a un curso, y las materias (con su docente)
  // salen de la tabla dictado para ese curso.
  // ==================================================

  const { data: dictados, error: errorDictados } = await supabase
    .from('dictado')
    .select('id, materia(id, nombre), docente(dni, nombre, apellido)')
    .eq('id_curso', alumno.id_curso);

  if (errorDictados) {
    console.error('Error al buscar las materias del alumno:', errorDictados);
  }

  const materias = (dictados || []).sort((a, b) =>
    (a.materia?.nombre ?? '').localeCompare(b.materia?.nombre ?? '')
  );

  console.log('Materias del alumno:', materias);

  document.getElementById('cantidadMaterias').textContent =
    materias.length;

  const materiasBody = document.getElementById('materiasBody');

  materiasBody.innerHTML = '';

  if (materias.length === 0) {

    materiasBody.innerHTML = `
      <tr>
        <td colspan="3">No tenés materias asignadas.</td>
      </tr>
    `;

  } else {

    for (const dictado of materias) {

      const nombreDocente = dictado.docente
        ? `${dictado.docente.nombre} ${dictado.docente.apellido}`
        : '-';

      const fila = document.createElement('tr');

      fila.innerHTML = `
        <td>${dictado.materia?.nombre ?? '-'}</td>
        <td>${nombreDocente}</td>
        <td>En curso</td>
      `;

      materiasBody.appendChild(fila);
    }
  }

  // ==================================================
  // MIS NOTAS POR BIMESTRE + PROMEDIO GENERAL + ESTADO ACADÉMICO
  // ==================================================

  const { data: notasData, error: errorNotas } = await supabase
    .from('notas')
    .select('id, nota, fecha, bimestre, id_materia, materia(nombre)')
    .eq('dni_alumno', DNI_ALUMNO)
    .order('fecha', { ascending: true });

  if (errorNotas) {
    console.error('Error al buscar notas:', errorNotas);
  }

  const notas = notasDelAnio(notasData || [], ANIO);

  const promGeneral = promedioGeneral(notas);

  document.getElementById('promedioGeneral').textContent =
    promGeneral === null ? '-' : promGeneral.toFixed(2);

  document.getElementById('estadoAcademico').textContent =
    promGeneral === null ? '-' : promGeneral >= 6 ? 'Regular' : 'Libre';

  const selBimestre = document.getElementById('bimestre-select');

  selBimestre.innerHTML = '';

  for (let numero = 1; numero <= 4; numero += 1) {
    const option = document.createElement('option');
    option.value = numero;
    option.textContent =
      etiquetaBimestre(numero, ANIO) + (numero === BIMESTRE_ACTUAL ? ' - actual' : '');
    selBimestre.appendChild(option);
  }

  selBimestre.value = BIMESTRE_ACTUAL;

  const notasDeMateria = (idMateria, bimestre) =>
    notas.filter((n) => n.id_materia === idMateria && n.bimestre === bimestre);

  function celdaTexto(texto) {
    const td = document.createElement('td');
    td.textContent = texto;
    return td;
  }

  function renderBimestre() {
    const bimestre = Number(selBimestre.value);
    const notasBody = document.getElementById('notasBody');

    notasBody.innerHTML = '';

    document.getElementById('bimestre-info').textContent =
      `${etiquetaBimestre(bimestre, ANIO)}. Hasta ${NOTAS_POR_BIMESTRE} notas por materia. ` +
      'Promedio de 6 o más: Aprobado. Menos de 6: Desaprobado.';

    if (materias.length === 0) {
      notasBody.innerHTML = '<tr><td colspan="6">No tenés materias asignadas.</td></tr>';
      return;
    }

    for (const dictado of materias) {
      const lista = notasDeMateria(dictado.materia?.id, bimestre);
      const valor = promediar(lista.map((n) => n.nota));
      const fila = document.createElement('tr');

      fila.appendChild(celdaTexto(dictado.materia?.nombre ?? '-'));

      for (let i = 0; i < NOTAS_POR_BIMESTRE; i += 1) {
        fila.appendChild(celdaTexto(lista[i] ? lista[i].nota : '-'));
      }

      fila.appendChild(celdaTexto(valor === null ? '-' : valor.toFixed(2)));
      fila.appendChild(celdaTexto(estadoDePromedio(valor)));
      notasBody.appendChild(fila);
    }
  }

  function renderResumenAnio() {
    const cuerpo = document.getElementById('resumenAnioBody');

    cuerpo.innerHTML = '';

    if (materias.length === 0) {
      cuerpo.innerHTML = '<tr><td colspan="5">No tenés materias asignadas.</td></tr>';
      return;
    }

    for (const dictado of materias) {
      const fila = document.createElement('tr');

      fila.appendChild(celdaTexto(dictado.materia?.nombre ?? '-'));

      for (let bimestre = 1; bimestre <= 4; bimestre += 1) {
        const valor = promediar(
          notasDeMateria(dictado.materia?.id, bimestre).map((n) => n.nota)
        );

        fila.appendChild(
          celdaTexto(valor === null ? '-' : `${valor.toFixed(2)} (${estadoDePromedio(valor)})`)
        );
      }

      cuerpo.appendChild(fila);
    }
  }

  selBimestre.addEventListener('change', renderBimestre);
  renderBimestre();
  renderResumenAnio();

  // ==================================================
  // MIS ASISTENCIAS POR BIMESTRE
  // ==================================================

  const { data: asistenciasData, error: errorAsistencias } = await supabase
    .from('asistencia')
    .select('*')
    .eq('dni_alumno', DNI_ALUMNO)
    .order('fecha', { ascending: true });

  if (errorAsistencias) {
    console.error('Error al buscar asistencias:', errorAsistencias);
  }

  const asistencias = (asistenciasData || []).filter((a) =>
    String(a.fecha ?? '').startsWith(String(ANIO))
  );

  // Porcentaje de asistencia del año (tarjeta de arriba).
  if (asistencias.length === 0) {
    document.getElementById('porcentajeAsistencia').textContent = '-';
  } else {
    const presentes = asistencias.filter((a) => a.estado === 'Presente').length;

    document.getElementById('porcentajeAsistencia').textContent =
      `${((presentes / asistencias.length) * 100).toFixed(1)}%`;
  }

  const selAsistencia = document.getElementById('asistencia-bimestre');
  const inputFecha = document.getElementById('asistencia-fecha');
  const asistenciasBody = document.getElementById('asistenciasBody');

  selAsistencia.innerHTML = '';

  for (let numero = 1; numero <= 4; numero += 1) {
    const option = document.createElement('option');
    option.value = numero;
    option.textContent =
      etiquetaBimestre(numero, ANIO) + (numero === BIMESTRE_ACTUAL ? ' - actual' : '');
    selAsistencia.appendChild(option);
  }

  selAsistencia.value = BIMESTRE_ACTUAL;

  function renderTarjetasAsistencia(resumen, estado) {
    crearCuadroResumen(
      document.getElementById('asistencia-resumen'),
      [
        ['Presentes', resumen.presentes],
        ['Tardes', resumen.tardes],
        ['Faltas', resumen.faltas],
        ['Justificadas', resumen.justificadas],
        ['Sin justificar', resumen.injustificadas]
      ],
      resumen.regular
        ? `${estado} · te quedan ${resumen.restantes} falta(s) sin justificar en este bimestre`
        : `${estado} en este bimestre · superaste las ${FALTAS_MAXIMAS_POR_BIMESTRE} faltas sin justificar`,
      resumen.regular ? 'ok' : 'error'
    );
  }

  function renderAsistencias() {
    const bimestre = Number(selAsistencia.value);
    const delBimestre = asistenciasDelBimestre(asistencias, bimestre, ANIO);
    const resumen = resumenAsistencias(delBimestre);
    const fecha = inputFecha.value;

    const estado = estadoPorFaltas(resumen);

    renderTarjetasAsistencia(resumen, estado);

    asistenciasBody.innerHTML = '';

    const mostradas = fecha ? delBimestre.filter((a) => a.fecha === fecha) : delBimestre;

    if (mostradas.length === 0) {
      asistenciasBody.innerHTML = fecha
        ? '<tr><td colspan="4">No hay asistencia registrada en esa fecha de este bimestre.</td></tr>'
        : '<tr><td colspan="4">Sin datos en este bimestre.</td></tr>';
      return;
    }

    for (const asistencia of mostradas) {
      const fila = document.createElement('tr');
      const esFalta = asistencia.estado === 'Ausente';

      [
        asistencia.fecha,
        asistencia.estado,
        esFalta ? (asistencia.justificada ? 'Sí' : 'No') : '-'
      ].forEach((valor) => {
        const celda = document.createElement('td');
        celda.textContent = valor;
        fila.appendChild(celda);
      });

      // El motivo puede ser largo: se lee en una ventana, no dentro de la tabla.
      const celdaMotivo = document.createElement('td');

      if (esFalta && asistencia.justificada) {
        const ver = botonSuave('Ver motivo', () =>
          mostrarMotivo(`Motivo de la falta del ${asistencia.fecha}`, asistencia.motivo)
        );
        celdaMotivo.appendChild(ver);
      } else {
        celdaMotivo.textContent = '-';
      }

      fila.appendChild(celdaMotivo);

      asistenciasBody.appendChild(fila);
    }
  }

  function renderResumenAsistenciasAnio() {
    const cuerpo = document.getElementById('resumenAsistenciasBody');

    cuerpo.innerHTML = '';

    for (let bimestre = 1; bimestre <= 4; bimestre += 1) {
      const resumen = resumenAsistencias(asistenciasDelBimestre(asistencias, bimestre, ANIO));
      const fila = document.createElement('tr');

      [
        `${bimestre}° Bimestre`,
        resumen.presentes,
        resumen.tardes,
        resumen.faltas,
        resumen.justificadas,
        resumen.injustificadas,
        estadoPorFaltas(resumen)
      ].forEach((valor) => {
        const celda = document.createElement('td');
        celda.textContent = valor;
        fila.appendChild(celda);
      });

      cuerpo.appendChild(fila);
    }
  }

  selAsistencia.addEventListener('change', renderAsistencias);
  inputFecha.addEventListener('change', renderAsistencias);

  document.getElementById('asistencia-filtro-form').addEventListener('submit', (event) => {
    event.preventDefault();
  });

  renderAsistencias();
  renderResumenAsistenciasAnio();

  // Estado académico: notas (promedio >= 6) y faltas del bimestre actual.
  const resumenActual = resumenAsistencias(
    asistenciasDelBimestre(asistencias, BIMESTRE_ACTUAL, ANIO)
  );

  const estadoAcademico = document.getElementById('estadoAcademico');

  if (promGeneral === null) {
    estadoAcademico.textContent = resumenActual.regular ? '-' : 'Libre (faltas)';
  } else if (promGeneral < 6) {
    estadoAcademico.textContent = 'Libre';
  } else {
    estadoAcademico.textContent = resumenActual.regular ? 'Regular' : 'Libre (faltas)';
  }
}

cargarAlumno();