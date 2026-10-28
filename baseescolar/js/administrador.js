import { supabase } from './supabase.js';

console.log('administrador.js conectado a Supabase');

// =====================================================
// SESIÓN Y DATOS EN MEMORIA
// =====================================================

function leerSesion(clave) {
  try {
    return sessionStorage.getItem(clave);
  } catch (error) {
    return null;
  }
}

// Si el login todavía no guardó el DNI, se usa el administrador de prueba.
const DNI_ADMIN = Number(leerSesion('dni')) || 11111111;

const ROLES = {
  alumno: { tabla: 'alumno', etiqueta: 'Alumno' },
  docente: { tabla: 'docente', etiqueta: 'Docente' },
  preceptor: { tabla: 'preceptor', etiqueta: 'Preceptor' },
  administrador: { tabla: 'administrador', etiqueta: 'Administrador' }
};

let cursos = [];   // { id, nombre }
let materias = []; // { id, nombre }
let docentes = []; // { dni, nombre, apellido }

let tokenBusqueda = 0;
let temporizadorBusqueda = null;

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

function mostrarMensaje(mensaje, tipo = 'success') {
  const existente = document.querySelector('#admin-message');

  if (existente) {
    existente.remove();
  }

  const caja = document.createElement('p');

  caja.id = 'admin-message';
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

  setTimeout(() => caja.remove(), 12000);
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

function poblarSelect(select, opciones, textoVacio) {
  if (!select) return;

  const previo = select.value;

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

  if ([...select.options].some((o) => o.value === previo)) {
    select.value = previo;
  }
}

async function contar(tabla) {
  const { count, error } = await supabase
    .from(tabla)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`Error al contar ${tabla}:`, error);
    return null;
  }

  return count ?? 0;
}

// =====================================================
// CATÁLOGOS (cursos, materias, docentes)
// =====================================================

async function cargarCatalogos() {
  const [resCursos, resMaterias, resDocentes] = await Promise.all([
    supabase.from('curso').select('id, nombre').order('nombre'),
    supabase.from('materia').select('id, nombre').order('nombre'),
    supabase.from('docente').select('dni, nombre, apellido').order('apellido')
  ]);

  if (resCursos.error || resMaterias.error || resDocentes.error) {
    console.error('Error cargando catálogos:', resCursos.error, resMaterias.error, resDocentes.error);
    mostrarMensaje('No se pudieron cargar los cursos, materias o docentes.', 'error');
  }

  cursos = resCursos.data || [];
  materias = resMaterias.data || [];
  docentes = resDocentes.data || [];
}

function refrescarSelects() {
  const opcionesCursos = cursos.map((c) => ({ valor: c.id, texto: c.nombre }));

  poblarSelect(document.querySelector('#curso-filtro'), opcionesCursos, 'Seleccione un curso');
  poblarSelect(document.querySelector('#usuario-curso'), opcionesCursos, 'Seleccione un curso');

  poblarSelect(
    document.querySelector('#usuario-materia'),
    materias.map((m) => ({ valor: m.id, texto: m.nombre })),
    'Seleccione una materia'
  );

  poblarSelect(
    document.querySelector('#materia-curso'),
    [{ valor: 'todos', texto: 'Todos los cursos' }, ...opcionesCursos],
    'Seleccione un curso'
  );

  poblarSelect(
    document.querySelector('#materia-docente'),
    docentes.map((d) => ({ valor: d.dni, texto: `${d.apellido}, ${d.nombre} (${d.dni})` })),
    'Sin asignar por ahora'
  );

  const lista = document.querySelector('#materias-lista');

  if (lista) {
    lista.innerHTML = '';
    materias.forEach((m) => {
      const option = document.createElement('option');
      option.value = m.nombre;
      lista.appendChild(option);
    });
  }

  // Casillas de cursos para docente / preceptor (se conserva lo marcado).
  const contenedor = document.querySelector('#usuario-cursos');

  if (contenedor) {
    const marcados = new Set(
      [...contenedor.querySelectorAll('input:checked')].map((i) => i.value)
    );

    contenedor.innerHTML = '';

    if (cursos.length === 0) {
      contenedor.textContent = 'Todavía no hay cursos creados.';
    }

    cursos.forEach((curso) => {
      const etiqueta = document.createElement('label');
      etiqueta.style.display = 'inline-flex';
      etiqueta.style.alignItems = 'center';
      etiqueta.style.gap = '6px';
      etiqueta.style.fontWeight = 'normal';

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.value = curso.id;
      check.checked = marcados.has(String(curso.id));

      etiqueta.appendChild(check);
      etiqueta.appendChild(document.createTextNode(curso.nombre));
      contenedor.appendChild(etiqueta);
    });
  }
}

// =====================================================
// ENCABEZADO Y RESUMEN
// =====================================================

async function cargarPerfilAdmin() {
  const { data, error } = await supabase
    .from('administrador')
    .select('nombre, apellido')
    .eq('dni', DNI_ADMIN)
    .maybeSingle();

  if (error || !data) {
    console.error('No se pudo cargar el administrador:', error);
    setTexto('#admin-name', 'Administrador');
    return;
  }

  setTexto('#admin-name', `Administrador: ${data.nombre} ${data.apellido}`);
  setTexto('#welcome-title', `Bienvenido/a, ${data.nombre} ${data.apellido}`);
}

async function cargarResumen() {
  const [alumnos, docentesTotal, materiasTotal, usuarios] = await Promise.all([
    contar('alumno'),
    contar('docente'),
    contar('materia'),
    contar('usuarios')
  ]);

  setTexto('#card-total-alumnos p', alumnos ?? '-');
  setTexto('#card-total-docentes p', docentesTotal ?? '-');
  setTexto('#card-total-materias p', materiasTotal ?? '-');
  setTexto('#card-total-usuarios p', usuarios ?? '-');
}

// =====================================================
// BUSCADOR (alumnos, docentes, preceptores, administradores)
// =====================================================

// Búsqueda de DNI por prefijo: "123" encuentra 12345678 (y DNIs de 7 dígitos).
function condicionDni(termino) {
  if (!/^\d+$/.test(termino) || termino.length > 8) {
    return null;
  }

  const numero = Number(termino);
  const partes = [];

  [7, 8].forEach((digitos) => {
    if (termino.length > digitos) return;

    const factor = 10 ** (digitos - termino.length);
    partes.push(`and(dni.gte.${numero * factor},dni.lte.${(numero + 1) * factor - 1})`);
  });

  return partes.length > 0 ? partes.join(',') : null;
}

async function buscarPersonas() {
  const tipo = document.querySelector('#buscar-tipo').value;
  const texto = document.querySelector('#buscar-texto').value.trim();
  const tbody = document.querySelector('#resultados-table tbody');

  if (!tbody) return;

  const token = ++tokenBusqueda;

  if (!texto) {
    filaMensaje(tbody, 6, 'Escribí un DNI, nombre o apellido para buscar.');
    return;
  }

  const rol = ROLES[tipo];
  const columnas = tipo === 'alumno'
    ? 'dni, nombre, apellido, curso(nombre)'
    : 'dni, nombre, apellido';

  let consulta = supabase.from(rol.tabla).select(columnas).order('apellido').limit(50);

  // Cada palabra tiene que aparecer en el nombre, el apellido o el DNI.
  texto
    .split(/\s+/)
    .map((palabra) => palabra.replace(/[,()%*_\\]/g, ''))
    .filter(Boolean)
    .forEach((palabra) => {
      const filtros = [`nombre.ilike.%${palabra}%`, `apellido.ilike.%${palabra}%`];
      const dni = condicionDni(palabra);

      if (dni) filtros.push(dni);

      consulta = consulta.or(filtros.join(','));
    });

  const { data: personas, error } = await consulta;

  if (token !== tokenBusqueda) return;

  if (error) {
    console.error('Error en la búsqueda:', error);
    filaMensaje(tbody, 6, 'Error al buscar. Revisá la consola.');
    return;
  }

  if (!personas || personas.length === 0) {
    filaMensaje(tbody, 6, 'No se encontraron coincidencias.');
    return;
  }

  const dnis = personas.map((p) => p.dni);

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('dni, usuario')
    .eq('rol', tipo)
    .in('dni', dnis);

  const usuarioPorDni = new Map((usuarios || []).map((u) => [u.dni, u.usuario]));
  const detallePorDni = new Map();

  if (tipo === 'alumno') {
    personas.forEach((p) => detallePorDni.set(p.dni, p.curso?.nombre ?? '-'));
  }

  if (tipo === 'docente') {
    const { data } = await supabase
      .from('dictado')
      .select('dni_docente, curso(nombre), materia(nombre)')
      .in('dni_docente', dnis);

    (data || []).forEach((d) => {
      const lista = detallePorDni.get(d.dni_docente) || [];
      lista.push(`${d.materia?.nombre} (${d.curso?.nombre})`);
      detallePorDni.set(d.dni_docente, lista);
    });
  }

  if (tipo === 'preceptor') {
    const { data } = await supabase
      .from('preceptor_curso')
      .select('dni_preceptor, curso(nombre)')
      .in('dni_preceptor', dnis);

    (data || []).forEach((d) => {
      const lista = detallePorDni.get(d.dni_preceptor) || [];
      lista.push(d.curso?.nombre);
      detallePorDni.set(d.dni_preceptor, lista);
    });
  }

  if (token !== tokenBusqueda) return;

  tbody.innerHTML = '';

  personas.forEach((persona) => {
    const detalle = detallePorDni.get(persona.dni);

    const fila = crearFilaTabla([
      persona.dni,
      persona.nombre,
      persona.apellido,
      Array.isArray(detalle) ? detalle.join(', ') : detalle,
      usuarioPorDni.get(persona.dni)
    ]);

    const celdaAcciones = document.createElement('td');
    const botonEliminar = document.createElement('button');

    botonEliminar.type = 'button';
    botonEliminar.textContent = 'Eliminar';
    botonEliminar.style.background = '#b42318';
    botonEliminar.style.color = '#fff';
    botonEliminar.style.border = 'none';
    botonEliminar.style.borderRadius = '6px';
    botonEliminar.style.padding = '6px 10px';
    botonEliminar.style.cursor = 'pointer';
    botonEliminar.addEventListener('click', () => eliminarPersona(tipo, persona));

    celdaAcciones.appendChild(botonEliminar);
    fila.appendChild(celdaAcciones);
    tbody.appendChild(fila);
  });
}

// =====================================================
// ELIMINAR PERSONAS
// =====================================================

function pasosDeEliminacion(tipo, dni) {
  const borrarUsuario = () => supabase.from('usuarios').delete().eq('dni', dni).eq('rol', tipo);

  const pasos = {
    alumno: [
      () => supabase.from('notas').delete().eq('dni_alumno', dni),
      () => supabase.from('asistencia').delete().eq('dni_alumno', dni),
      borrarUsuario,
      () => supabase.from('alumno').delete().eq('dni', dni)
    ],
    docente: [
      () => supabase.from('notas').update({ dni_docente: null }).eq('dni_docente', dni),
      () => supabase.from('asistencia').update({ dni_docente: null }).eq('dni_docente', dni),
      () => supabase.from('dictado').update({ dni_docente: null }).eq('dni_docente', dni),
      borrarUsuario,
      () => supabase.from('docente').delete().eq('dni', dni)
    ],
    preceptor: [
      () => supabase.from('asistencia').update({ dni_preceptor: null }).eq('dni_preceptor', dni),
      () => supabase.from('preceptor_curso').delete().eq('dni_preceptor', dni),
      borrarUsuario,
      () => supabase.from('preceptor').delete().eq('dni', dni)
    ],
    administrador: [
      borrarUsuario,
      () => supabase.from('administrador').delete().eq('dni', dni)
    ]
  };

  return pasos[tipo];
}

async function eliminarPersona(tipo, persona) {
  const rol = ROLES[tipo];

  if (tipo === 'administrador') {
    if (persona.dni === DNI_ADMIN) {
      mostrarMensaje('No podés eliminar tu propio usuario.', 'error');
      return;
    }

    const total = await contar('administrador');

    if (total !== null && total <= 1) {
      mostrarMensaje('No se puede eliminar al único administrador.', 'error');
      return;
    }
  }

  const advertencias = {
    alumno: 'Se borrarán también sus notas y asistencias.',
    docente: 'Sus materias quedarán sin docente y sus notas se conservarán sin docente asignado.',
    preceptor: 'Se quitarán sus cursos asignados.',
    administrador: ''
  };

  const confirmado = confirm(
    `¿Eliminar a ${persona.nombre} ${persona.apellido} (${rol.etiqueta}, DNI ${persona.dni})?\n\n` +
      `${advertencias[tipo]}\nEsta acción no se puede deshacer.`
  );

  if (!confirmado) return;

  for (const paso of pasosDeEliminacion(tipo, persona.dni)) {
    const { error } = await paso();

    if (error) {
      console.error('Error al eliminar:', error);
      mostrarMensaje('No se pudo eliminar por completo. Revisá la consola.', 'error');
      await recargarTodo();
      return;
    }
  }

  mostrarMensaje(`${rol.etiqueta} ${persona.nombre} ${persona.apellido} eliminado.`);
  await recargarTodo();
}

// =====================================================
// VISTA POR CURSO
// =====================================================

async function cargarVistaCurso() {
  const idCurso = Number(document.querySelector('#curso-filtro').value);
  const tbodyMaterias = document.querySelector('#curso-materias-table tbody');
  const tbodyAlumnos = document.querySelector('#curso-alumnos-table tbody');

  if (!tbodyMaterias || !tbodyAlumnos) return;

  if (!idCurso) {
    tbodyMaterias.innerHTML = '';
    tbodyAlumnos.innerHTML = '';
    setTexto('#curso-resumen', 'Seleccioná un curso para ver sus materias y alumnos.');
    return;
  }

  const [resDictados, resAlumnos] = await Promise.all([
    supabase
      .from('dictado')
      .select('id, materia(nombre), docente(dni, nombre, apellido)')
      .eq('id_curso', idCurso),
    supabase
      .from('alumno')
      .select('dni, nombre, apellido')
      .eq('id_curso', idCurso)
      .order('apellido')
  ]);

  if (resDictados.error || resAlumnos.error) {
    console.error('Error cargando el curso:', resDictados.error, resAlumnos.error);
    mostrarMensaje('No se pudo cargar el curso.', 'error');
    return;
  }

  const dictados = (resDictados.data || []).sort((a, b) =>
    (a.materia?.nombre ?? '').localeCompare(b.materia?.nombre ?? '')
  );
  const alumnos = resAlumnos.data || [];

  const nombreCurso = cursos.find((c) => c.id === idCurso)?.nombre ?? '';

  setTexto(
    '#curso-resumen',
    `${nombreCurso}: ${alumnos.length} alumno(s) y ${dictados.length} materia(s).`
  );

  tbodyMaterias.innerHTML = '';

  if (dictados.length === 0) {
    filaMensaje(tbodyMaterias, 2, 'Este curso todavía no tiene materias.');
  }

  dictados.forEach((d) => {
    tbodyMaterias.appendChild(
      crearFilaTabla([
        d.materia?.nombre,
        d.docente ? `${d.docente.nombre} ${d.docente.apellido}` : 'Sin docente'
      ])
    );
  });

  tbodyAlumnos.innerHTML = '';

  if (alumnos.length === 0) {
    filaMensaje(tbodyAlumnos, 3, 'Este curso todavía no tiene alumnos.');
  }

  alumnos.forEach((a) => {
    tbodyAlumnos.appendChild(crearFilaTabla([a.dni, a.nombre, a.apellido]));
  });
}

// =====================================================
// DICTADO: todos los cursos tienen todas las materias
// =====================================================

// Crea las filas de dictado que falten (sin docente) para una materia.
async function asegurarDictados(idMateria) {
  const { data: existentes, error } = await supabase
    .from('dictado')
    .select('id_curso')
    .eq('id_materia', idMateria);

  if (error) return { error };

  const tienen = new Set((existentes || []).map((d) => d.id_curso));

  const faltantes = cursos
    .filter((c) => !tienen.has(c.id))
    .map((c) => ({ id_curso: c.id, id_materia: idMateria, dni_docente: null }));

  if (faltantes.length === 0) return { error: null };

  return await supabase.from('dictado').insert(faltantes);
}

// Asigna un docente solo en los cursos donde la materia todavía no tiene docente.
async function asignarDocenteLibre(dniDocente, idMateria, idsCursos) {
  const resultado = await asegurarDictados(idMateria);

  if (resultado.error) throw resultado.error;

  const { data: filas, error } = await supabase
    .from('dictado')
    .select('id, dni_docente, curso(nombre), docente(nombre, apellido)')
    .eq('id_materia', idMateria)
    .in('id_curso', idsCursos);

  if (error) throw error;

  const libres = (filas || []).filter((f) => !f.dni_docente);
  const ocupadas = (filas || []).filter((f) => f.dni_docente);

  if (libres.length > 0) {
    const { error: errorUpdate } = await supabase
      .from('dictado')
      .update({ dni_docente: dniDocente })
      .in('id', libres.map((f) => f.id));

    if (errorUpdate) throw errorUpdate;
  }

  return {
    asignados: libres.map((f) => f.curso?.nombre),
    ocupados: ocupadas.map(
      (f) => `${f.curso?.nombre} (ya lo dicta ${f.docente?.nombre} ${f.docente?.apellido})`
    )
  };
}

// =====================================================
// CREAR CURSO
// =====================================================

function configurarFormularioCurso() {
  const form = document.querySelector('#crear-curso-form');

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nombre = document.querySelector('#curso-nuevo').value.trim().replace(/\s+/g, '');

    if (!nombre) {
      mostrarMensaje('Escribí el nombre del curso.', 'error');
      return;
    }

    if (cursos.some((c) => normalizar(c.nombre) === normalizar(nombre))) {
      mostrarMensaje(`El curso ${nombre} ya existe.`, 'error');
      return;
    }

    const { data: curso, error } = await supabase
      .from('curso')
      .insert([{ nombre }])
      .select('id, nombre')
      .single();

    if (error) {
      console.error('Error al crear el curso:', error);
      mostrarMensaje('No se pudo crear el curso.', 'error');
      return;
    }

    // El curso nuevo tiene todas las materias, todavía sin docente.
    if (materias.length > 0) {
      const { error: errorDictado } = await supabase
        .from('dictado')
        .insert(materias.map((m) => ({ id_curso: curso.id, id_materia: m.id, dni_docente: null })));

      if (errorDictado) {
        console.error('Error al crear las materias del curso:', errorDictado);
        mostrarMensaje('El curso se creó, pero no se pudieron cargar sus materias.', 'error');
        await recargarTodo();
        return;
      }
    }

    form.reset();
    mostrarMensaje(`Curso ${curso.nombre} creado con todas las materias (sin docente asignado).`);
    await recargarTodo();
  });
}

// =====================================================
// CREAR USUARIO
// =====================================================

function actualizarCamposPorRol() {
  const rol = document.querySelector('#usuario-rol').value;

  const mostrar = (id, visible) => {
    const elemento = document.querySelector(id);
    if (elemento) elemento.style.display = visible ? '' : 'none';
  };

  mostrar('#grupo-curso-alumno', rol === 'alumno');
  mostrar('#grupo-materia', rol === 'docente');
  mostrar('#grupo-cursos', rol === 'docente' || rol === 'preceptor');
}

function configurarFormularioUsuario() {
  const form = document.querySelector('#crear-usuario-form');

  if (!form) return;

  document.querySelector('#usuario-rol').addEventListener('change', actualizarCamposPorRol);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const rol = document.querySelector('#usuario-rol').value;
    const dniTexto = document.querySelector('#usuario-dni').value.trim();
    const nombre = document.querySelector('#usuario-nombre').value.trim();
    const apellido = document.querySelector('#usuario-apellido').value.trim();
    const usuario = document.querySelector('#usuario-usuario').value.trim();
    const password = document.querySelector('#usuario-password').value.trim();
    const idCursoAlumno = document.querySelector('#usuario-curso').value;
    const idMateria = document.querySelector('#usuario-materia').value;
    const idsCursos = [...document.querySelectorAll('#usuario-cursos input:checked')].map((i) =>
      Number(i.value)
    );

    // ---- Validaciones ----
    if (!rol) return mostrarMensaje('Elegí un rol.', 'error');
    if (!/^\d{7,8}$/.test(dniTexto)) return mostrarMensaje('El DNI debe tener 7 u 8 números.', 'error');
    if (!nombre || !apellido) return mostrarMensaje('Completá nombre y apellido.', 'error');
    if (usuario.length < 3) return mostrarMensaje('El usuario debe tener al menos 3 caracteres.', 'error');
    if (password.length < 4) return mostrarMensaje('La contraseña debe tener al menos 4 caracteres.', 'error');
    if (rol === 'alumno' && !idCursoAlumno) return mostrarMensaje('Elegí el curso del alumno.', 'error');

    if (rol === 'docente') {
      if (idsCursos.length > 0 && !idMateria) {
        return mostrarMensaje('Elegí la materia que dicta el docente.', 'error');
      }
      if (idMateria && idsCursos.length === 0) {
        return mostrarMensaje('Marcá al menos un curso para esa materia.', 'error');
      }
    }

    const dni = Number(dniTexto);
    const tabla = ROLES[rol].tabla;

    // ---- Que no existan ya el usuario ni el DNI ----
    const { data: usuarioExistente, error: errorUsuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('usuario', usuario)
      .maybeSingle();

    if (errorUsuario) {
      console.error(errorUsuario);
      return mostrarMensaje('No se pudo verificar el usuario.', 'error');
    }

    if (usuarioExistente) {
      return mostrarMensaje(`El usuario "${usuario}" ya existe. Elegí otro.`, 'error');
    }

    const { data: personaExistente, error: errorPersona } = await supabase
      .from(tabla)
      .select('dni')
      .eq('dni', dni)
      .maybeSingle();

    if (errorPersona) {
      console.error(errorPersona);
      return mostrarMensaje('No se pudo verificar el DNI.', 'error');
    }

    if (personaExistente) {
      return mostrarMensaje(`Ya existe un ${ROLES[rol].etiqueta.toLowerCase()} con el DNI ${dni}.`, 'error');
    }

    // ---- Crear la persona ----
    const persona = { dni, nombre, apellido };

    if (rol === 'alumno') {
      persona.id_curso = Number(idCursoAlumno);
    }

    const { error: errorInsertPersona } = await supabase.from(tabla).insert([persona]);

    if (errorInsertPersona) {
      console.error('Error al crear la persona:', errorInsertPersona);
      return mostrarMensaje('No se pudo crear la persona.', 'error');
    }

    // ---- Crear el usuario para iniciar sesión ----
    const { error: errorInsertUsuario } = await supabase
      .from('usuarios')
      .insert([{ usuario, password, rol, dni }]);

    if (errorInsertUsuario) {
      console.error('Error al crear el usuario:', errorInsertUsuario);
      await supabase.from(tabla).delete().eq('dni', dni); // se deshace la persona
      return mostrarMensaje('No se pudo crear el usuario de acceso. No se guardó nada.', 'error');
    }

    // ---- Cursos / materias según el rol ----
    let detalle = '';

    try {
      if (rol === 'preceptor' && idsCursos.length > 0) {
        const { error } = await supabase
          .from('preceptor_curso')
          .insert(idsCursos.map((id) => ({ dni_preceptor: dni, id_curso: id })));

        if (error) throw error;

        detalle = ` Cursos asignados: ${idsCursos.length}.`;
      }

      if (rol === 'docente' && idMateria && idsCursos.length > 0) {
        const resultado = await asignarDocenteLibre(dni, Number(idMateria), idsCursos);

        if (resultado.asignados.length > 0) {
          detalle += ` Asignado en: ${resultado.asignados.join(', ')}.`;
        }

        if (resultado.ocupados.length > 0) {
          detalle += ` No se asignó en: ${resultado.ocupados.join('; ')}.`;
        }
      }
    } catch (error) {
      console.error('Error al asignar cursos:', error);
      mostrarMensaje(
        `${ROLES[rol].etiqueta} creado, pero no se pudieron asignar los cursos. Asignalos desde "Registrar materia".`,
        'error'
      );
      form.reset();
      actualizarCamposPorRol();
      await recargarTodo();
      return;
    }

    form.reset();
    actualizarCamposPorRol();

    mostrarMensaje(
      `${ROLES[rol].etiqueta} ${nombre} ${apellido} creado. Usuario: ${usuario}.${detalle}`
    );

    await recargarTodo();
  });
}

// =====================================================
// REGISTRAR MATERIA / ASIGNAR DOCENTE
// =====================================================

function configurarFormularioMateria() {
  const form = document.querySelector('#registrar-materia-form');

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nombre = document.querySelector('#materia-nombre').value.trim().replace(/\s+/g, ' ');
    const cursoElegido = document.querySelector('#materia-curso').value;
    const dniDocente = document.querySelector('#materia-docente').value;

    if (!nombre) {
      return mostrarMensaje('Escribí el nombre de la materia.', 'error');
    }

    if (!cursoElegido) {
      return mostrarMensaje('Elegí un curso.', 'error');
    }

    try {
      let materia = materias.find((m) => normalizar(m.nombre) === normalizar(nombre));
      let creada = false;

      if (!materia) {
        const { data, error } = await supabase
          .from('materia')
          .insert([{ nombre }])
          .select('id, nombre')
          .single();

        if (error) throw error;

        materia = data;
        creada = true;
      }

      // Todos los cursos tienen la misma materia (los que falten, sin docente).
      const resultado = await asegurarDictados(materia.id);

      if (resultado.error) throw resultado.error;

      let detalle = '';

      if (dniDocente) {
        const objetivos = cursoElegido === 'todos' ? cursos.map((c) => c.id) : [Number(cursoElegido)];

        const { error } = await supabase
          .from('dictado')
          .update({ dni_docente: Number(dniDocente) })
          .eq('id_materia', materia.id)
          .in('id_curso', objetivos);

        if (error) throw error;

        const doc = docentes.find((d) => d.dni === Number(dniDocente));
        const lugar = cursoElegido === 'todos'
          ? 'todos los cursos'
          : cursos.find((c) => c.id === Number(cursoElegido))?.nombre;

        detalle = ` Docente ${doc?.nombre ?? ''} ${doc?.apellido ?? ''} asignado en ${lugar}.`;
      }

      form.reset();

      mostrarMensaje(
        `${creada ? 'Materia creada en todos los cursos' : 'Materia existente'}: ${materia.nombre}.${detalle}`
      );

      await recargarTodo();
    } catch (error) {
      console.error('Error al registrar la materia:', error);
      mostrarMensaje('No se pudo registrar la materia. Revisá la consola.', 'error');
    }
  });
}

// =====================================================
// RECARGA GENERAL E INICIO
// =====================================================

async function recargarTodo() {
  await cargarCatalogos();
  refrescarSelects();
  await cargarResumen();
  await cargarVistaCurso();
  await buscarPersonas();
}

function configurarEventos() {
  document.querySelector('#buscar-tipo').addEventListener('change', buscarPersonas);

  document.querySelector('#buscar-texto').addEventListener('input', () => {
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(buscarPersonas, 250);
  });

  document.querySelector('#buscar-form').addEventListener('submit', (event) => event.preventDefault());
  document.querySelector('#curso-filtro-form').addEventListener('submit', (event) => event.preventDefault());
  document.querySelector('#curso-filtro').addEventListener('change', cargarVistaCurso);

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

async function inicializarAdministradorPanel() {
  configurarEventos();
  configurarFormularioCurso();
  configurarFormularioUsuario();
  configurarFormularioMateria();

  await cargarPerfilAdmin();
  await recargarTodo();

  console.log('Panel administrador inicializado correctamente.');
}

document.addEventListener('DOMContentLoaded', inicializarAdministradorPanel);