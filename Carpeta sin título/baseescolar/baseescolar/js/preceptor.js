// Datos simulados del preceptor para desarrollar la lógica del panel.
// En el futuro, estos datos podrán reemplazarse por consultas a Supabase.
const preceptorData = {
  preceptor: {
    dni: '28765432',
    nombre: 'Laura',
    apellido: 'Ramírez'
  },
  alumnos: [
    { dni: '40123456', nombre: 'Juan', apellido: 'Pérez', curso: '5° A' },
    { dni: '40234567', nombre: 'María', apellido: 'Gómez', curso: '5° A' },
    { dni: '40345678', nombre: 'Luis', apellido: 'Fernández', curso: '6° B' },
    { dni: '40456789', nombre: 'Ana', apellido: 'Martínez', curso: '7° A' }
  ],
  asistencias: [
    { alumno: 'Juan Pérez', fecha: '2026-08-03', estado: 'Presente', observaciones: 'Asistió normalmente.' },
    { alumno: 'María Gómez', fecha: '2026-08-03', estado: 'Ausente', observaciones: 'Sin justificar.' },
    { alumno: 'Luis Fernández', fecha: '2026-08-03', estado: 'Tarde', observaciones: 'Llegó 20 minutos tarde.' }
  ]
};

// Función auxiliar para crear filas de tabla.
function crearFilaTabla(celdas) {
  const fila = document.createElement('tr');

  celdas.forEach((valor) => {
    const celda = document.createElement('td');
    celda.textContent = valor;
    fila.appendChild(celda);
  });

  return fila;
}

// Muestra el perfil del preceptor en la sección correspondiente.
function cargarPerfilPreceptor() {
  const dniElement = document.querySelector('#perfil-dni');
  const nombreElement = document.querySelector('#perfil-nombre');
  const apellidoElement = document.querySelector('#perfil-apellido');

  if (dniElement) {
    dniElement.textContent = preceptorData.preceptor.dni;
  }

  if (nombreElement) {
    nombreElement.textContent = preceptorData.preceptor.nombre;
  }

  if (apellidoElement) {
    apellidoElement.textContent = preceptorData.preceptor.apellido;
  }
}

// Carga la lista de alumnos en la tabla de control.
function cargarAlumnos() {
  const tbody = document.querySelector('#control-asistencia-table tbody');

  if (!tbody) {
    return;
  }

  tbody.innerHTML = '';

  preceptorData.alumnos.forEach((alumno) => {
    const fila = crearFilaTabla([
      alumno.dni,
      alumno.nombre,
      alumno.curso,
      'Pendiente',
      ''
    ]);
    tbody.appendChild(fila);
  });
}

// Carga los registros de asistencia en la tabla de asistencias.
function cargarAsistencias() {
  const tbody = document.querySelector('#control-asistencia-table tbody');

  if (!tbody) {
    return;
  }

  // Se reconstruye la vista para mostrar los registros actuales.
  tbody.innerHTML = '';

  preceptorData.asistencias.forEach((registro) => {
    const alumno = preceptorData.alumnos.find((item) => `${item.nombre} ${item.apellido}` === registro.alumno);

    const fila = crearFilaTabla([
      alumno ? alumno.dni : 'N/A',
      alumno ? alumno.nombre : registro.alumno.split(' ')[0],
      alumno ? alumno.curso : 'N/A',
      registro.estado,
      registro.fecha
    ]);

    tbody.appendChild(fila);
  });
}

// Muestra un mensaje de bienvenida al cargar la página.
function mostrarBienvenida() {
  const welcomeTitle = document.querySelector('#welcome-title');

  if (welcomeTitle) {
    welcomeTitle.textContent = `Bienvenido/a, ${preceptorData.preceptor.nombre} ${preceptorData.preceptor.apellido}`;
  }
}

// Función auxiliar para mostrar mensajes dentro de la página.
function mostrarMensaje(mensaje, tipo = 'info') {
  const existing = document.querySelector('#message-box');

  if (existing) {
    existing.remove();
  }

  const mensajeBox = document.createElement('p');
  mensajeBox.id = 'message-box';
  mensajeBox.textContent = mensaje;
  mensajeBox.style.marginTop = '12px';
  mensajeBox.style.padding = '10px 12px';
  mensajeBox.style.borderRadius = '8px';
  mensajeBox.style.fontWeight = '600';

  if (tipo === 'error') {
    mensajeBox.style.background = '#fdecec';
    mensajeBox.style.color = '#b42318';
  } else {
    mensajeBox.style.background = '#eafaf3';
    mensajeBox.style.color = '#1f7a52';
  }

  const formSection = document.querySelector('#registrar-asistencia-section');

  if (formSection) {
    formSection.appendChild(mensajeBox);
  }
}

// Busca alumnos por DNI, nombre o apellido.
function buscarAlumno() {
  const input = document.querySelector('#buscador-alumno');

  if (!input) {
    return;
  }

  input.addEventListener('input', (event) => {
    const valor = event.target.value.trim().toLowerCase();
    const tbody = document.querySelector('#control-asistencia-table tbody');

    if (!tbody) {
      return;
    }

    tbody.innerHTML = '';

    const resultados = preceptorData.alumnos.filter((alumno) => {
      return (
        alumno.dni.toLowerCase().includes(valor) ||
        alumno.nombre.toLowerCase().includes(valor) ||
        alumno.apellido.toLowerCase().includes(valor)
      );
    });

    if (resultados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No se encontraron coincidencias.</td></tr>';
      return;
    }

    resultados.forEach((alumno) => {
      const fila = crearFilaTabla([
        alumno.dni,
        alumno.nombre,
        alumno.curso,
        'Pendiente',
        ''
      ]);
      tbody.appendChild(fila);
    });
  });
}

// Registra una nueva asistencia con validación.
function registrarAsistencia() {
  const form = document.querySelector('#registrar-asistencia-form');

  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const alumnoInput = document.querySelector('#alumno-asistencia');
    const fechaInput = document.querySelector('#fecha-asistencia');
    const estadoSelect = document.querySelector('#estado-asistencia');
    const observacionesInput = document.querySelector('#observaciones-asistencia');

    const campos = [alumnoInput, fechaInput, estadoSelect, observacionesInput];

    if (campos.some((campo) => !campo || campo.value.trim() === '')) {
      mostrarMensaje('Todos los campos son obligatorios.', 'error');
      return;
    }

    const nuevoRegistro = {
      alumno: alumnoInput.value.trim(),
      fecha: fechaInput.value,
      estado: estadoSelect.value,
      observaciones: observacionesInput.value.trim()
    };

    preceptorData.asistencias.push(nuevoRegistro);
    cargarAsistencias();
    form.reset();
    mostrarMensaje('Asistencia registrada correctamente.');
  });
}

// Modifica un registro de asistencia existente.
function editarAsistencia() {
  if (!preceptorData.asistencias.length) {
    return;
  }

  const registro = preceptorData.asistencias[0];
  registro.estado = 'Presente';
  registro.observaciones = 'Registro actualizado por el preceptor.';

  cargarAsistencias();
  mostrarMensaje('Registro de asistencia actualizado correctamente.');
}

// Elimina un registro de asistencia.
function eliminarAsistencia() {
  if (!preceptorData.asistencias.length) {
    mostrarMensaje('No hay registros para eliminar.', 'error');
    return;
  }

  preceptorData.asistencias.pop();
  cargarAsistencias();
  mostrarMensaje('Registro de asistencia eliminado correctamente.');
}

// Botón de cerrar sesión.
function configurarCerrarSesion() {
  const logoutButton = document.querySelector('#logout-button');

  if (!logoutButton) {
    return;
  }

  logoutButton.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}

// Inicializa la lógica del panel del preceptor.
function inicializarPreceptorPanel() {
  mostrarBienvenida();
  cargarPerfilPreceptor();
  cargarAlumnos();
  cargarAsistencias();
  buscarAlumno();
  registrarAsistencia();
  configurarCerrarSesion();

  // Se exposponen funciones para ser reutilizadas en el futuro con Supabase.
  window.preceptorPanel = {
    editarAsistencia,
    eliminarAsistencia,
    cargarAlumnos,
    cargarAsistencias,
    buscarAlumno,
    registrarAsistencia
  };
}

document.addEventListener('DOMContentLoaded', inicializarPreceptorPanel);
