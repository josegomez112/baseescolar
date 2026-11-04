// =====================================================
// MENÚ COMPARTIDO DE LOS PANELES
// Cada panel le pasa su rol y sus opciones; este archivo:
//  1. Verifica que haya una sesión del rol correcto (si no, redirige).
//  2. Arma el menú lateral.
//  3. Muestra una sola sección por vez y resalta la opción actual.
//  4. Agrega "Accesos rápidos" en el Inicio.
// =====================================================

const PAGINAS = {
  alumno: 'alumno.html',
  docente: 'docente.html',
  preceptor: 'preceptor.html',
  administrador: 'administrador.html'
};

const ESTILOS = `
  .sidebar-menu li { transition: background 0.15s ease; }
  .sidebar-menu li:hover { background: rgba(255, 255, 255, 0.08); }
  .sidebar-menu li.menu-activo {
    background: rgba(255, 255, 255, 0.14);
    box-shadow: inset 4px 0 0 #5aa9ff;
  }
  .sidebar-menu li.menu-activo a { font-weight: 600; color: #ffffff; }
  .sidebar-menu li.menu-salir {
    margin-top: 18px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.18);
  }
  .accesos-grid { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 14px; }
  .acceso-rapido {
    flex: 1 1 220px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: left;
    padding: 16px;
    background: #ffffff;
    color: #1b2a41;
    border: 1px solid #dbe3ee;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(27, 42, 65, 0.06);
    cursor: pointer;
    transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  }
  .acceso-rapido:hover {
    border-color: #1e73d8;
    box-shadow: 0 4px 14px rgba(30, 115, 216, 0.18);
    transform: translateY(-1px);
  }
  .acceso-rapido strong { font-size: 1rem; }
  .acceso-rapido span { font-size: 0.88rem; color: #5b6b82; font-weight: normal; }
`;

function leerSesion(clave) {
  try {
    return sessionStorage.getItem(clave);
  } catch (error) {
    return null;
  }
}

export function cerrarSesion() {
  try {
    sessionStorage.clear();
  } catch (error) {
    // Sin acceso a sessionStorage: se ignora.
  }

  window.location.href = 'index.html';
}

/**
 * @param {Object} config
 * @param {string} config.rol  Rol que puede ver este panel.
 * @param {Array}  config.items  Opciones del menú:
 *   { id, texto, secciones: [ids de <section>], descripcion?, rapido? }
 *   y al final { id: 'salir', texto: 'Cerrar sesión', accion: 'salir' }.
 */
export function iniciarMenu({ rol, items }) {
  // ---- 1. Protección: solo entra quien inició sesión con este rol ----
  const rolSesion = leerSesion('rol');

  if (rolSesion !== rol) {
    window.location.replace(PAGINAS[rolSesion] || 'index.html');
    return;
  }

  const lista = document.querySelector('.sidebar-menu');
  const main = document.querySelector('#main-content');

  if (!lista || !main) {
    console.error('menu.js: no se encontró el menú lateral o el contenido principal.');
    return;
  }

  const estilo = document.createElement('style');
  estilo.textContent = ESTILOS;
  document.head.appendChild(estilo);

  const opciones = items.filter((item) => item.accion !== 'salir');

  // ---- 2. Accesos rápidos (se ven solo en Inicio) ----
  const rapidos = opciones.filter((item) => item.id !== 'inicio' && item.rapido !== false);

  if (rapidos.length > 0) {
    const accesos = document.createElement('section');
    accesos.id = 'accesos-rapidos';
    accesos.className = 'data-section';

    const titulo = document.createElement('h3');
    titulo.textContent = 'Accesos rápidos';
    accesos.appendChild(titulo);

    const grid = document.createElement('div');
    grid.className = 'accesos-grid';

    rapidos.forEach((item) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'acceso-rapido';

      const nombre = document.createElement('strong');
      nombre.textContent = item.texto;
      boton.appendChild(nombre);

      if (item.descripcion) {
        const detalle = document.createElement('span');
        detalle.textContent = item.descripcion;
        boton.appendChild(detalle);
      }

      boton.addEventListener('click', () => {
        window.location.hash = `ir-${item.id}`;
      });

      grid.appendChild(boton);
    });

    accesos.appendChild(grid);

    const resumen = main.querySelector('#summary-section');

    if (resumen) {
      resumen.insertAdjacentElement('afterend', accesos);
    } else {
      main.appendChild(accesos);
    }
  }

  // ---- 3. Menú lateral ----
  const elementos = new Map();

  lista.innerHTML = '';

  items.forEach((item) => {
    const li = document.createElement('li');
    const enlace = document.createElement('a');

    enlace.textContent = item.texto;

    if (item.accion === 'salir') {
      enlace.href = '#';
      li.className = 'menu-salir';
      enlace.addEventListener('click', (event) => {
        event.preventDefault();
        cerrarSesion();
      });
    } else {
      enlace.href = `#ir-${item.id}`;
      elementos.set(item.id, li);
    }

    li.appendChild(enlace);
    lista.appendChild(li);
  });

  // ---- 4. Una sección a la vez ----
  const secciones = [...main.children].filter((hijo) => hijo.tagName === 'SECTION');

  function mostrar(idItem) {
    const item = opciones.find((o) => o.id === idItem) || opciones[0];

    const visibles = new Set(item.secciones || []);

    if (item.id === 'inicio') {
      visibles.add('accesos-rapidos');
    }

    secciones.forEach((seccion) => {
      seccion.style.display = visibles.has(seccion.id) ? '' : 'none';
    });

    elementos.forEach((li, id) => li.classList.toggle('menu-activo', id === item.id));

    window.scrollTo({ top: 0 });

    return item.id;
  }

  function idDesdeHash() {
    return window.location.hash.startsWith('#ir-') ? window.location.hash.slice(4) : '';
  }

  const inicial = mostrar(idDesdeHash());
  history.replaceState(null, '', `#ir-${inicial}`);

  window.addEventListener('hashchange', () => mostrar(idDesdeHash()));
}