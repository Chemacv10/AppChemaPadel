/**
 * ============================================================
 * MÓDULO ALUMNOS – Chema Pádel V2
 * Gestión completa: crear, editar, eliminar, buscar.
 * Relación bidireccional con Grupos via store.js.
 * ============================================================
 */

// ── Estado del módulo ────────────────────────────────────────
let editandoId = null;   // ID del alumno en edición (null = nuevo)

// ── Referencias DOM ──────────────────────────────────────────
const modalOverlay = document.getElementById('modalOverlay');
const searchInput  = document.getElementById('searchInput');

// ── Toast ─────────────────────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, tipo = 'toast-success') {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className = `show ${tipo}`;
  toastTimer = setTimeout(() => { toastEl.className = ''; }, 2800);
}

// ── Modal ─────────────────────────────────────────────────────
function abrirModal(alumnoId = null) {
  editandoId = alumnoId;

  // Rellenar selector de grupos
  const db = loadDB();
  const selectGrupo = document.getElementById('fGrupo');
  selectGrupo.innerHTML = '<option value="">Sin grupo</option>';
  db.grupos.forEach(g => {
    selectGrupo.innerHTML += `<option value="${g.id}">${escHtml(g.nombre)}</option>`;
  });

  if (alumnoId) {
    // Modo edición
    const alumno = getAlumnoPorId(db, alumnoId);
    if (!alumno) return;
    document.getElementById('modalTitle').textContent  = 'Editar Alumno';
    document.getElementById('btnGuardar').textContent  = 'Guardar cambios';
    document.getElementById('fNombre').value    = alumno.nombre;
    document.getElementById('fNivel').value     = alumno.nivel;
    document.getElementById('fGrupo').value     = alumno.grupoId || '';
    document.getElementById('fTelefono').value  = alumno.telefono || '';
    document.getElementById('fEmail').value     = alumno.email || '';
    document.getElementById('fFechaNac').value  = alumno.fechaNac || '';
    document.getElementById('fAvatar').value    = alumno.avatar || '';
  } else {
    // Modo nuevo
    document.getElementById('modalTitle').textContent = 'Nuevo Alumno';
    document.getElementById('btnGuardar').textContent = 'Guardar alumno';
    document.getElementById('fNombre').value    = '';
    document.getElementById('fNivel').value     = 'Principiante';
    document.getElementById('fGrupo').value     = '';
    document.getElementById('fTelefono').value  = '';
    document.getElementById('fEmail').value     = '';
    document.getElementById('fFechaNac').value  = '';
    document.getElementById('fAvatar').value    = '';
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

// Enter en nombre → guardar
document.getElementById('fNombre').addEventListener('keydown', e => {
  if (e.key === 'Enter') guardarAlumno();
});

// ── Guardar (crear o editar) ──────────────────────────────────
function guardarAlumno() {
  const nombre   = document.getElementById('fNombre').value.trim();
  const nivel    = document.getElementById('fNivel').value;
  const grupoId  = document.getElementById('fGrupo').value || null;
  const telefono = document.getElementById('fTelefono').value.trim();
  const email    = document.getElementById('fEmail').value.trim();
  const fechaNac = document.getElementById('fFechaNac').value;
  const avatar   = document.getElementById('fAvatar').value;

  // Validaciones
  if (!nombre) {
    showToast('⚠️ El nombre es obligatorio', 'toast-error');
    document.getElementById('fNombre').focus();
    return;
  }

  let db = loadDB();

  // Comprobar duplicado (excluir al propio si estamos editando)
  const duplicado = db.alumnos.some(a =>
    a.nombre.toLowerCase() === nombre.toLowerCase() && a.id !== editandoId
  );
  if (duplicado) {
    showToast('⚠️ Ya existe un alumno con ese nombre', 'toast-error');
    document.getElementById('fNombre').focus();
    return;
  }

  if (editandoId) {
    // ── EDITAR ──
    const alumno = getAlumnoPorId(db, editandoId);
    if (!alumno) return;

    alumno.nombre   = nombre;
    alumno.nivel    = nivel;
    alumno.telefono = telefono;
    alumno.email    = email;
    alumno.fechaNac = fechaNac;
    alumno.avatar   = avatar;

    // Reasignar grupo si cambió
    if (alumno.grupoId !== grupoId) {
      db = asignarAlumnoAGrupo(db, editandoId, grupoId);
    }

    saveDB(db);
    showToast(`✅ ${nombre} actualizado`);

  } else {
    // ── CREAR ──
    const nuevoAlumno = {
      id:       generarId('alu'),
      nombre,
      nivel,
      telefono,
      email,
      fechaNac,
      avatar,
      grupoId:  null,
      creadoEn: new Date().toISOString()
    };

    db.alumnos.push(nuevoAlumno);

    // Asignar grupo si se seleccionó
    if (grupoId) {
      db = asignarAlumnoAGrupo(db, nuevoAlumno.id, grupoId);
    }

    saveDB(db);
    showToast(`✅ ${nombre} añadido`);
  }

  cerrarModal();
  renderLista();
}

// ── Eliminar alumno ──────────────────────────────────────────
function eliminarAlumno(id) {
  const db = loadDB();
  const alumno = getAlumnoPorId(db, id);
  if (!alumno) return;

  if (!confirm(`¿Eliminar a "${alumno.nombre}"?\nSe eliminará de su grupo si está asignado.`)) return;

  const dbActualizado = eliminarAlumnoDeDB(db, id);
  saveDB(dbActualizado);
  showToast(`🗑️ ${alumno.nombre} eliminado`);
  renderLista();
}

// ── Expandir/colapsar card ───────────────────────────────────
function toggleCard(id) {
  const card = document.querySelector(`.item-card[data-id="${id}"]`);
  if (!card) return;
  // Cerrar otras abiertas
  document.querySelectorAll('.item-card.expanded').forEach(c => {
    if (c !== card) c.classList.remove('expanded');
  });
  card.classList.toggle('expanded');
}

// ── Render de la lista ───────────────────────────────────────
function renderLista() {
  const db     = loadDB();
  const filtro = searchInput.value.trim().toLowerCase();
  const lista  = document.getElementById('listaAlumnos');

  let alumnos = db.alumnos;

  // Filtrado
  if (filtro) {
    alumnos = alumnos.filter(a => {
      const grupo = a.grupoId ? getGrupoPorId(db, a.grupoId) : null;
      const nombreGrupo = grupo ? grupo.nombre.toLowerCase() : '';
      return a.nombre.toLowerCase().includes(filtro) || nombreGrupo.includes(filtro);
    });
  }

  // Contador
  document.getElementById('sectionCount').textContent =
    `${db.alumnos.length} alumno${db.alumnos.length !== 1 ? 's' : ''}`;

  if (db.alumnos.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <p>Aún no hay alumnos.<br>Pulsa <strong>＋</strong> para añadir el primero.</p>
      </div>`;
    return;
  }

  if (alumnos.length === 0 && filtro) {
    lista.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No hay alumnos que coincidan<br>con "<strong>${escHtml(filtro)}</strong>"</p>
      </div>`;
    return;
  }

  lista.innerHTML = alumnos.map(a => {
    const grupo = a.grupoId ? getGrupoPorId(db, a.grupoId) : null;
    const { iniciales, color } = avatarIniciales(a.nombre);
    const avatarHtml = a.avatar
      ? `<div class="avatar avatar-emoji">${a.avatar}</div>`
      : `<div class="avatar" style="background:${color}">${iniciales}</div>`;

    const edad = a.fechaNac ? calcularEdad(a.fechaNac) : null;

    return `
      <div class="item-card" data-id="${a.id}">
        <!-- Fila compacta -->
        <div class="card-compact" onclick="toggleCard('${a.id}')">
          ${avatarHtml}
          <div class="card-info">
            <div class="card-name">${escHtml(a.nombre)}</div>
            <div class="card-meta">
              <span class="badge badge-${a.nivel.toLowerCase()}">${a.nivel}</span>
              ${grupo ? `<span>· ${escHtml(grupo.nombre)}</span>` : '<span style="color:var(--gris-4)">· Sin grupo</span>'}
            </div>
          </div>
          <span class="chevron">▾</span>
        </div>

        <!-- Panel expandido -->
        <div class="card-expanded">
          <div class="card-fields">
            <div class="field-item">
              <span class="field-label">Teléfono</span>
              <span class="field-value">${a.telefono ? `<a href="tel:${escHtml(a.telefono)}" style="color:var(--verde)">${escHtml(a.telefono)}</a>` : '—'}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Email</span>
              <span class="field-value">${a.email ? escHtml(a.email) : '—'}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Edad</span>
              <span class="field-value">${edad !== null ? `${edad} años` : '—'}</span>
            </div>
            <div class="field-item">
              <span class="field-label">Grupo</span>
              <span class="field-value">${grupo ? escHtml(grupo.nombre) : 'Sin grupo'}</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn btn-secondary btn-sm" onclick="abrirModal('${a.id}')">✏️ Editar</button>
            <button class="btn btn-danger-ghost btn-sm" onclick="eliminarAlumno('${a.id}')">🗑️ Eliminar</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Calcular edad ────────────────────────────────────────────
function calcularEdad(fechaNac) {
  const hoy   = new Date();
  const nac   = new Date(fechaNac);
  let edad    = hoy.getFullYear() - nac.getFullYear();
  const m     = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

// ── Inicializar ───────────────────────────────────────────────
renderLista();
