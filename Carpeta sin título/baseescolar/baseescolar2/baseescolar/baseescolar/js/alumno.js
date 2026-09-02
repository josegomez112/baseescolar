import { supabase } from './supabase.js';

console.log('PRUEBA ALUMNO.JS');
console.log('SUPABASE.JS CARGADO');

// =====================================================
// ALUMNO DE PRUEBA
// =====================================================

const DNI_ALUMNO = 12345678;

let alumnoData = {
  perfil: {
    dni: '',
    nombre: '',
    apellido: ''
  },

  materias: []
};

// =====================================================
// CARGAR DATOS DEL ALUMNO
// =====================================================

async function cargarAlumnoDesdeSupabase() {

  console.log('Buscando alumno con DNI:', DNI_ALUMNO);

  // ---------------------------------------------------
  // 1. BUSCAR ALUMNO
  // ---------------------------------------------------

  const { data: alumno, error: errorAlumno } =
    await supabase
      .from('alumno')
      .select('*')
      .eq('dni', DNI_ALUMNO)
      .single();

  console.log('Resultado alumno:', alumno);
  console.log('Error alumno:', errorAlumno);

  if (errorAlumno) {
    console.error('Error al buscar el alumno:', errorAlumno);
    return;
  }

  if (!alumno) {
    console.warn('No se encontró el alumno.');
    return;
  }

  alumnoData.perfil.dni = alumno.dni;
  alumnoData.perfil.nombre = alumno.nombre;
  alumnoData.perfil.apellido = alumno.apellido;

  console.log(
    'Alumno cargado correctamente:',
    alumnoData.perfil
  );

  // ---------------------------------------------------
  // 2. BUSCAR RELACIONES ALUMNO-MATERIA
  // ---------------------------------------------------

  const { data: relaciones, error: errorRelaciones } =
    await supabase
      .from('alumno_materia')
      .select('*')
      .eq('dni_alumno', DNI_ALUMNO);

  console.log(
    'Relaciones alumno-materia:',
    relaciones
  );

  console.log(
    'Error relaciones:',
    errorRelaciones
  );

  if (errorRelaciones) {
    console.error(
      'Error al buscar las materias:',
      errorRelaciones
    );

    return;
  }

  // ---------------------------------------------------
  // 3. BUSCAR CADA MATERIA
  // ---------------------------------------------------

  alumnoData.materias = [];

  for (const relacion of relaciones) {

    const {
      data: materia,
      error: errorMateria
    } = await supabase
      .from('materia')
      .select('*')
      .eq('id', relacion.id_materia)
      .single();

    console.log(
      'Materia encontrada:',
      materia
    );

    console.log(
      'Error materia:',
      errorMateria
    );

    if (errorMateria) {

      console.error(
        'Error al buscar materia:',
        errorMateria
      );

      continue;
    }

    if (materia) {

      alumnoData.materias.push(materia);

    }
  }

  console.log(
    'MATERIAS FINALES DEL ALUMNO:',
    alumnoData.materias
  );
}

// =====================================================
// MOSTRAR PERFIL
// =====================================================

function mostrarPerfil() {

  const perfilDni =
    document.querySelector('#perfil-dni');

  const perfilNombre =
    document.querySelector('#perfil-nombre');

  const perfilApellido =
    document.querySelector('#perfil-apellido');

  if (perfilDni) {

    perfilDni.textContent =
      alumnoData.perfil.dni;

  }

  if (perfilNombre) {

    perfilNombre.textContent =
      alumnoData.perfil.nombre;

  }

  if (perfilApellido) {

    perfilApellido.textContent =
      alumnoData.perfil.apellido;

  }
}

// =====================================================
// MOSTRAR MATERIAS
// =====================================================

function mostrarMaterias() {

  // ---------------------------------------------------
  // CANTIDAD DE MATERIAS
  // ---------------------------------------------------

  const cantidadMaterias =
    document.querySelector('#cantidad-materias');

  if (cantidadMaterias) {

    cantidadMaterias.textContent =
      alumnoData.materias.length;

  }

  // ---------------------------------------------------
  // TABLA DE MATERIAS
  // ---------------------------------------------------

  const tbody =
    document.querySelector('#materias-table tbody');

  if (!tbody) {

    console.warn(
      'No se encontró #materias-table tbody'
    );

    return;
  }

  tbody.innerHTML = '';

  alumnoData.materias.forEach((materia) => {

    const fila =
      document.createElement('tr');

    // Materia
    const celdaMateria =
      document.createElement('td');

    celdaMateria.textContent =
      materia.nombre ||
      materia.materia ||
      `Materia ${materia.id}`;

    // Docente
    const celdaDocente =
      document.createElement('td');

    celdaDocente.textContent =
      '-';

    // Estado
    const celdaEstado =
      document.createElement('td');

    celdaEstado.textContent =
      'En curso';

    fila.appendChild(celdaMateria);
    fila.appendChild(celdaDocente);
    fila.appendChild(celdaEstado);

    tbody.appendChild(fila);

  });
}

// =====================================================
// BIENVENIDA
// =====================================================

function mostrarBienvenida() {

  const welcomeTitle =
    document.querySelector('#welcome-title');

  if (welcomeTitle) {

    welcomeTitle.textContent =
      `Bienvenido/a, ${alumnoData.perfil.nombre} ${alumnoData.perfil.apellido}`;

  }
}

// =====================================================
// INICIALIZAR
// =====================================================

async function inicializarAlumnoPanel() {

  await cargarAlumnoDesdeSupabase();

  mostrarPerfil();

  mostrarMaterias();

  mostrarBienvenida();
}

// =====================================================
// INICIAR CUANDO CARGA EL HTML
// =====================================================

document.addEventListener(
  'DOMContentLoaded',
  inicializarAlumnoPanel
);