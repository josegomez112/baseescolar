import { supabase } from './supabase.js';

const DNI_ALUMNO = 12345678;

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
  // ==================================================

  const { data: relaciones, error: errorRelaciones } = await supabase
    .from('alumno_materia')
    .select('*')
    .eq('dni_alumno', DNI_ALUMNO);

  if (errorRelaciones) {
    console.error(
      'Error al buscar materias del alumno:',
      errorRelaciones
    );
    return;
  }

  console.log('Relaciones encontradas:', relaciones);

  document.getElementById('cantidadMaterias').textContent =
    relaciones.length;

  const materiasBody = document.getElementById('materiasBody');

  materiasBody.innerHTML = '';

  if (relaciones.length === 0) {

    materiasBody.innerHTML = `
      <tr>
        <td colspan="3">No tenés materias asignadas.</td>
      </tr>
    `;

  } else {

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

      // Buscar el docente asignado a esta materia
      let nombreDocente = '-';

      const { data: relacionDocente, error: errorRelacionDocente } = await supabase
        .from('profesor_materia')
        .select('*')
        .eq('id_materia', relacion.id_materia)
        .single();

      if (errorRelacionDocente) {
        console.error('Error al buscar el docente de la materia:', errorRelacionDocente);
      } else if (relacionDocente) {

        const { data: docente, error: errorDocente } = await supabase
          .from('docente')
          .select('*')
          .eq('dni', relacionDocente.dni_docente)
          .single();

        if (errorDocente) {
          console.error('Error al buscar el docente:', errorDocente);
        } else if (docente) {
          nombreDocente = `${docente.nombre} ${docente.apellido}`;
        }
      }

      const fila = document.createElement('tr');

      fila.innerHTML = `
        <td>${materia.nombre}</td>
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
    .select('*')
    .eq('dni_alumno', DNI_ALUMNO);

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

      const { data: materiaNota, error: errorMateriaNota } = await supabase
        .from('materia')
        .select('*')
        .eq('id', nota.id_materia)
        .single();

      const nombreMateria = errorMateriaNota || !materiaNota
        ? '-'
        : materiaNota.nombre;

      const fila = document.createElement('tr');

      fila.innerHTML = `
        <td>${nombreMateria}</td>
        <td>${nota.nota}</td>
        <td>${nota.fecha}</td>
      `;

      notasBody.appendChild(fila);
    }

    const sumaNotas = notas.reduce((acc, n) => acc + Number(n.nota), 0);
    const promedio = sumaNotas / notas.length;
    const promedioRedondeado = promedio.toFixed(2);

    document.getElementById('promedioGeneral').textContent = promedioRedondeado;

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