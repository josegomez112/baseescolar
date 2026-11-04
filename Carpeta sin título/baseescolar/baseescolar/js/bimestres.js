// =====================================================
// CALENDARIO DE BIMESTRES Y CÁLCULO DE PROMEDIOS
// Lo usan los paneles de alumno y docente.
//
// Reglas del año escolar (se calculan solas para cada año):
//  - Las clases empiezan el primer día hábil de marzo.
//  - Hay una pausa de invierno de 2 semanas (10 días hábiles) justo antes
//    del primer día hábil de agosto, que es cuando se retoman las clases.
//  - Las clases terminan el último día hábil de noviembre.
//  - 1° Bimestre: marzo y abril.
//  - 2° Bimestre: mayo hasta la pausa de invierno.
//  - 3° Bimestre: agosto y septiembre.
//  - 4° Bimestre: octubre y noviembre.
// "Día hábil" = lunes a viernes (no se cargan feriados).
// =====================================================

export const NOTAS_POR_BIMESTRE = 3;
export const NOTA_APROBACION = 6;
export const DIAS_PAUSA_INVIERNO = 10;

// ---------- Fechas ----------

export function fechaLocalISO(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function esHabil(fecha) {
  const dia = fecha.getDay();
  return dia !== 0 && dia !== 6;
}

function primerDiaHabil(anio, mes) {
  const fecha = new Date(anio, mes, 1);

  while (!esHabil(fecha)) {
    fecha.setDate(fecha.getDate() + 1);
  }

  return fecha;
}

function ultimoDiaHabil(anio, mes) {
  const fecha = new Date(anio, mes + 1, 0);

  while (!esHabil(fecha)) {
    fecha.setDate(fecha.getDate() - 1);
  }

  return fecha;
}

function retrocederDiasHabiles(fecha, cantidad) {
  const resultado = new Date(fecha);
  let contados = 0;

  while (contados < cantidad) {
    resultado.setDate(resultado.getDate() - 1);

    if (esHabil(resultado)) {
      contados += 1;
    }
  }

  return resultado;
}

function sumarUnDiaHabil(fecha) {
  const resultado = new Date(fecha);

  do {
    resultado.setDate(resultado.getDate() + 1);
  } while (!esHabil(resultado));

  return resultado;
}

// ---------- Calendario ----------

/** Los 4 bimestres de un año: [{ numero, inicio, fin }] con fechas 'YYYY-MM-DD'. */
export function calendarioBimestres(anio) {
  const reinicio = primerDiaHabil(anio, 7); // agosto
  const ultimoDiaAntesDePausa = retrocederDiasHabiles(reinicio, DIAS_PAUSA_INVIERNO + 1);

  return [
    { numero: 1, inicio: fechaLocalISO(primerDiaHabil(anio, 2)), fin: fechaLocalISO(ultimoDiaHabil(anio, 3)) },
    { numero: 2, inicio: fechaLocalISO(primerDiaHabil(anio, 4)), fin: fechaLocalISO(ultimoDiaAntesDePausa) },
    { numero: 3, inicio: fechaLocalISO(reinicio), fin: fechaLocalISO(ultimoDiaHabil(anio, 8)) },
    { numero: 4, inicio: fechaLocalISO(primerDiaHabil(anio, 9)), fin: fechaLocalISO(ultimoDiaHabil(anio, 10)) }
  ];
}

/** Pausa de invierno de un año: { inicio, fin }. */
export function pausaInvernal(anio) {
  const bimestre2 = calendarioBimestres(anio)[1];
  const reinicio = calendarioBimestres(anio)[2].inicio;

  const [a, m, d] = bimestre2.fin.split('-').map(Number);
  const primerDia = sumarUnDiaHabil(new Date(a, m - 1, d));

  const [ar, mr, dr] = reinicio.split('-').map(Number);
  const ultimoDia = retrocederDiasHabiles(new Date(ar, mr - 1, dr), 1);

  return { inicio: fechaLocalISO(primerDia), fin: fechaLocalISO(ultimoDia) };
}

/** Bimestre (1 a 4) al que corresponde una fecha 'YYYY-MM-DD'. */
export function bimestreDeFecha(fechaISO) {
  const anio = Number(String(fechaISO).slice(0, 4));
  const calendario = calendarioBimestres(anio);

  if (fechaISO < calendario[0].inicio) return 1;

  for (const bimestre of calendario) {
    if (fechaISO >= bimestre.inicio && fechaISO <= bimestre.fin) return bimestre.numero;
  }

  // Pausas y fines de semana entre bimestres: sigue valiendo el anterior.
  let ultimo = 1;

  for (const bimestre of calendario) {
    if (fechaISO > bimestre.fin) ultimo = bimestre.numero;
  }

  return ultimo;
}

export function bimestreActual(hoy = new Date()) {
  return bimestreDeFecha(fechaLocalISO(hoy));
}

function formatoCorto(fechaISO) {
  const [, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}`;
}

/** Texto para mostrar: "3° Bimestre (03/08 al 30/09)". */
export function etiquetaBimestre(numero, anio = new Date().getFullYear()) {
  const bimestre = calendarioBimestres(anio)[numero - 1];

  return `${numero}° Bimestre (${formatoCorto(bimestre.inicio)} al ${formatoCorto(bimestre.fin)})`;
}

// ---------- Promedios ----------

function redondear(numero) {
  return Math.round(numero * 100) / 100;
}

/** Promedio de una lista de números (2 decimales) o null si no hay notas. */
export function promedio(valores) {
  const lista = valores.map(Number).filter((n) => !Number.isNaN(n));

  if (lista.length === 0) return null;

  return redondear(lista.reduce((suma, n) => suma + n, 0) / lista.length);
}

/** 6 o más: Aprobado. Menos de 6: Desaprobado. */
export function estadoDePromedio(valor) {
  if (valor === null || valor === undefined) return 'Sin notas';

  return valor >= NOTA_APROBACION ? 'Aprobado' : 'Desaprobado';
}

/** Solo las notas cuya fecha pertenece al año indicado. */
export function notasDelAnio(notas, anio = new Date().getFullYear()) {
  return notas.filter((n) => String(n.fecha ?? '').startsWith(String(anio)));
}

/**
 * Promedio general: promedio de los promedios de cada materia en cada bimestre.
 * Recibe filas con { id_materia, bimestre, nota }.
 */
export function promedioGeneral(notas) {
  const grupos = new Map();

  notas.forEach((n) => {
    const clave = `${n.id_materia}-${n.bimestre}`;
    const lista = grupos.get(clave) || [];
    lista.push(n.nota);
    grupos.set(clave, lista);
  });

  return promedio([...grupos.values()].map((lista) => promedio(lista)));
}

// ---------- Asistencia por bimestre ----------

// Faltas injustificadas que se toleran por bimestre. Con 6 o más, el alumno
// deja de ser regular en ese bimestre.
export const FALTAS_MAXIMAS_POR_BIMESTRE = 5;

/** Fecha 'YYYY-MM-DD' de las asistencias que caen en un bimestre de un año. */
export function asistenciasDelBimestre(asistencias, bimestre, anio = new Date().getFullYear()) {
  return asistencias.filter((a) => {
    const fecha = String(a.fecha ?? '');
    return fecha.startsWith(String(anio)) && bimestreDeFecha(fecha) === bimestre;
  });
}

/**
 * Resumen de un bimestre. Solo el estado "Ausente" cuenta como falta;
 * las llegadas tarde no suman. Una falta justificada no cuenta para el límite.
 */
export function resumenAsistencias(asistencias) {
  const presentes = asistencias.filter((a) => a.estado === 'Presente').length;
  const tardes = asistencias.filter((a) => a.estado === 'Tarde').length;
  const faltas = asistencias.filter((a) => a.estado === 'Ausente');
  const justificadas = faltas.filter((a) => a.justificada).length;
  const injustificadas = faltas.length - justificadas;

  return {
    presentes,
    tardes,
    faltas: faltas.length,
    justificadas,
    injustificadas,
    restantes: Math.max(0, FALTAS_MAXIMAS_POR_BIMESTRE - injustificadas),
    regular: injustificadas <= FALTAS_MAXIMAS_POR_BIMESTRE
  };
}

export function estadoPorFaltas(resumen) {
  return resumen.regular ? 'Regular' : 'No regular';
}

// ---------- Diseño compartido (cuadros, botones y ventanas) ----------

const CSS_COMPARTIDO = `
.cuadro-resumen { border:1px solid #d0d5dd; border-radius:12px; padding:14px; margin:12px 0; }
.cuadro-resumen .cuadro-fila { display:flex; flex-wrap:wrap; gap:10px; }
.cuadro-resumen .cuadro-item { flex:1 1 90px; min-width:90px; text-align:center; border:1px solid #e4e7ec; border-radius:10px; padding:8px 6px; }
.cuadro-resumen .cuadro-numero { font-size:1.5rem; font-weight:700; }
.cuadro-resumen .cuadro-etiqueta { font-size:.8rem; opacity:.75; }
.cuadro-resumen .cuadro-estado { margin-top:12px; padding:10px 12px; border-radius:10px; font-weight:600; }
.cuadro-estado.ok { background:#eafaf3; color:#1f7a52; }
.cuadro-estado.error { background:#fdecec; color:#b42318; }
.cuadro-estado.aviso { background:#fffaeb; color:#b54708; }
.btn-suave { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:999px; padding:4px 12px; font-size:.85rem; cursor:pointer; }
.btn-suave:hover { background:#dbeafe; }
.btn-principal { background:#2563eb; color:#fff; border:1px solid #2563eb; border-radius:8px; padding:8px 18px; cursor:pointer; }
.btn-principal:hover { background:#1d4ed8; }
dialog.dlg-gestion { border:none; border-radius:16px; padding:0; width:min(440px,92vw); box-shadow:0 20px 50px rgba(0,0,0,.3); }
dialog.dlg-gestion::backdrop { background:rgba(15,23,42,.5); }
.dlg-gestion .dlg-titulo { margin:0; padding:16px 20px; border-bottom:1px solid #e4e7ec; font-size:1.05rem; }
.dlg-gestion .dlg-cuerpo { padding:16px 20px; }
.dlg-gestion .dlg-pie { display:flex; gap:8px; justify-content:flex-end; padding:12px 20px 18px; }
.dlg-gestion label.opcion { display:flex; align-items:center; gap:10px; margin:8px 0; padding:10px 12px; border:1px solid #d0d5dd; border-radius:10px; cursor:pointer; }
.dlg-gestion label.opcion:has(input:checked) { border-color:#2563eb; background:#eff6ff; }
.dlg-gestion input[type=text] { width:100%; box-sizing:border-box; padding:9px 10px; border:1px solid #d0d5dd; border-radius:8px; }
.dlg-gestion .dlg-error { color:#b42318; margin:6px 0 0; min-height:1.2em; font-size:.9rem; }
.dlg-gestion .dlg-texto { white-space:pre-wrap; overflow-wrap:anywhere; margin:0; line-height:1.5; }
`;

function inyectarEstilos() {
  if (document.getElementById('estilos-compartidos-gestion')) return;

  const estilo = document.createElement('style');
  estilo.id = 'estilos-compartidos-gestion';
  estilo.textContent = CSS_COMPARTIDO;
  document.head.appendChild(estilo);
}

/** Botón chico y discreto (por ejemplo "Ver motivo"). */
export function botonSuave(texto, alHacerClick) {
  inyectarEstilos();

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'btn-suave';
  boton.textContent = texto;
  boton.addEventListener('click', alHacerClick);
  return boton;
}

/**
 * Cuadro con casilleros de números y una franja de estado.
 * items: [[titulo, valor], ...]  tipo: 'ok' | 'error' | 'aviso'
 */
export function crearCuadroResumen(contenedor, items, mensaje, tipo = 'ok') {
  inyectarEstilos();

  contenedor.innerHTML = '';
  contenedor.className = 'cuadro-resumen';

  const fila = document.createElement('div');
  fila.className = 'cuadro-fila';

  items.forEach(([titulo, valor]) => {
    const item = document.createElement('div');
    item.className = 'cuadro-item';

    const numero = document.createElement('div');
    numero.className = 'cuadro-numero';
    numero.textContent = valor;

    const etiqueta = document.createElement('div');
    etiqueta.className = 'cuadro-etiqueta';
    etiqueta.textContent = titulo;

    item.append(numero, etiqueta);
    fila.appendChild(item);
  });

  const estado = document.createElement('div');
  estado.className = `cuadro-estado ${tipo}`;
  estado.textContent = mensaje;

  contenedor.append(fila, estado);
}

/** Crea una ventana (<dialog>) con título, cuerpo y pie ya diseñados. */
export function crearVentana(titulo) {
  inyectarEstilos();

  const dialogo = document.createElement('dialog');
  dialogo.className = 'dlg-gestion';

  const encabezado = document.createElement('h3');
  encabezado.className = 'dlg-titulo';
  encabezado.textContent = titulo;

  const cuerpo = document.createElement('div');
  cuerpo.className = 'dlg-cuerpo';

  const pie = document.createElement('div');
  pie.className = 'dlg-pie';

  dialogo.append(encabezado, cuerpo, pie);
  dialogo.addEventListener('close', () => dialogo.remove());

  return { dialogo, cuerpo, pie };
}

export function botonPrincipal(texto, tipo = 'button') {
  inyectarEstilos();

  const boton = document.createElement('button');
  boton.type = tipo;
  boton.className = 'btn-principal';
  boton.textContent = texto;
  return boton;
}

/** Abre una ventana centrada con el título y el texto completo (por ejemplo, el motivo de una falta). */
export function mostrarMotivo(titulo, texto) {
  const { dialogo, cuerpo, pie } = crearVentana(titulo);

  const parrafo = document.createElement('p');
  parrafo.className = 'dlg-texto';
  parrafo.textContent = texto || 'Sin motivo indicado.';
  cuerpo.appendChild(parrafo);

  const cerrar = botonPrincipal('Cerrar');
  cerrar.addEventListener('click', () => dialogo.close());
  pie.appendChild(cerrar);

  document.body.appendChild(dialogo);
  dialogo.showModal();
}