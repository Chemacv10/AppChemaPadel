/**
 * ============================================================
 * MÓDULO EJERCICIOS – Chema Pádel V2
 * Crear, editar, eliminar, filtrar ejercicios.
 * 25 ejercicios precargados. Categorías/Tipos/Materiales configurables.
 * Importar/Exportar JSON. Fecha de último uso automática.
 * ============================================================
 */

// ── Estado ───────────────────────────────────────────────────
let editandoId   = null;
let filtroCat    = '';
let filtroNivel  = '';

// ── Valores por defecto configurables ───────────────────────
const DEFAULT_CATEGORIAS = ['Calentamiento', 'Carritos', 'Situaciones', 'Partiditos'];
const DEFAULT_TIPOS      = ['Ataque', 'Defensa', 'Volea', 'Saque', 'Resto', 'Remate', 'Globo', 'Táctica', 'Físico', 'Técnica básica'];
const DEFAULT_MATERIALES = ['Pelotas', 'Conos', 'Aros', 'Picas', 'Canasta', 'Red', 'Escalera coordinación'];

// ── Iconos y colores por categoría ───────────────────────────
const CAT_ESTILOS = {
  'Calentamiento': { icon: '🏃', clase: 'cat-calentamiento' },
  'Carritos':      { icon: '🎯', clase: 'cat-carritos'      },
  'Situaciones':   { icon: '⚡', clase: 'cat-situaciones'   },
  'Partiditos':    { icon: '🏆', clase: 'cat-partiditos'    },
};

// ── 25 ejercicios precargados ────────────────────────────────
const EJERCICIOS_INICIALES = [
  // CALENTAMIENTO (5)
  { nombre: 'Movilidad articular', categoria: 'Calentamiento', tipo: 'Físico', nivel: 'Ninguno', duracion: '5 min', jugadores: '4+', material: [], desc: 'Rotaciones de muñecas, hombros, caderas y tobillos. Movimientos suaves para activar las articulaciones antes del ejercicio.' },
  { nombre: 'Carrera lateral con cambio de dirección', categoria: 'Calentamiento', tipo: 'Físico', nivel: 'Ninguno', duracion: '5 min', jugadores: '4+', material: ['Conos'], desc: 'Carrera lateral entre conos separados 4-5 metros. Cambiar de dirección al llegar a cada cono. 3 series.' },
  { nombre: 'Peloteo suave desde la red', categoria: 'Calentamiento', tipo: 'Técnica básica', nivel: 'Ninguno', duracion: '10 min', jugadores: '4', material: ['Pelotas'], desc: 'Peloteo tranquilo desde la red para calentar el golpeo. Sin fuerza, controlando el contacto.' },
  { nombre: 'Globos al fondo', categoria: 'Calentamiento', tipo: 'Globo', nivel: 'Principiante', duracion: '10 min', jugadores: '4', material: ['Pelotas'], desc: 'Un jugador lanza globos al fondo, el contrario devuelve. Ritmo tranquilo para calentar hombros y piernas.' },
  { nombre: 'Skipping y saltos', categoria: 'Calentamiento', tipo: 'Físico', nivel: 'Ninguno', duracion: '5 min', jugadores: '4+', material: [], desc: 'Skipping en el sitio, saltos verticales y laterales. Activación del tren inferior.' },

  // CARRITOS (6)
  { nombre: 'Carrito de derecha al centro', categoria: 'Carritos', tipo: 'Técnica básica', nivel: 'Principiante', duracion: '15 min', jugadores: '1', material: ['Pelotas', 'Canasta'], desc: 'Entrenador lanza bolas al lado de la derecha. Alumno golpea derecha dirigida al centro. Serie de 20 bolas.' },
  { nombre: 'Carrito de revés cruzado', categoria: 'Carritos', tipo: 'Técnica básica', nivel: 'Principiante', duracion: '15 min', jugadores: '1', material: ['Pelotas', 'Canasta'], desc: 'Bolas al lado de revés. Golpeo cruzado con control. Trabajar el giro de cadera.' },
  { nombre: 'Carrito de volea alta-baja', categoria: 'Carritos', tipo: 'Volea', nivel: 'Intermedio', duracion: '15 min', jugadores: '1', material: ['Pelotas', 'Canasta'], desc: 'Alternar volea alta y baja desde la red. Trabajar la flexión de rodillas en la baja.' },
  { nombre: 'Carrito de remates', categoria: 'Carritos', tipo: 'Remate', nivel: 'Intermedio', duracion: '15 min', jugadores: '1', material: ['Pelotas', 'Canasta'], desc: 'Bolas lanzadas en globo. Alumno se posiciona y ejecuta remate controlado. Trabajar la colocación.' },
  { nombre: 'Carrito de bandeja', categoria: 'Carritos', tipo: 'Remate', nivel: 'Intermedio', duracion: '15 min', jugadores: '1', material: ['Pelotas', 'Canasta'], desc: 'Globos a media altura. Practicar la bandeja manteniendo posición en red.' },
  { nombre: 'Carrito combinado D+R alternos', categoria: 'Carritos', tipo: 'Técnica básica', nivel: 'Avanzado', duracion: '20 min', jugadores: '1', material: ['Pelotas', 'Canasta'], desc: 'Alternar bolas de derecha y revés. Trabajar el desplazamiento y recuperación de posición central.' },

  // SITUACIONES (8)
  { nombre: 'Ataque red vs defensa fondo', categoria: 'Situaciones', tipo: 'Ataque', nivel: 'Intermedio', duracion: '15 min', jugadores: '4', material: ['Pelotas'], desc: 'Pareja en red ataca. Pareja en fondo defiende. Punto a punto. Rotar cada 5 puntos.' },
  { nombre: 'Liftado fondo vs volea red', categoria: 'Situaciones', tipo: 'Defensa', nivel: 'Intermedio', duracion: '15 min', jugadores: '4', material: ['Pelotas'], desc: 'Jugadores de fondo intentan pasar con liftados. Red debe manejar las bolas rápidas. 5 puntos y rotar.' },
  { nombre: 'Globo o passing shot', categoria: 'Situaciones', tipo: 'Táctica', nivel: 'Avanzado', duracion: '20 min', jugadores: '4', material: ['Pelotas'], desc: 'Situación: pareja sube a red. Los de fondo deciden: globo o passing. Trabajar la toma de decisión.' },
  { nombre: 'El muro: 2 vs 1', categoria: 'Situaciones', tipo: 'Defensa', nivel: 'Avanzado', duracion: '20 min', jugadores: '3', material: ['Pelotas'], desc: 'Dos atacan contra un defensor. El defensor trabaja la resistencia y el passing. Rotar cada 3 puntos.' },
  { nombre: 'Saque y red', categoria: 'Situaciones', tipo: 'Saque', nivel: 'Intermedio', duracion: '15 min', jugadores: '4', material: ['Pelotas'], desc: 'Punto empieza con saque. El que saca sube a red. Practicar la transición saque-red.' },
  { nombre: 'Punto corto: solo fondo', categoria: 'Situaciones', tipo: 'Táctica', nivel: 'Principiante', duracion: '15 min', jugadores: '4', material: ['Pelotas'], desc: 'Juego solo desde la línea de fondo hacia arriba. Ideal para principiantes. Trabajar control y profundidad.' },
  { nombre: 'Diagonal cruzada', categoria: 'Situaciones', tipo: 'Ataque', nivel: 'Intermedio', duracion: '15 min', jugadores: '4', material: ['Pelotas'], desc: 'Solo se permite jugar cruzado. Punto normal pero obligatoriamente en diagonal. Control y dirección.' },
  { nombre: 'El punto de la muerte', categoria: 'Situaciones', tipo: 'Táctica', nivel: 'Avanzado', duracion: '20 min', jugadores: '4', material: ['Pelotas'], desc: 'Situación de presión: si pierdes el punto, cambias. El ganador se queda en pista. Alta intensidad.' },

  // PARTIDITOS (6)
  { nombre: 'Partido a 16 puntos', categoria: 'Partiditos', tipo: 'Táctica', nivel: 'Ninguno', duracion: '20 min', jugadores: '4', material: ['Pelotas'], desc: 'Partido normal hasta 16 puntos. Rápido y competitivo. Permite jugar más partidos en poco tiempo.' },
  { nombre: 'Partido con regla del globo', categoria: 'Partiditos', tipo: 'Táctica', nivel: 'Intermedio', duracion: '20 min', jugadores: '4', material: ['Pelotas'], desc: 'Partido normal pero cada pareja debe hacer mínimo 1 globo por punto ganado. Obliga a usarlo.' },
  { nombre: 'Partido americano exprés', categoria: 'Partiditos', tipo: 'Táctica', nivel: 'Ninguno', duracion: '30 min', jugadores: '4', material: ['Pelotas'], desc: 'Americano rápido entre los 4. Parejas rotan, puntuación individual. Jugar a 8 puntos por partido.' },
  { nombre: 'Partido con comodín', categoria: 'Partiditos', tipo: 'Táctica', nivel: 'Principiante', duracion: '20 min', jugadores: '3', material: ['Pelotas'], desc: 'Tres jugadores: uno solo vs pareja. El solo tiene todo el campo. El solo anota doble si gana el punto.' },
  { nombre: 'Tie-break solo', categoria: 'Partiditos', tipo: 'Táctica', nivel: 'Ninguno', duracion: '15 min', jugadores: '4', material: ['Pelotas'], desc: 'Jugar directamente tie-breaks a 7. Máxima presión desde el primer punto. Ideal para trabajar mentalidad.' },
  { nombre: 'Partido con desventaja', categoria: 'Partiditos', tipo: 'Táctica', nivel: 'Ninguno', duracion: '20 min', jugadores: '4', material: ['Pelotas'], desc: 'La pareja mejor empieza perdiendo 0-8. Equilibrar niveles y trabajar la remontada.' },
];

// ── Helpers de configuración ─────────────────────────────────
function getConfig() {
  const db = loadDB();
  if (!db.config) {
    db.config = {
      categorias: [...DEFAULT_CATEGORIAS],
      tipos:      [...DEFAULT_TIPOS],
      materiales: [...DEFAULT_MATERIALES]
    };
  }
  return db.config;
}

function saveConfig(config) {
  const db = loadDB();
  db.config = config;
  saveDB(db);
}

// ── Toast ─────────────────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, tipo = 'toast-success') {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className = `show ${tipo}`;
  toastTimer = setTimeout(() => { toastEl.className = ''; }, 2800);
}

// ── Precarga ejercicios iniciales ────────────────────────────
function precargarSiVacio() {
  const db = loadDB();
  if (db.ejercicios && db.ejercicios.length > 0) return;

  db.ejercicios = EJERCICIOS_INICIALES.map(e => ({
    id:          generarId('ej'),
    nombre:      e.nombre,
    descripcion: e.desc,
    categoria:   e.categoria,
    tipo:        e.tipo,
    nivel:       e.nivel,
    duracion:    e.duracion,
    jugadores:   e.jugadores,
    material:    e.material,
    ultimoUso:   null,
    creadoEn:    new Date().toISOString()
  }));

  // Asegurar config inicial
  if (!db.config) {
    db.config = {
      categorias: [...DEFAULT_CATEGORIAS],
      tipos:      [...DEFAULT_TIPOS],
      materiales: [...DEFAULT_MATERIALES]
    };
  }

  saveDB(db);
  showToast('✅ 25 ejercicios precargados', 'toast-info');
}

// ── Filtros de categoría ─────────────────────────────────────
function renderFilterCat() {
  const config  = getConfig();
  const barEl   = document.getElementById('filterCat');

  barEl.innerHTML = `<button class="filter-chip ${filtroCat === '' ? 'active' : ''}" onclick="setFiltroCat(this,'')">Todas</button>` +
    config.categorias.map(c =>
      `<button class="filter-chip ${filtroCat === c ? 'active' : ''}" onclick="setFiltroCat(this,'${escHtml(c)}')">${getCatIcon(c)} ${escHtml(c)}</button>`
    ).join('');
}

function setFiltroCat(el, cat) {
  filtroCat = cat;
  document.querySelectorAll('#filterCat .filter-chip').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderLista();
}

function setFiltroNivel(el, nivel) {
  filtroNivel = nivel;
  document.querySelectorAll('#filterNivel .filter-chip').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderLista();
}

function getCatIcon(cat) {
  return CAT_ESTILOS[cat]?.icon || '📌';
}

function getCatClase(cat) {
  return CAT_ESTILOS[cat]?.clase || 'cat-otro';
}

// ── Modal Ejercicio ───────────────────────────────────────────
function abrirModal(ejId = null) {
  editandoId = ejId;
  const config = getConfig();
  const db     = loadDB();

  // Poblar selectores
  const selCat  = document.getElementById('fCategoria');
  const selTipo = document.getElementById('fTipo');
  const selMat  = document.getElementById('fMaterial');

  selCat.innerHTML  = config.categorias.map(c => `<option value="${escHtml(c)}">${escHtml(c)}</option>`).join('');
  selTipo.innerHTML = config.tipos.map(t => `<option value="${escHtml(t)}">${escHtml(t)}</option>`).join('');
  selMat.innerHTML  = config.materiales.map(m => `<option value="${escHtml(m)}">${escHtml(m)}</option>`).join('');

  if (ejId) {
    const ej = db.ejercicios.find(e => e.id === ejId);
    if (!ej) return;
    document.getElementById('modalTitle').textContent  = 'Editar Ejercicio';
    document.getElementById('btnGuardar').textContent  = 'Guardar cambios';
    document.getElementById('fNombre').value    = ej.nombre;
    document.getElementById('fDesc').value      = ej.descripcion || '';
    selCat.value                                = ej.categoria;
    selTipo.value                               = ej.tipo;
    document.getElementById('fNivel').value     = ej.nivel;
    document.getElementById('fDuracion').value  = ej.duracion || '';
    document.getElementById('fJugadores').value = ej.jugadores || '';
    document.getElementById('fVideoUrl').value  = ej.videoUrl || '';
    // Marcar materiales seleccionados
    Array.from(selMat.options).forEach(opt => {
      opt.selected = (ej.material || []).includes(opt.value);
    });
  } else {
    document.getElementById('modalTitle').textContent = 'Nuevo Ejercicio';
    document.getElementById('btnGuardar').textContent = 'Guardar ejercicio';
    document.getElementById('fNombre').value    = '';
    document.getElementById('fDesc').value      = '';
    document.getElementById('fNivel').value     = 'Ninguno';
    document.getElementById('fDuracion').value  = '';
    document.getElementById('fJugadores').value = '';
    document.getElementById('fVideoUrl').value  = '';
    Array.from(selMat.options).forEach(opt => opt.selected = false);
  }

  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('fNombre').focus(), 300);
}

function cerrarModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editandoId = null;
}

function cerrarModalOverlay(e) {
  if (e.target === document.getElementById('modalOverlay')) cerrarModal();
}

document.getElementById('fNombre').addEventListener('keydown', e => {
  if (e.key === 'Enter') guardarEjercicio();
});

// ── Guardar ejercicio ─────────────────────────────────────────
function guardarEjercicio() {
  const nombre    = document.getElementById('fNombre').value.trim();
  const desc      = document.getElementById('fDesc').value.trim();
  const categoria = document.getElementById('fCategoria').value;
  const tipo      = document.getElementById('fTipo').value;
  const nivel     = document.getElementById('fNivel').value;
  const duracion  = document.getElementById('fDuracion').value;
  const jugadores = document.getElementById('fJugadores').value;
  const selMat    = document.getElementById('fMaterial');
  const material  = Array.from(selMat.selectedOptions).map(o => o.value);
  const videoUrl  = document.getElementById('fVideoUrl').value.trim();

  if (!nombre) {
    showToast('⚠️ El nombre es obligatorio', 'toast-error');
    document.getElementById('fNombre').focus();
    return;
  }

  const db = loadDB();

  const duplicado = db.ejercicios.some(e =>
    e.nombre.toLowerCase() === nombre.toLowerCase() && e.id !== editandoId
  );
  if (duplicado) {
    showToast('⚠️ Ya existe un ejercicio con ese nombre', 'toast-error');
    return;
  }

  if (editandoId) {
    const ej = db.ejercicios.find(e => e.id === editandoId);
    if (ej) {
      ej.nombre      = nombre;
      ej.descripcion = desc;
      ej.categoria   = categoria;
      ej.tipo        = tipo;
      ej.nivel       = nivel;
      ej.duracion    = duracion;
      ej.jugadores   = jugadores;
      ej.material    = material;
      ej.videoUrl    = videoUrl;
    }
    saveDB(db);
    showToast(`✅ "${nombre}" actualizado`);
  } else {
    db.ejercicios.push({
      id:          generarId('ej'),
      nombre,
      descripcion: desc,
      categoria,
      tipo,
      nivel,
      duracion,
      jugadores,
      material,
      videoUrl,
      ultimoUso:   null,
      creadoEn:    new Date().toISOString()
    });
    saveDB(db);
    showToast(`✅ "${nombre}" añadido`);
  }

  cerrarModal();
  renderLista();
}

// ── Eliminar ejercicio ────────────────────────────────────────
function eliminarEjercicio(id) {
  const db = loadDB();
  const ej = db.ejercicios.find(e => e.id === id);
  if (!ej) return;
  if (!confirm(`¿Eliminar "${ej.nombre}"?`)) return;
  db.ejercicios = db.ejercicios.filter(e => e.id !== id);
  saveDB(db);
  showToast(`🗑️ "${ej.nombre}" eliminado`);
  renderLista();
}

// ── Expandir/colapsar ────────────────────────────────────────
function toggleCard(id) {
  const card = document.querySelector(`.ej-card[data-id="${id}"]`);
  if (!card) return;
  document.querySelectorAll('.ej-card.expanded').forEach(c => {
    if (c !== card) c.classList.remove('expanded');
  });
  card.classList.toggle('expanded');
}

// ── Importar ejercicios desde JSON ───────────────────────────
function importarEjercicios(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      const lista = Array.isArray(data) ? data : data.ejercicios;
      if (!lista || !Array.isArray(lista)) throw new Error('Formato incorrecto');

      const db = loadDB();
      let añadidos = 0;
      lista.forEach(item => {
        if (!item.nombre) return;
        const existe = db.ejercicios.some(e => e.nombre.toLowerCase() === item.nombre.toLowerCase());
        if (!existe) {
          db.ejercicios.push({
            id:          generarId('ej'),
            nombre:      item.nombre,
            descripcion: item.descripcion || item.desc || '',
            categoria:   item.categoria || 'Situaciones',
            tipo:        item.tipo || 'Táctica',
            nivel:       item.nivel || 'Ninguno',
            duracion:    item.duracion || '',
            jugadores:   item.jugadores || '',
            material:    item.material || [],
            ultimoUso:   null,
            creadoEn:    new Date().toISOString()
          });
          añadidos++;
        }
      });
      saveDB(db);
      showToast(`✅ ${añadidos} ejercicio${añadidos !== 1 ? 's' : ''} importado${añadidos !== 1 ? 's' : ''}`, 'toast-success');
      renderLista();
    } catch (err) {
      showToast('❌ Archivo JSON inválido', 'toast-error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ── Exportar ejercicios ───────────────────────────────────────
function exportarEjercicios() {
  const db   = loadDB();
  const data = { ejercicios: db.ejercicios };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `chema-padel-ejercicios-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 Ejercicios exportados', 'toast-info');
}

// ── Modal Configuración ───────────────────────────────────────
function abrirConfigModal() {
  renderConfig();
  document.getElementById('configOverlay').classList.add('open');
}

function cerrarConfigModal() {
  document.getElementById('configOverlay').classList.remove('open');
  renderFilterCat();
  renderLista();
}

function cerrarConfigOverlay(e) {
  if (e.target === document.getElementById('configOverlay')) cerrarConfigModal();
}

function renderConfig() {
  const config = getConfig();

  // Categorías
  document.getElementById('configCats').innerHTML = config.categorias.map(c =>
    `<span class="config-chip">${getCatIcon(c)} ${escHtml(c)} <button onclick="eliminarConfigItem('categorias','${escHtml(c)}')">×</button></span>`
  ).join('');

  // Tipos
  document.getElementById('configTipos').innerHTML = config.tipos.map(t =>
    `<span class="config-chip">${escHtml(t)} <button onclick="eliminarConfigItem('tipos','${escHtml(t)}')">×</button></span>`
  ).join('');

  // Materiales
  document.getElementById('configMateriales').innerHTML = config.materiales.map(m =>
    `<span class="config-chip">📦 ${escHtml(m)} <button onclick="eliminarConfigItem('materiales','${escHtml(m)}')">×</button></span>`
  ).join('');
}

function añadirCategoria() {
  const input = document.getElementById('newCat');
  const val   = input.value.trim();
  if (!val) return;
  const config = getConfig();
  if (!config.categorias.includes(val)) {
    config.categorias.push(val);
    saveConfig(config);
  }
  input.value = '';
  renderConfig();
}

function añadirTipo() {
  const input = document.getElementById('newTipo');
  const val   = input.value.trim();
  if (!val) return;
  const config = getConfig();
  if (!config.tipos.includes(val)) {
    config.tipos.push(val);
    saveConfig(config);
  }
  input.value = '';
  renderConfig();
}

function añadirMaterial() {
  const input = document.getElementById('newMaterial');
  const val   = input.value.trim();
  if (!val) return;
  const config = getConfig();
  if (!config.materiales.includes(val)) {
    config.materiales.push(val);
    saveConfig(config);
  }
  input.value = '';
  renderConfig();
}

function eliminarConfigItem(coleccion, valor) {
  const config = getConfig();
  config[coleccion] = config[coleccion].filter(v => v !== valor);
  saveConfig(config);
  renderConfig();
}

// Enter en inputs de config
document.getElementById('newCat').addEventListener('keydown', e => { if (e.key === 'Enter') añadirCategoria(); });
document.getElementById('newTipo').addEventListener('keydown', e => { if (e.key === 'Enter') añadirTipo(); });
document.getElementById('newMaterial').addEventListener('keydown', e => { if (e.key === 'Enter') añadirMaterial(); });

// ── Render lista ─────────────────────────────────────────────
function renderLista() {
  const db     = loadDB();
  const filtro = document.getElementById('searchInput').value.trim().toLowerCase();
  const lista  = document.getElementById('listaEjercicios');

  let ejercicios = db.ejercicios || [];

  // Aplicar filtros
  if (filtroCat)   ejercicios = ejercicios.filter(e => e.categoria === filtroCat);
  if (filtroNivel) ejercicios = ejercicios.filter(e => e.nivel === filtroNivel);
  if (filtro)      ejercicios = ejercicios.filter(e =>
    e.nombre.toLowerCase().includes(filtro) ||
    (e.descripcion || '').toLowerCase().includes(filtro) ||
    e.tipo.toLowerCase().includes(filtro)
  );

  // Ordenar: primero los más usados recientemente, luego el resto
  ejercicios = [...ejercicios].sort((a, b) => {
    if (a.ultimoUso && b.ultimoUso) return new Date(b.ultimoUso) - new Date(a.ultimoUso);
    if (a.ultimoUso) return -1;
    if (b.ultimoUso) return 1;
    return a.nombre.localeCompare(b.nombre);
  });

  const total = (db.ejercicios || []).length;
  document.getElementById('sectionCount').textContent = `${total} ejercicio${total !== 1 ? 's' : ''}`;

  if (total === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">🎾</div><p>Sin ejercicios. Pulsa ＋ para añadir.</p></div>`;
    return;
  }

  if (ejercicios.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>No hay ejercicios que coincidan con los filtros.</p></div>`;
    return;
  }

  lista.innerHTML = ejercicios.map(ej => {
    const catClase = getCatClase(ej.categoria);
    const catIcon  = getCatIcon(ej.categoria);

    const badgeNivel = ej.nivel && ej.nivel !== 'Ninguno'
      ? `<span class="badge badge-${ej.nivel.toLowerCase()}">${ej.nivel}</span>`
      : '';

    const ultimoUsoTexto = ej.ultimoUso
      ? `Usado: ${new Date(ej.ultimoUso).toLocaleDateString('es-ES')}`
      : 'Nunca usado';

    const materialTexto = ej.material && ej.material.length > 0
      ? ej.material.join(', ')
      : '—';

    return `
      <div class="ej-card" data-id="${ej.id}">
        <div class="ej-compact" onclick="toggleCard('${ej.id}')">
          <div class="cat-icon ${catClase}">${catIcon}</div>
          <div class="card-info">
            <div class="card-name">${escHtml(ej.nombre)}</div>
            <div class="card-meta">
              <span style="font-weight:600;color:var(--gris-2)">${escHtml(ej.tipo)}</span>
              ${badgeNivel}
              ${ej.duracion ? `<span>· ${escHtml(ej.duracion)}</span>` : ''}
            </div>
          </div>
          <span class="chevron">▾</span>
        </div>

        <div class="ej-expanded">
          ${ej.descripcion ? `<div class="ej-desc">${escHtml(ej.descripcion)}</div>` : ''}

          <div class="ej-tags">
            <span class="tag">📂 ${escHtml(ej.categoria)}</span>
            <span class="tag">🎯 ${escHtml(ej.tipo)}</span>
            ${ej.jugadores ? `<span class="tag">👥 ${escHtml(ej.jugadores)} jugadores</span>` : ''}
            ${ej.duracion ? `<span class="tag">⏱ ${escHtml(ej.duracion)}</span>` : ''}
            ${ej.material && ej.material.length > 0 ? `<span class="tag">📦 ${escHtml(materialTexto)}</span>` : ''}
          </div>

          <div class="uso-date">🕐 ${ultimoUsoTexto}</div>

          ${ej.videoUrl ? `
          <a href="${escHtml(ej.videoUrl)}" target="_blank" rel="noopener"
            style="display:flex;align-items:center;gap:8px;background:#fff0f0;
            border:2px solid #ffcccc;border-radius:10px;padding:9px 12px;
            margin:10px 0;text-decoration:none;color:#cc0000;font-weight:700;font-size:.84rem;">
            ▶️ Ver video tutorial en YouTube
          </a>` : ''}

          <div class="card-actions">
            <button class="btn btn-secondary btn-sm" onclick="abrirModal('${ej.id}')">✏️ Editar</button>
            <button class="btn btn-danger-ghost btn-sm" onclick="eliminarEjercicio('${ej.id}')">🗑️ Eliminar</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Inicializar ───────────────────────────────────────────────
precargarSiVacio();
renderFilterCat();
renderLista();
