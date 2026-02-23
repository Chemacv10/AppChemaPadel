/**
 * ============================================================
 * MÓDULO CLASES – Chema Pádel V2
 * Wizard 4 pasos: datos → asistencia → sugerencia → bloques
 * Sugerencia simple e inteligente de ejercicios
 * Historial por grupo, actualización de último uso
 * ============================================================
 */

// ── Estado del módulo ────────────────────────────────────────
let pasoActual   = 1;
const TOTAL_PASOS = 4;
let editandoId   = null;
let modoSugerencia = 'simple';
let tabActual    = 'lista';

// Cantidades de bloques por categoría
let cantidades = { Calentamiento: 1, Carritos: 3, Situaciones: 1, Partiditos: 1 };

// Bloques generados (array de objetos)
let bloquesActuales = [];

// IDs de alumnos marcados como asistentes
let asistentes = [];

// Iconos por categoría
const CAT_ICON = {
  Calentamiento: '🏃',
  Carritos:      '🎯',
  Situaciones:   '⚡',
  Partiditos:    '🏆'
};

// Estructura estándar según nivel
const ESTRUCTURA_NIVEL = {
  Principiante: { Calentamiento: 1, Carritos: 4, Situaciones: 1, Partiditos: 1 },
  Intermedio:   { Calentamiento: 1, Carritos: 3, Situaciones: 2, Partiditos: 1 },
  Avanzado:     { Calentamiento: 1, Carritos: 2, Situaciones: 3, Partiditos: 1 },
  Mixto:        { Calentamiento: 1, Carritos: 3, Situaciones: 1, Partiditos: 1 }
};

// ── Toast ─────────────────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, tipo = 'toast-success') {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className = `show ${tipo}`;
  toastTimer = setTimeout(() => { toastEl.className = ''; }, 2800);
}

// ── Tabs ───────────────────────────────────────────────────────
function setTab(tab, btn) {
  tabActual = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('vistaLista').style.display     = tab === 'lista' ? 'block' : 'none';
  document.getElementById('vistaHistorial').style.display = tab === 'historial' ? 'block' : 'none';
  if (tab === 'historial') renderHistorial();
}

// ── Filtros ───────────────────────────────────────────────────
function cargarFiltroGrupos() {
  const db  = loadDB();
  const sel = document.getElementById('filtroGrupo');
  sel.innerHTML = '<option value="">Todos los grupos</option>' +
    db.grupos.map(g => `<option value="${g.id}">${escHtml(g.nombre)}</option>`).join('');
}

// ── Abrir Wizard ──────────────────────────────────────────────
function abrirWizard(claseId = null) {
  editandoId = claseId;
  pasoActual = 1;
  asistentes = [];
  bloquesActuales = [];
  modoSugerencia = 'simple';

  const db = loadDB();

  // Poblar selector de grupos
  const selGrupo = document.getElementById('fGrupo');
  selGrupo.innerHTML = '<option value="">Selecciona grupo…</option>' +
    db.grupos.map(g => `<option value="${g.id}">${escHtml(g.nombre)}</option>`).join('');

  if (claseId) {
    // Editar clase existente
    const clase = (db.clases || []).find(c => c.id === claseId);
    if (!clase) return;
    document.getElementById('modalTitle').textContent = 'Editar Clase';
    document.getElementById('fFecha').value    = clase.fecha;
    document.getElementById('fHora').value     = clase.hora || '';
    document.getElementById('fGrupo').value    = clase.grupoId;
    document.getElementById('fDuracion').value = clase.duracion || '';
    document.getElementById('fEstado').value   = clase.estado;
    document.getElementById('fObs').value      = clase.observaciones || '';
    asistentes      = [...(clase.asistentes || [])];
    bloquesActuales = JSON.parse(JSON.stringify(clase.bloques || []));
    onGrupoChange();
  } else {
    // Nueva clase
    document.getElementById('modalTitle').textContent = 'Nueva Clase';
    const hoy = new Date().toISOString().slice(0, 10);
    document.getElementById('fFecha').value    = hoy;
    document.getElementById('fHora').value     = '';
    document.getElementById('fDuracion').value = '60 min';
    document.getElementById('fEstado').value   = 'Realizada';
    document.getElementById('fObs').value      = '';
  }

  actualizarWizardUI();
  document.getElementById('modalOverlay').classList.add('open');
}

function cerrarModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editandoId = null;
}

function cerrarModalOverlay(e) {
  if (e.target === document.getElementById('modalOverlay')) cerrarModal();
}

// ── Navegación wizard ─────────────────────────────────────────
function pasoSiguiente() {
  if (!validarPaso()) return;

  // En último paso → guardar
  if (pasoActual === TOTAL_PASOS) {
    guardarClase();
    return;
  }

  // Saltar paso 2 y 3 si suspendida/festivo
  const estado = document.getElementById('fEstado').value;
  if (estado !== 'Realizada' && pasoActual === 1) {
    guardarClase();
    return;
  }

  // Al llegar al paso 3: ajustar cantidades según nivel del grupo
  if (pasoActual === 2) {
    ajustarCantidadesPorNivel();
  }

  // Al llegar al paso 4: generar bloques
  if (pasoActual === 3) {
    generarSugerencia();
    renderBloqueEditor();
  }

  pasoActual++;
  actualizarWizardUI();
}

function pasoAnterior() {
  if (pasoActual <= 1) return;
  pasoActual--;
  actualizarWizardUI();
}

function actualizarWizardUI() {
  // Mostrar paso correcto
  for (let i = 1; i <= TOTAL_PASOS; i++) {
    const el = document.getElementById(`step${i}`);
    if (el) el.classList.toggle('active', i === pasoActual);
  }

  // Progreso
  for (let i = 1; i <= TOTAL_PASOS; i++) {
    const dot = document.getElementById(`wp${i}`);
    if (dot) dot.classList.toggle('done', i <= pasoActual);
  }

  // Botones
  const btnAnt  = document.getElementById('btnAnterior');
  const btnSig  = document.getElementById('btnSiguiente');
  btnAnt.style.display = pasoActual > 1 ? 'flex' : 'none';

  const estado = document.getElementById('fEstado').value;
  if (pasoActual === TOTAL_PASOS || (pasoActual === 1 && estado !== 'Realizada')) {
    btnSig.textContent = '💾 Guardar clase';
  } else {
    btnSig.textContent = 'Siguiente →';
  }

  // Cargar contenido de cada paso
  if (pasoActual === 2) renderCheckAsistencia();
  if (pasoActual === 4) renderBloqueEditor();
}

function validarPaso() {
  if (pasoActual === 1) {
    const fecha  = document.getElementById('fFecha').value;
    const grupoId = document.getElementById('fGrupo').value;
    if (!fecha) {
      showToast('⚠️ La fecha es obligatoria', 'toast-error');
      return false;
    }
    if (!grupoId) {
      showToast('⚠️ Selecciona un grupo', 'toast-error');
      return false;
    }
  }
  return true;
}

// ── Paso 1: cambio de grupo ──────────────────────────────────
function onGrupoChange() {
  // Nada especial por ahora, la asistencia se carga en paso 2
}

function onEstadoChange() {
  // Si no es Realizada, el wizard salta directo a guardar desde paso 1
}

// ── Paso 2: Asistencia ────────────────────────────────────────
function renderCheckAsistencia() {
  const grupoId = document.getElementById('fGrupo').value;
  const db      = loadDB();
  const grupo   = getGrupoPorId(db, grupoId);
  const alumnos = grupo ? getAlumnosPorGrupo(db, grupoId) : [];

  const container   = document.getElementById('checkAsistencia');
  const sinAlumnos  = document.getElementById('sinAlumnos');
  const btnsTodos   = document.getElementById('btnMarcarTodos');

  if (alumnos.length === 0) {
    container.innerHTML = '';
    sinAlumnos.style.display  = 'block';
    btnsTodos.style.display   = 'none';
    return;
  }

  sinAlumnos.style.display  = 'none';
  btnsTodos.style.display   = 'flex';

  // Si no hay asistentes previos, marcar todos por defecto
  if (asistentes.length === 0) {
    asistentes = alumnos.map(a => a.id);
  }

  container.innerHTML = alumnos.map(a => {
    const checked = asistentes.includes(a.id);
    return `
      <div class="check-item ${checked ? 'checked' : ''}" onclick="toggleAsistente('${a.id}', this)">
        <div class="check-box">${checked ? '✓' : ''}</div>
        <span class="check-nombre">${escHtml(a.nombre)}</span>
        <span class="check-nivel">${a.nivel}</span>
      </div>`;
  }).join('');
}

function toggleAsistente(alumnoId, el) {
  const idx = asistentes.indexOf(alumnoId);
  if (idx >= 0) {
    asistentes.splice(idx, 1);
    el.classList.remove('checked');
    el.querySelector('.check-box').textContent = '';
  } else {
    asistentes.push(alumnoId);
    el.classList.add('checked');
    el.querySelector('.check-box').textContent = '✓';
  }
}

function marcarTodos(marcar) {
  const grupoId = document.getElementById('fGrupo').value;
  const db      = loadDB();
  const alumnos = getAlumnosPorGrupo(db, grupoId);
  asistentes    = marcar ? alumnos.map(a => a.id) : [];
  renderCheckAsistencia();
}

// ── Paso 3: Sugerencia ────────────────────────────────────────
function setModo(modo) {
  modoSugerencia = modo;
  document.getElementById('btnSimple').classList.toggle('active', modo === 'simple');
  document.getElementById('btnInteligente').classList.toggle('active', modo === 'inteligente');
}

function ajustarCantidadesPorNivel() {
  const grupoId = document.getElementById('fGrupo').value;
  const db      = loadDB();
  const grupo   = getGrupoPorId(db, grupoId);
  if (!grupo) return;

  // Caso especial: 1 solo alumno
  const numAsistentes = asistentes.length;
  if (numAsistentes === 1) {
    cantidades = { Calentamiento: 1, Carritos: 5, Situaciones: 0, Partiditos: 0 };
  } else {
    const est = ESTRUCTURA_NIVEL[grupo.nivel] || ESTRUCTURA_NIVEL['Intermedio'];
    cantidades = { ...est };
  }

  // Actualizar contadores en UI
  Object.keys(cantidades).forEach(cat => {
    const el = document.getElementById(`cnt-${cat}`);
    if (el) el.textContent = cantidades[cat];
  });
}

function cambiarCantidad(cat, delta) {
  cantidades[cat] = Math.max(0, (cantidades[cat] || 0) + delta);
  const el = document.getElementById(`cnt-${cat}`);
  if (el) el.textContent = cantidades[cat];
}

function generarSugerencia() {
  const db      = loadDB();
  const grupoId = document.getElementById('fGrupo').value;
  const ejercicios = db.ejercicios || [];

  bloquesActuales = [];

  Object.entries(cantidades).forEach(([cat, n]) => {
    let pool = ejercicios.filter(e => e.categoria === cat);

    if (modoSugerencia === 'inteligente') {
      // Priorizar los no usados recientemente
      pool = pool.sort((a, b) => {
        if (!a.ultimoUso && !b.ultimoUso) return Math.random() - 0.5;
        if (!a.ultimoUso) return -1;
        if (!b.ultimoUso) return 1;
        return new Date(a.ultimoUso) - new Date(b.ultimoUso);
      });
      // Evitar repetir tipos (rotar conceptos)
      const tiposUsados = new Set();
      pool = pool.filter(e => {
        if (tiposUsados.has(e.tipo)) return false;
        tiposUsados.add(e.tipo);
        return true;
      });
      // Rellenar con el resto si no hay suficientes
      if (pool.length < n) {
        const extras = ejercicios.filter(e => e.categoria === cat && !pool.includes(e));
        pool = [...pool, ...extras];
      }
    } else {
      // Simple: aleatorio
      pool = [...pool].sort(() => Math.random() - 0.5);
    }

    for (let i = 0; i < n; i++) {
      const ej = pool[i] || null;
      bloquesActuales.push({
        uid:        `b_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
        categoria:  cat,
        ejercicioId: ej ? ej.id : null,
        duracion:   ej?.duracion || '',
        noRealizado: false
      });
    }
  });

  if (pasoActual === 4) renderBloqueEditor();
}

// ── Paso 4: Editor de bloques ─────────────────────────────────
function renderBloqueEditor() {
  const db       = loadDB();
  const ejercicios = db.ejercicios || [];
  const container = document.getElementById('bloqueEditor');

  if (bloquesActuales.length === 0) {
    container.innerHTML = `<p style="color:var(--gris-3);font-size:.85rem;text-align:center;padding:20px 0;">
      Sin bloques. Usa los botones de abajo para añadir.</p>`;
    return;
  }

  container.innerHTML = bloquesActuales.map((b, idx) => {
    const ejsPorCat = ejercicios.filter(e => e.categoria === b.categoria);
    const optEjs    = '<option value="">— Sin ejercicio —</option>' +
      ejsPorCat.map(e =>
        `<option value="${e.id}" ${e.id === b.ejercicioId ? 'selected' : ''}>${escHtml(e.nombre)}</option>`
      ).join('');

    return `
      <div class="bloque-edit-item" data-uid="${b.uid}">
        <div class="bloque-edit-header">
          <span style="font-size:1.2rem;">${CAT_ICON[b.categoria] || '📌'}</span>
          <strong>${escHtml(b.categoria)}</strong>
          <div style="display:flex;gap:4px;margin-left:auto;">
            ${idx > 0 ? `<button class="btn btn-secondary btn-sm" onclick="moverBloque('${b.uid}',-1)" title="Subir">↑</button>` : ''}
            ${idx < bloquesActuales.length - 1 ? `<button class="btn btn-secondary btn-sm" onclick="moverBloque('${b.uid}',1)" title="Bajar">↓</button>` : ''}
            <button class="btn btn-danger-ghost btn-sm" onclick="eliminarBloque('${b.uid}')">✕</button>
          </div>
        </div>
        <select onchange="onEjercicioChange('${b.uid}', this.value)">${optEjs}</select>
        <div style="display:flex;gap:8px;margin-top:5px;">
          <select style="flex:1;" onchange="onDuracionChange('${b.uid}', this.value)">
            <option value="">Duración —</option>
            ${['5 min','10 min','15 min','20 min','25 min','30 min','45 min'].map(d =>
              `<option ${b.duracion === d ? 'selected' : ''} value="${d}">${d}</option>`
            ).join('')}
          </select>
          <label style="display:flex;align-items:center;gap:6px;font-size:.8rem;cursor:pointer;white-space:nowrap;">
            <input type="checkbox" ${b.noRealizado ? 'checked' : ''} onchange="onNoRealizado('${b.uid}', this.checked)" />
            No realizado
          </label>
        </div>
      </div>`;
  }).join('');
}

function onEjercicioChange(uid, ejId) {
  const b = bloquesActuales.find(b => b.uid === uid);
  if (b) b.ejercicioId = ejId || null;
}

function onDuracionChange(uid, val) {
  const b = bloquesActuales.find(b => b.uid === uid);
  if (b) b.duracion = val;
}

function onNoRealizado(uid, val) {
  const b = bloquesActuales.find(b => b.uid === uid);
  if (b) b.noRealizado = val;
}

function addBloque(categoria) {
  bloquesActuales.push({
    uid:         `b_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    categoria,
    ejercicioId: null,
    duracion:    '',
    noRealizado: false
  });
  renderBloqueEditor();
}

function eliminarBloque(uid) {
  bloquesActuales = bloquesActuales.filter(b => b.uid !== uid);
  renderBloqueEditor();
}

function moverBloque(uid, delta) {
  const idx = bloquesActuales.findIndex(b => b.uid === uid);
  if (idx < 0) return;
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= bloquesActuales.length) return;
  [bloquesActuales[idx], bloquesActuales[newIdx]] = [bloquesActuales[newIdx], bloquesActuales[idx]];
  renderBloqueEditor();
}

// ── Guardar clase ─────────────────────────────────────────────
function guardarClase() {
  const fecha   = document.getElementById('fFecha').value;
  const hora    = document.getElementById('fHora').value;
  const grupoId = document.getElementById('fGrupo').value;
  const duracion = document.getElementById('fDuracion').value;
  const estado  = document.getElementById('fEstado').value;
  const obs     = document.getElementById('fObs').value.trim();

  if (!fecha || !grupoId) {
    showToast('⚠️ Faltan datos obligatorios', 'toast-error');
    pasoActual = 1;
    actualizarWizardUI();
    return;
  }

  const db = loadDB();
  if (!db.clases) db.clases = [];

  // Actualizar "último uso" en ejercicios usados
  const hoy = new Date().toISOString();
  bloquesActuales.forEach(b => {
    if (b.ejercicioId && !b.noRealizado) {
      const ej = (db.ejercicios || []).find(e => e.id === b.ejercicioId);
      if (ej) ej.ultimoUso = hoy;
    }
  });

  if (editandoId) {
    const idx = db.clases.findIndex(c => c.id === editandoId);
    if (idx >= 0) {
      db.clases[idx] = {
        ...db.clases[idx],
        fecha, hora, grupoId, duracion, estado,
        observaciones: obs,
        asistentes:    estado === 'Realizada' ? [...asistentes] : [],
        bloques:       estado === 'Realizada' ? bloquesActuales : [],
        actualizadoEn: hoy
      };
    }
    saveDB(db);
    showToast('✅ Clase actualizada');
  } else {
    const nuevaClase = {
      id:            generarId('cls'),
      fecha, hora, grupoId, duracion, estado,
      observaciones: obs,
      asistentes:    estado === 'Realizada' ? [...asistentes] : [],
      bloques:       estado === 'Realizada' ? bloquesActuales : [],
      creadoEn:      hoy
    };
    db.clases.push(nuevaClase);
    saveDB(db);
    showToast('✅ Clase guardada');
  }

  cerrarModal();
  renderLista();
}

// ── Eliminar clase ────────────────────────────────────────────
function eliminarClase(id) {
  const db    = loadDB();
  const clase = (db.clases || []).find(c => c.id === id);
  if (!clase) return;
  const grupo = getGrupoPorId(db, clase.grupoId);
  const label = `${clase.fecha}${grupo ? ' – ' + grupo.nombre : ''}`;
  if (!confirm(`¿Eliminar la clase del ${label}?`)) return;
  db.clases = db.clases.filter(c => c.id !== id);
  saveDB(db);
  showToast('🗑️ Clase eliminada');
  renderLista();
}

// ── Expandir card ────────────────────────────────────────────
function toggleCard(id) {
  const card = document.querySelector(`.clase-card[data-id="${id}"]`);
  if (!card) return;
  document.querySelectorAll('.clase-card.expanded').forEach(c => {
    if (c !== card) c.classList.remove('expanded');
  });
  card.classList.toggle('expanded');
}

// ── Render lista ──────────────────────────────────────────────
function renderLista() {
  const db       = loadDB();
  const clases   = (db.clases || []);
  const lista    = document.getElementById('listaClases');
  const filtroG  = document.getElementById('filtroGrupo').value;
  const filtroE  = document.getElementById('filtroEstado').value;

  document.getElementById('sectionCount').textContent =
    `${clases.length} clase${clases.length !== 1 ? 's' : ''}`;

  let filtradas = [...clases].sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (filtroG) filtradas = filtradas.filter(c => c.grupoId === filtroG);
  if (filtroE) filtradas = filtradas.filter(c => c.estado === filtroE);

  if (clases.length === 0) {
    lista.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📅</div>
      <p>Aún no hay clases.<br>Pulsa <strong>＋</strong> para registrar la primera.</p>
    </div>`;
    return;
  }

  if (filtradas.length === 0) {
    lista.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔍</div>
      <p>No hay clases con esos filtros.</p>
    </div>`;
    return;
  }

  lista.innerHTML = filtradas.map(c => {
    const grupo    = getGrupoPorId(db, c.grupoId);
    const nAsist   = (c.asistentes || []).length;
    const nBloques = (c.bloques || []).length;
    const dotClase = `dot-${c.estado.toLowerCase()}`;
    const badgeClase = `badge-${c.estado.toLowerCase()}`;

    const fechaFormato = new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'short'
    });

    // Bloques dentro del panel expandido
    const bloquesHtml = (c.bloques || []).length > 0
      ? `<div class="bloque-list">` + c.bloques.map(b => {
          const ej = b.ejercicioId ? (db.ejercicios || []).find(e => e.id === b.ejercicioId) : null;
          return `<div class="bloque-item ${b.noRealizado ? 'bloque-no-realizado' : ''}">
            <span class="bloque-icon">${CAT_ICON[b.categoria] || '📌'}</span>
            <div class="bloque-info">
              <div class="bloque-nombre">${ej ? escHtml(ej.nombre) : '— Sin ejercicio —'}</div>
              <div class="bloque-meta">${b.categoria}${b.duracion ? ' · ' + b.duracion : ''}${b.noRealizado ? ' · No realizado' : ''}</div>
            </div>
          </div>`;
        }).join('') + `</div>`
      : '';

    // Asistencia
    const asistChips = (c.asistentes || []).map(aid => {
      const al = getAlumnoPorId(db, aid);
      return al ? `<span class="asist-chip asist-vino">✓ ${escHtml(al.nombre)}</span>` : '';
    }).join('');

    return `
      <div class="clase-card" data-id="${c.id}">
        <div class="clase-compact" onclick="toggleCard('${c.id}')">
          <div class="estado-dot ${dotClase}"></div>
          <div class="card-info">
            <div class="card-name">${fechaFormato}${c.hora ? ' · ' + c.hora : ''}</div>
            <div class="card-meta">
              ${grupo ? escHtml(grupo.nombre) : 'Grupo eliminado'}
              · <span class="badge-estado ${badgeClase}">${c.estado}</span>
              ${c.estado === 'Realizada' ? `· ${nAsist} asistente${nAsist !== 1 ? 's' : ''} · ${nBloques} bloque${nBloques !== 1 ? 's' : ''}` : ''}
              ${c.duracion ? '· ' + c.duracion : ''}
            </div>
          </div>
          <span class="chevron">▾</span>
        </div>

        <div class="clase-expanded">
          ${bloquesHtml}
          ${asistChips ? `<div class="asistencia-chips" style="margin-top:10px;">${asistChips}</div>` : ''}
          ${c.observaciones ? `<p style="font-size:.82rem;color:var(--gris-2);margin-top:8px;font-style:italic;">"${escHtml(c.observaciones)}"</p>` : ''}
          <div class="card-actions" style="margin-top:12px;">
            <button class="btn btn-secondary btn-sm" onclick="abrirWizard('${c.id}')">✏️ Editar</button>
            <button class="btn btn-danger-ghost btn-sm" onclick="eliminarClase('${c.id}')">🗑️ Eliminar</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Historial (resumen por grupo) ─────────────────────────────
function renderHistorial() {
  const db     = loadDB();
  const clases = db.clases || [];
  const cont   = document.getElementById('contenidoHistorial');

  if (clases.length === 0) {
    cont.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>Sin datos de historial aún.</p></div>`;
    return;
  }

  // Resumen general
  const realizadas  = clases.filter(c => c.estado === 'Realizada').length;
  const suspendidas = clases.filter(c => c.estado === 'Suspendida').length;
  const festivos    = clases.filter(c => c.estado === 'Festivo').length;

  // Asistencia media
  const clasesCon  = clases.filter(c => c.asistentes?.length > 0);
  const mediaAsist = clasesCon.length > 0
    ? (clasesCon.reduce((s, c) => s + c.asistentes.length, 0) / clasesCon.length).toFixed(1)
    : 0;

  // Por grupo
  const porGrupo = db.grupos.map(g => {
    const cls = clases.filter(c => c.grupoId === g.id);
    const real = cls.filter(c => c.estado === 'Realizada');
    const asistTotal = real.reduce((s, c) => s + (c.asistentes?.length || 0), 0);
    const asistMedia = real.length > 0 ? (asistTotal / real.length).toFixed(1) : '—';
    const ultima     = cls.sort((a,b) => b.fecha.localeCompare(a.fecha))[0];
    return { grupo: g, total: cls.length, realizadas: real.length, asistMedia, ultima };
  }).filter(r => r.total > 0);

  cont.innerHTML = `
    <!-- Resumen general -->
    <div style="background:var(--blanco);border-radius:var(--radio);padding:16px;box-shadow:var(--sombra-sm);margin-bottom:14px;">
      <div style="font-family:'Bebas Neue',cursive;font-size:1.1rem;letter-spacing:1px;margin-bottom:12px;">📊 Resumen general</div>
      <div class="stats-grid" style="grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <div style="text-align:center;padding:10px;background:var(--verde-light);border-radius:var(--radio-sm);">
          <div style="font-family:'Bebas Neue',cursive;font-size:1.6rem;color:var(--verde-dark)">${realizadas}</div>
          <div style="font-size:.7rem;color:var(--verde-dark);font-weight:700;">REALIZADAS</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--rojo-light);border-radius:var(--radio-sm);">
          <div style="font-family:'Bebas Neue',cursive;font-size:1.6rem;color:var(--rojo)">${suspendidas}</div>
          <div style="font-size:.7rem;color:var(--rojo);font-weight:700;">SUSPENDIDAS</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--amarillo-l);border-radius:var(--radio-sm);">
          <div style="font-family:'Bebas Neue',cursive;font-size:1.6rem;color:var(--amarillo)">${festivos}</div>
          <div style="font-size:.7rem;color:var(--amarillo);font-weight:700;">FESTIVOS</div>
        </div>
      </div>
      <div style="margin-top:12px;font-size:.85rem;color:var(--gris-2);">
        👥 Asistencia media: <strong>${mediaAsist} alumnos/clase</strong>
      </div>
    </div>

    <!-- Por grupo -->
    ${porGrupo.map(r => `
      <div style="background:var(--blanco);border-radius:var(--radio);padding:14px 16px;box-shadow:var(--sombra-sm);margin-bottom:8px;">
        <div style="font-weight:700;margin-bottom:8px;">👨‍👩‍👧‍👦 ${escHtml(r.grupo.nombre)}</div>
        <div class="card-fields" style="grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <div class="field-item"><span class="field-label">Total</span><span class="field-value">${r.total}</span></div>
          <div class="field-item"><span class="field-label">Realizadas</span><span class="field-value">${r.realizadas}</span></div>
          <div class="field-item"><span class="field-label">Asist. media</span><span class="field-value">${r.asistMedia}</span></div>
        </div>
        ${r.ultima ? `<div style="font-size:.72rem;color:var(--gris-3);margin-top:6px;">Última: ${new Date(r.ultima.fecha + 'T12:00:00').toLocaleDateString('es-ES', {day:'numeric',month:'short',year:'numeric'})}</div>` : ''}
      </div>`).join('')}
  `;
}

// ── Inicializar ───────────────────────────────────────────────
cargarFiltroGrupos();
renderLista();
