import { supabase } from './supabase.js';

console.log('alumno.js conectado a Supabase');

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
  materias: [],
  notas: [],
  asistencias: []
};

// =====================================================
// UTILIDAD PARA CREAR FILAS
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
// BUSCAR SECCIÓN POR TÍTULO
// =====================================================

function obtenerSeccionPorTitulo(titulo) {
  return Array.from(
    document.querySelectorAll('main section')
  ).find((section) => {
    const heading = section.querySelector('h3');

    return (
      heading &&
      heading.textContent.trim().toLowerCase() ===
        titulo.toLowerCase()
    );
  });
}

// =====================================================
// ACTUALIZAR TARJETAS DEL RESUMEN
// =====================================================

function actualizarResumen(titulo, valor) {
  const article = Array.from(
    document.querySelectorAll('main article')
  ).find((item) => {
    const heading = item.querySelector('h3');

    return (
      heading &&
      heading.textContent.trim().toLowerCase() ===
        titulo.toLowerCase()
    );
  });

  if (!article) {
    return;
  }

  const valueElement = article.querySelector('p');

  if (valueElement) {
    valueElement.textContent = valor;
  }
}

// =====================================================
// CARGAR PERFIL
// =====================================================

async function cargarPerfil() {
  console.log('Buscando alumno con DNI:', DNI_ALUMNO);

  const { data, error } = await supabase
    .from('alumno')
    .select('dni, nombre, apellido')
    .eq('dni', DNI_ALUMNO)
    .maybeSingle();

  console.log('Resultado perfil:', data);
  console.log('Error perfil:', error);

  // ===================================================
  // PRUEBA: TRAER TODOS LOS ALUMNOS
  // ===================================================

  const prueba = await supabase
    .from('alumno')
    .select('*');

  console.log('PRUEBA TABLA ALUMNO:', prueba.data);
  console.log('PRUEBA ERROR:', prueba.error);

  if (error) {
    console.error('Error cargando perfil:', error);
    return;
  }

  if (!data) {
    console.error(
      'No se encontró el alumno con DNI:',
      DNI_ALUMNO
    );

    return;
  }

  alumnoData.perfil = data;

  // ===================================================
  // ACTUALIZAR PERFIL EN HTML
  // ===================================================

  const perfilSection =
    obtenerSeccionPorTitulo('Mi Perfil');

  if (perfilSection) {
    const elementos =
      perfilSection.querySelectorAll('dd');

    const dniElement = elementos[0];
    const nombreElement = elementos[1];
    const apellidoElement = elementos[2];

    if (dniElement) {
      dniElement.textContent = data.dni;
    }

    if (nombreElement) {
      nombreElement.textContent = data.nombre;
    }

    if (apellidoElement) {
      apellidoElement.textContent = data.apellido;
    }
  }

  // ===================================================
  // ACTUALIZAR BIENVENIDA
  // ===================================================

  const welcomeTitle =
    document.querySelector('main section h2');

  if (welcomeTitle) {
    welcomeTitle.textContent =
      'Bienvenido/a, ' +
      data.nombre +
      ' ' +
      data.apellido;
  }

  console.log('Perfil cargado correctamente:', data);
}

// =====================================================
// CARGAR MATERIAS
// =====================================================

async function cargarMaterias() {
  const materiasSection =
    obtenerSeccionPorTitulo('Mis Materias');

  const tbody =
    materiasSection?.querySelector('tbody');

  if (!tbody) {
    console.log(
      'No existe la tabla de materias.'
    );

    return;
  }

  tbody.innerHTML = '';

  // ===================================================
  // BUSCAR RELACIONES ALUMNO-MATERIA
  // ===================================================

  const {
    data: relaciones,
    error: errorRelaciones
  } = await supabase
    .from('alumno_materia')
    .select('id_materia')
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
      'Error obteniendo materias del alumno:',
      errorRelaciones
    );

    return;
  }

  if (!relaciones || relaciones.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3">No tiene materias asignadas.</td></tr>';

    actualizarResumen(
      'Cantidad de materias',
      0
    );

    return;
  }

  const idsMaterias =
    relaciones.map(
      (item) => item.id_materia
    );

  // ===================================================
  // BUSCAR MATERIAS
  // ===================================================

  const {
    data: materias,
    error: errorMaterias
  } = await supabase
    .from('materia')
    .select('id, nombre')
    .in('id', idsMaterias)
    .order('nombre', {
      ascending: true
    });

  console.log(
    'Materias encontradas:',
    materias
  );

  console.log(
    'Error materias:',
    errorMaterias
  );

  if (errorMaterias) {
    console.error(
      'Error cargando materias:',
      errorMaterias
    );

    return;
  }

  alumnoData.materias =
    materias || [];

  // ===================================================
  // BUSCAR DOCENTES
  // ===================================================

  const {
    data: profesores,
    error: errorProfesores
  } = await supabase
    .from('profesor_materia')
    .select(
      'dni_docente, id_materia'
    )
    .in('id_materia', idsMaterias);

  console.log(
    'Profesores encontrados:',
    profesores
  );

  console.log(
    'Error profesores:',
    errorProfesores
  );

  let docentes = [];

  if (
    profesores &&
    profesores.length > 0
  ) {
    const dnisDocentes =
      profesores.map(
        (profesor) =>
          profesor.dni_docente
      );

    const {
      data: datosDocentes,
      error: errorDocentes
    } = await supabase
      .from('docente')
      .select(
        'dni, nombre, apellido'
      )
      .in('dni', dnisDocentes);

    console.log(
      'Datos docentes:',
      datosDocentes
    );

    console.log(
      'Error docentes:',
      errorDocentes
    );

    if (!errorDocentes) {
      docentes =
        datosDocentes || [];
    }
  }

  // ===================================================
  // CREAR FILAS
  // ===================================================

  materias.forEach((materia) => {
    const profesorRelacion =
      profesores?.find(
        (profesor) =>
          profesor.id_materia ===
          materia.id
      );

    const docente =
      docentes.find(
        (docente) =>
          docente.dni ===
          profesorRelacion?.dni_docente
      );

    const nombreDocente =
      docente
        ? docente.nombre +
          ' ' +
          docente.apellido
        : 'Sin docente asignado';

    const fila =
      crearFilaTabla([
        materia.nombre,
        nombreDocente,
        'En curso'
      ]);

    tbody.appendChild(fila);
  });

  actualizarResumen(
    'Cantidad de materias',
    materias.length
  );

  console.log(
    'Materias cargadas correctamente:',
    materias
  );
}

// =====================================================
// CARGAR NOTAS
// =====================================================

async function cargarNotas() {
  const notasSection =
    obtenerSeccionPorTitulo('Mis Notas');

  const tbody =
    notasSection?.querySelector('tbody');

  if (!tbody) {
    console.log(
      'No existe la tabla de notas.'
    );

    return;
  }

  tbody.innerHTML = '';

  const {
    data,
    error
  } = await supabase
    .from('notas')
    .select(
      'id, nota, dni_alumno, dni_docente, id_materia'
    )
    .eq('dni_alumno', DNI_ALUMNO)
    .order('id', {
      ascending: false
    });

  console.log(
    'Notas encontradas:',
    data
  );

  console.log(
    'Error notas:',
    error
  );

  if (error) {
    console.error(
      'Error cargando notas:',
      error
    );

    return;
  }

  alumnoData.notas =
    data || [];

  if (
    !data ||
    data.length === 0
  ) {
    tbody.innerHTML =
      '<tr><td colspan="3">No hay notas registradas.</td></tr>';

    actualizarResumen(
      'Promedio general',
      '0.00'
    );

    return;
  }

  // ===================================================
  // BUSCAR MATERIAS
  // ===================================================

  const idsMaterias = [
    ...new Set(
      data.map(
        (nota) =>
          nota.id_materia
      )
    )
  ];

  const {
    data: materias,
    error: errorMaterias
  } = await supabase
    .from('materia')
    .select('id, nombre')
    .in('id', idsMaterias);

  console.log(
    'Materias de notas:',
    materias
  );

  console.log(
    'Error materias de notas:',
    errorMaterias
  );

  // ===================================================
  // CREAR FILAS
  // ===================================================

  data.forEach((nota) => {
    const materia =
      materias?.find(
        (item) =>
          item.id ===
          nota.id_materia
      );

    const fila =
      crearFilaTabla([
        materia
          ? materia.nombre
          : 'Materia desconocida',

        nota.nota,

        '-'
      ]);

    tbody.appendChild(fila);
  });

  // ===================================================
  // CALCULAR PROMEDIO
  // ===================================================

  const suma =
    data.reduce(
      (total, nota) =>
        total +
        Number(nota.nota),
      0
    );

  const promedio =
    data.length > 0
      ? suma / data.length
      : 0;

  actualizarResumen(
    'Promedio general',
    promedio.toFixed(2)
  );

  console.log(
    'Notas cargadas correctamente:',
    data
  );
}

// =====================================================
// CARGAR ASISTENCIAS
// =====================================================

async function cargarAsistencias() {
  const asistenciasSection =
    obtenerSeccionPorTitulo(
      'Mis Asistencias'
    );

  const tbody =
    asistenciasSection?.querySelector(
      'tbody'
    );

  if (!tbody) {
    console.log(
      'No existe la tabla de asistencias.'
    );

    return;
  }

  tbody.innerHTML = '';

  const {
    data,
    error
  } = await supabase
    .from('asistencia')
    .select(
      'id, fecha, estado, dni_alumno'
    )
    .eq(
      'dni_alumno',
      DNI_ALUMNO
    )
    .order('fecha', {
      ascending: false
    });

  console.log(
    'Asistencias encontradas:',
    data
  );

  console.log(
    'Error asistencias:',
    error
  );

  if (error) {
    console.error(
      'Error cargando asistencias:',
      error
    );

    return;
  }

  alumnoData.asistencias =
    data || [];

  if (
    !data ||
    data.length === 0
  ) {
    tbody.innerHTML =
      '<tr><td colspan="2">No hay asistencias registradas.</td></tr>';

    actualizarResumen(
      'Porcentaje de asistencia',
      '0%'
    );

    return;
  }

  // ===================================================
  // CREAR FILAS
  // ===================================================

  data.forEach((asistencia) => {
    const fila =
      crearFilaTabla([
        asistencia.fecha,
        asistencia.estado
      ]);

    tbody.appendChild(fila);
  });

  // ===================================================
  // CALCULAR PORCENTAJE
  // ===================================================

  const total =
    data.length;

  const presentes =
    data.filter(
      (asistencia) =>
        asistencia.estado &&
        asistencia.estado
          .toLowerCase() ===
          'presente'
    ).length;

  const porcentaje =
    total > 0
      ? (presentes / total) * 100
      : 0;

  actualizarResumen(
    'Porcentaje de asistencia',
    porcentaje.toFixed(0) + '%'
  );

  console.log(
    'Asistencias cargadas correctamente:',
    data
  );
}

// =====================================================
// MENÚ DE NAVEGACIÓN
// =====================================================

function configurarMenuNavegacion() {
  const links =
    document.querySelectorAll(
      'nav a'
    );

  links.forEach((link) => {
    link.addEventListener(
      'click',
      (event) => {
        const destino =
          link.getAttribute(
            'href'
          );

        if (
          !destino ||
          destino === '#'
        ) {
          event.preventDefault();
          return;
        }

        const target =
          document.querySelector(
            destino
          );

        if (target) {
          event.preventDefault();

          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    );
  });
}

// =====================================================
// CERRAR SESIÓN
// =====================================================

function configurarCerrarSesion() {
  const links =
    Array.from(
      document.querySelectorAll(
        'nav a'
      )
    );

  const logoutLink =
    links.find(
      (link) =>
        link.textContent
          .trim()
          .toLowerCase() ===
        'cerrar sesión'
    );

  if (!logoutLink) {
    return;
  }

  logoutLink.addEventListener(
    'click',
    (event) => {
      event.preventDefault();

      window.location.href =
        'index.html';
    }
  );
}

// =====================================================
// INICIALIZAR PANEL
// =====================================================

async function inicializarAlumnoPanel() {
  console.log(
    'Inicializando panel del alumno...'
  );

  try {
    await cargarPerfil();

    await cargarMaterias();

    await cargarNotas();

    await cargarAsistencias();

    configurarMenuNavegacion();

    configurarCerrarSesion();

    console.log(
      'Panel del alumno inicializado correctamente.'
    );

  } catch (error) {
    console.error(
      'Error inicializando panel del alumno:',
      error
    );
  }
}

// =====================================================
// ARRANQUE
// =====================================================

document.addEventListener(
  'DOMContentLoaded',
  inicializarAlumnoPanel
);