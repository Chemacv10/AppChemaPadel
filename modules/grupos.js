/**
 * ============================================================
 * MÓDULO GRUPOS – Chema Pádel V2
 * Gestión completa: crear, editar, eliminar con seguridad,
 * lista expandible de alumnos, relación bidireccional.
 * ============================================================
 */

// ── Estado del módulo ────────────────────────────────────────
let editandoId    = null;  // ID del grupo en edición
let eliminandoId  = null;  // ID del grupo en proceso de eliminación

// ── Referencias DOM ──────────────────────────────────────────
const modalOverlay   = document.getElementById('modalOverlay');
const confirmModal   = document.getElementById('confirmModal');
const searchInput    = document.getElementById('searchInput');

// ── Toast ─────────────────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, tipo = 'toast-success') {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className = `show ${tipo}`;
  toastTimer = setTimeout(() => { toastEl.className = ''; }, 2800);
}

// ── Modal: Añadir / Editar ────────────────────────────────────
function abrirModal(grupoId = null) {
  editandoId = grupoId;

  if (grupoId) {
    const db    = loadDB();
    const grupo = getGrupoPorId(db, grupoId);
    if (!grupo) return;
    document.getElementById('modalTitle').textContent  = 'Editar Grupo';
    document.getElementById('btnGuardar').textContent  = 'Guardar cambios';
    document.getElementById('fNombre').value  = grupo.nombre;
    document.getElementById('fNivel').value   = grupo.nivel;
    document.getElementById('fPista').value   = String(grupo.pista);
  } else {
    document.getElementById('modalTitle').textContent = 'Nuevo Grupo';
    document.getElementById('btnGuardar').textContent = 'Guardar grupo';
    document.getElementById('fNombre').value  = '';
    document.getElementById('fNivel').value   = 'Principiante';
    document.getElementById('fPista').value   = '1';
  }

  modalOverlay.classList.add('open');
  setTimeout(() => document.getElementById('fNombre').focus(), 300);
}

function cerrarModal() {
  modalOverlay.classList.remove('open');
  editandoId = null;
}

function cerrarModalOverlay(e) {
  if (e.target === modalOverlay) cerrarModal();
}

document.getElementById('fNombre').addEventListener('keydown', e => {
  if (e.key === 'Enter') guardarGrupo();
});

// ── Guardar (crear o editar) ──────────────────────────────────
function guardarGrupo() {
  const nombre = document.getElementById('fNombre').value.trim();
  const nivel  = document.getElementById('fNivel').value;
  const pista  = parseInt(document.getElementById('fPista').value);

  if (!nombre) {
    showToast('⚠️ El nombre del grupo es obligatorio', 'toast-error');
    document.getElementById('fNombre').focus();
    return;
  }

  const db = loadDB();

  // Comprobar duplicado
  const duplicado = db.grupos.some(g =>
    g.nombre.toLowerCase() === nombre.toLowerCase() && g.id !== editandoId
  );
  if (duplicado) {
    showToast('⚠️ Ya existe un grupo con ese nombre', 'toast-error');
    document.getElementById('fNombre').focus();
    return;
  }

  if (editandoId) {
    // Editar
    const grupo = getGrupoPorId(db, editandoId);
    if (!grupo) return;
    grupo.nombre = nombre;
    grupo.nivel  = nivel;
    grupo.pista  = pista;
    saveDB(db);
    showToast(`✅ "${nombre}" actualizado`);
  } else {
    // Crear
    const nuevoGrupo = {
      id:       generarId('grp'),
      nombre,
      nivel,
      pista,
      alumnos:  [],
      creadoEn: new Date().toISOString()
    };
    db.grupos.push(nuevoGrupo);
    saveDB(db);
    showToast(`✅ Grupo "${nombre}" creado`);
  }

  cerrarModal();
  renderLista();
}

// ── Eliminar grupo (con confirmación segura) ──────────────────
function pedirEliminarGrupo(id) {
  const db    = loadDB();
  const grupo = getGrupoPorId(db, id);
  if (!grupo) return;

  eliminandoId = id;
  const nAlumnos = grupo.alumnos.length;

  document.getElementById('confirmTitle').textContent = `⚠️ Eliminar "${grupo.nombre}"`;

  const selectGrupo  = document.getElementById('confirmSelectGrupo');
  const confirmBtns  = document.getElementById('confirmBtns');

  if (nAlumnos === 0) {
    // Sin alumnos: confirmación simple
    document.getElementById('confirmText').innerHTML =
      `¿Seguro que quieres eliminar este grupo? Esta acción no se puede deshacer.`;
    selectGrupo.classList.remove('visible');
    confirmBtns.innerHTML = `
      <button class="btn btn-danger-ghost" onclick="confirmarEliminar('sin-grupo')">🗑️ Eliminar grupo</button>
      <button class="btn btn-secondary" onclick="cerrarConfirm()">Cancelar</button>`;
  } else {
    // Con alumnos: opciones
    document.getElementById('confirmText').innerHTML =
      `Este grupo tiene <strong>${nAlumnos} alumno${nAlumnos > 1 ? 's' : ''}</strong>. ¿Qué hago con ellos?`;

    // Llenar selector de destino (otros grupos)
    const otrosGrupos = db.grupos.filter(g => g.id !== id);
    selectGrupo.innerHTML = '<option value="">Selecciona un grupo destino…</option>' +
      otrosGrupos.map(g => `<option value="${g.id}">${escHtml(g.nombre)}</option>`).join('');

    confirmBtns.innerHTML = `
      <button class="btn btn-primary" onclick="confirmarMoverAlumnos()" style="background:var(--azul)">
        📦 Mover alumnos a otro grupo
      </button>
      <button class="btn btn-danger-ghost" onclick="confirmarEliminar('sin-grupo')">
        ❌ Dejarlos sin grupo
      </button>
      <button class="btn btn-secondary" onclick="cerrarConfirm()">Cancelar</button>`;

    // Mostrar selector si hay grupos destino
    if (otrosGrupos.length > 0) {
      selectGrupo.classList.add('visible');
    } else {
      selectGrupo.classList.remove('visible');
      // Ocultar opción de mover si no hay destino
      confirmBtns.querySelector('.btn-primary').style.display = 'none';
    }
  }

  confirmModal.classList.add('open');
}

function confirmarMoverAlumnos() {
  const destinoId = document.getElementById('confirmSelectGrupo').value;
  if (!destinoId) {
    showToast('⚠️ Selecciona un grupo destino', 'toast-error');
    return;
  }
  confirmarEliminar('mover', destinoId);
}

function confirmarEliminar(accion, destinoId = null) {
  if (!eliminandoId) return;
  const db = loadDB();
  const grupo = getGrupoPorId(db, eliminandoId);
  const nombre = grupo ? grupo.nombre : '';

  const dbActualizado = eliminarGrupoDB(db, eliminandoId, accion, destinoId);
  saveDB(dbActualizado);

  if (accion === 'mover' && destinoId) {
    const destino = getGrupoPorId(dbActualizado, destinoId);
    showToast(`✅ Grupo eliminado. Alumnos movidos a "${destino ? destino.nombre : 'otro grupo'}"`);
  } else if (accion === 'sin-grupo') {
    showToast(`🗑️ Grupo "${nombre}" eliminado`);
  }

  cerrarConfirm();
  renderLista();
}

function cerrarConfirm() {
  confirmModal.classList.remove('open');
  eliminandoId = null;
}

// Cerrar confirm al pulsar fuera
confirmModal.addEventListener('click', e => {
  if (e.target === confirmModal) cerrarConfirm();
});

// ── Expandir/colapsar card ───────────────────────────────────
function toggleCard(id) {
  const card = document.querySelector(`.item-card[data-id="${id}"]`);
  if (!card) return;
  document.querySelectorAll('.item-card.expanded').forEach(c => {
    if (c !== card) c.classList.remove('expanded');
  });
  card.classList.toggle('expanded');
}

// ── Render de la lista ───────────────────────────────────────
function renderLista() {
  const db     = loadDB();
  const filtro = searchInput.value.trim().toLowerCase();
  const lista  = document.getElementById('listaGrupos');

  let grupos = db.grupos;

  if (filtro) {
    grupos = grupos.filter(g =>
      g.nombre.toLowerCase().includes(filtro) ||
      g.nivel.toLowerCase().includes(filtro)
    );
  }

  document.getElementById('sectionCount').textContent =
    `${db.grupos.length} grupo${db.grupos.length !== 1 ? 's' : ''}`;

  if (db.grupos.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👨‍👩‍👧‍👦</div>
        <p>Aún no hay grupos.<br>Pulsa <strong>＋</strong> para crear el primero.</p>
      </div>`;
    return;
  }

  if (grupos.length === 0 && filtro) {
    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No hay grupos que coincidan<br>con "<strong>${escHtml(filtro)}</strong>"</p>
      </div>`;
    return;
  }

  lista.innerHTML = grupos.map(g => {
    const alumnos  = getAlumnosPorGrupo(db, g.id);
    const nAlumnos = alumnos.length;

    // Sub-lista de alumnos (para panel expandido)
    const sublistaHtml = nAlumnos > 0
      ? `<div class="alumnos-sublist">
           <div class="alumnos-sublist-title">👥 Alumnos (${nAlumnos})</div>
           ${alumnos.map(a => {
             const { iniciales, color } = avatarIniciales(a.nombre);
             const avatarHtml = a.avatar
               ? `<span style="font-size:1.1rem">${a.avatar}</span>`
               : `<span class="avatar" style="background:${color};width:24px;height:24px;font-size:0.65rem;">${iniciales}</span>`;
             return `<div class="alumno-subitem">
                       ${avatarHtml}
                       <span style="flex:1;font-weight:500">${escHtml(a.nombre)}</span>
                       <span class="badge badge-${a.nivel.toLowerCase()}">${a.nivel}</span>
                     </div>`;
           }).join('')}
         </div>`
      : `<p style="font-size:.82rem;color:var(--gris-3);padding:10px 0;">Sin alumnos asignados aún.</p>`;

    return `
      <div class="item-card" data-id="${g.id}">
        <!-- Fila compacta -->
        <div class="card-compact" onclick="toggleCard('${g.id}')">
          <div class="avatar" style="background:var(--negro);font-size:1.3rem;border-radius:10px;">🎾</div>
          <div class="card-info">
            <div class="card-name">${escHtml(g.nombre)}</div>
            <div class="card-meta">
              <span class="badge badge-${g.nivel.toLowerCase()}">${g.nivel}</span>
              <span class="badge badge-pista">PISTA ${g.pista}</span>
              <span>· ${nAlumnos} alumno${nAlumnos !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <span class="chevron">▾</span>
        </div>

        <!-- Panel expandido -->
        <div class="card-expanded">
          ${sublistaHtml}
          <div class="card-actions">
            <button class="btn btn-secondary btn-sm" onclick="abrirModal('${g.id}')">✏️ Editar</button>
            <button class="btn btn-danger-ghost btn-sm" onclick="pedirEliminarGrupo('${g.id}')">🗑️ Eliminar</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Inicializar ───────────────────────────────────────────────
renderLista();
