import { supabase } from './supabase.js';

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
    .select('*')
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
  // MIS NOTAS + PROMEDIO GENERAL + ESTADO ACADÉMICO
  // ==================================================

  const { data: notas, error: errorNotas } = await supabase
    .from('notas')
    .select('*, materia(nombre)')
    .eq('dni_alumno', DNI_ALUMNO)
    .order('fecha', { ascending: true });

  if (errorNotas) {
    console.error('Error al buscar notas:', errorNotas);
  }

  const notasBody = document.getElementById('notasBody');
  notasBody.innerHTML = '';

  if (!notas || notas.length === 0) {

    notasBody.innerHTML = `
      <tr>
        <td colspan="3">Sin datos todavía</td>
      </tr>
    `;

    document.getElementById('promedioGeneral').textContent = '-';
    document.getElementById('estadoAcademico').textContent = '-';

  } else {

    for (const nota of notas) {

      const fila = document.createElement('tr');

      fila.innerHTML = `
        <td>${nota.materia?.nombre ?? '-'}</td>
        <td>${nota.nota}</td>
        <td>${nota.fecha ?? '-'}</td>
      `;

      notasBody.appendChild(fila);
    }

    const sumaNotas = notas.reduce((acc, n) => acc + Number(n.nota), 0);
    const promedio = sumaNotas / notas.length;

    document.getElementById('promedioGeneral').textContent =
      promedio.toFixed(2);

    document.getElementById('estadoAcademico').textContent =
      promedio >= 6 ? 'Regular' : 'Libre';
  }

  // ==================================================
  // MIS ASISTENCIAS + PORCENTAJE DE ASISTENCIA
  // ==================================================

  const { data: asistencias, error: errorAsistencias } = await supabase
    .from('asistencia')
    .select('*')
    .eq('dni_alumno', DNI_ALUMNO)
    .order('fecha', { ascending: true });

  if (errorAsistencias) {
    console.error('Error al buscar asistencias:', errorAsistencias);
  }

  const asistenciasBody = document.getElementById('asistenciasBody');
  asistenciasBody.innerHTML = '';

  if (!asistencias || asistencias.length === 0) {

    asistenciasBody.innerHTML = `
      <tr>
        <td colspan="2">Sin datos todavía</td>
      </tr>
    `;

    document.getElementById('porcentajeAsistencia').textContent = '-';

  } else {

    for (const asistencia of asistencias) {

      const fila = document.createElement('tr');

      fila.innerHTML = `
        <td>${asistencia.fecha}</td>
        <td>${asistencia.estado}</td>
      `;

      asistenciasBody.appendChild(fila);
    }

    const totalRegistros = asistencias.length;
    const presentes = asistencias.filter(a => a.estado === 'Presente').length;
    const porcentaje = (presentes / totalRegistros) * 100;

    document.getElementById('porcentajeAsistencia').textContent =
      `${porcentaje.toFixed(1)}%`;
  }
}

cargarAlumno();