/**
 * ============================================================
 * MÓDULO TORNEOS – Chema Pádel V2
 * FIXES: diferencia puntos, clasificación por jornada,
 *        puntuación Round Robin 2/1, búsqueda alumnos BBDD,
 *        filtros mejorados (jugador + grupo)
 * ============================================================
 */

let torneoActualId  = null;
let jornadaActual   = 0;
let filtroTipo      = '';
let filtroJugador   = '';
let filtroGrupoId   = '';

const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, tipo = 'toast-success') {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.className = `show ${tipo}`;
  toastTimer = setTimeout(() => { toastEl.className = ''; }, 2800);
}

// ════════════════════════════════════════════════════════════
// ── VISTA LISTA
// ════════════════════════════════════════════════════════════

function setFiltroTipo(el, tipo) {
  filtroTipo = tipo;
  document.querySelectorAll('#filterTipo .filter-chip').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderLista();
}

function renderLista() {
  const db      = loadDB();
  const torneos = db.torneos || [];
  const lista   = document.getElementById('listaTorneos');
  const grupos  = db.grupos  || [];
  const alumnos = db.alumnos || [];

  const selGrupoFiltro = document.getElementById('filtroGrupoSelect');
  if (selGrupoFiltro) {
    const valActual = selGrupoFiltro.value;
    selGrupoFiltro.innerHTML = '<option value="">Todos los grupos</option>' +
      grupos.map(g => `<option value="${g.id}">${escHtml(g.nombre)}</option>`).join('');
    selGrupoFiltro.value = valActual;
  }

  document.getElementById('sectionCount').textContent =
    `${torneos.length} torneo${torneos.length !== 1 ? 's' : ''}`;

  let filtrados = [...torneos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (filtroTipo) filtrados = filtrados.filter(t => t.tipo === filtroTipo);

  if (filtroJugador) {
    const fj = filtroJugador.toLowerCase();
    filtrados = filtrados.filter(t =>
      (t.participantes || []).some(p => p.nombre.toLowerCase().includes(fj))
    );
  }
  if (filtroGrupoId) {
    const alumnosGrupo = alumnos.filter(a => a.grupoId === filtroGrupoId).map(a => a.id);
    filtrados = filtrados.filter(t =>
      (t.participantes || []).some(p => alumnosGrupo.includes(p.alumnoId))
    );
  }

  if (torneos.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">🏆</div>
      <p>Aún no hay torneos.<br>Pulsa <strong>＋</strong> para crear el primero.</p></div>`;
    return;
  }
  if (filtrados.length === 0) {
    lista.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div>
      <p>No hay torneos con esos filtros.</p></div>`;
    return;
  }

  lista.innerHTML = filtrados.map(t => {
    const tipoClase   = tipoACss(t.tipo);
    const estadoBadge = `badge-${t.estado.toLowerCase().replace(' ', '-')}`;
    const fecha = new Date(t.fecha + 'T12:00:00').toLocaleDateString('es-ES',
      { day: 'numeric', month: 'short', year: 'numeric' });
    const nJugadores  = (t.participantes||[]).length;

    // Top 3 clasificados (si hay jornadas jugadas)
    let top3Html = '';
    const jornadasJugadas = (t.jornadas||[]).filter(j => j.partidos.some(p => p.finalizado));
    if (jornadasJugadas.length > 0) {
      const clasif = calcularClasificacion(t, t.jornadas.length - 1).slice(0, 3);
      const medallas = ['🥇','🥈','🥉'];
      top3Html = `<div class="top3-row">
        ${clasif.map((r,i) => `
          <div class="top3-item">
            <span class="top3-medal">${medallas[i]}</span>
            <div class="top3-nombre">${escHtml(r.nombre.split(' ')[0])}</div>
            <div class="top3-pts">${r.pts} pts</div>
          </div>`).join('')}
      </div>`;
    }

    return `
      <div class="torneo-card" id="tc_${t.id}">
        <div class="torneo-compact" onclick="toggleTorneoCard('${t.id}')">
          <div class="torneo-tipo-icon">${tipoAEmoji(t.tipo)}</div>
          <div class="card-info">
            <div class="card-name">${escHtml(t.nombre)}</div>
            <div class="card-meta">
              <span class="tipo-chip ${tipoClase}">${t.tipo}</span>
              <span class="badge badge-estado ${estadoBadge}">${t.estado}</span>
              <span>· ${fecha} · ${nJugadores} jug.</span>
            </div>
          </div>
          <span class="torneo-chevron chevron" style="transition:transform 0.2s,color 0.2s;">∨</span>
        </div>
        <div class="torneo-expanded">
          <div class="torneo-info-grid">
            <div><div class="field-label">Fecha</div><div class="field-value">${fecha}${t.hora ? ' · '+t.hora : ''}</div></div>
            <div><div class="field-label">Jugadores</div><div class="field-value">${nJugadores} jugadores</div></div>
            <div><div class="field-label">Pistas</div><div class="field-value">${t.pistas} pista${t.pistas>1?'s':''}</div></div>
            <div><div class="field-label">Jornadas</div><div class="field-value">${(t.jornadas||[]).length} jugadas</div></div>
          </div>
          ${top3Html}
          <div class="torneo-actions">
            <button class="btn btn-primary" onclick="abrirTorneo('${t.id}')">🏆 Entrar</button>
            <button class="btn btn-danger-ghost btn-sm" onclick="confirmarEliminarTorneo('${t.id}','${escHtml(t.nombre).replace(/'/g,"\'")}')">🗑️ Borrar</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleTorneoCard(id) {
  const card = document.getElementById(`tc_${id}`);
  if (!card) return;
  // Close all others
  document.querySelectorAll('.torneo-card.expanded').forEach(el => {
    if (el.id !== `tc_${id}`) el.classList.remove('expanded');
  });
  card.classList.toggle('expanded');
}

function confirmarEliminarTorneo(id, nombre) {
  if (!confirm(`¿Eliminar el torneo "${nombre}"? Esta acción no se puede deshacer.`)) return;
  const db = loadDB();
  db.torneos = (db.torneos || []).filter(t => t.id !== id);
  saveDB(db);
  showToast('🗑️ Torneo eliminado');
  renderLista();
}

function tipoAEmoji(tipo) {
  return {'Round Robin':'🔄','Americano':'🇺🇸','Mexicano':'🇲🇽','Escalera':'🪜'}[tipo]||'🏆';
}
function tipoACss(tipo) {
  return {'Round Robin':'tipo-robin','Americano':'tipo-americano',
          'Mexicano':'tipo-mexicano','Escalera':'tipo-escalera'}[tipo]||'';
}

// ════════════════════════════════════════════════════════════
// ── MODAL CREAR TORNEO
// ════════════════════════════════════════════════════════════

function abrirModal() {
  const hoy = new Date().toISOString().slice(0, 10);
  document.getElementById('fFecha').value    = hoy;
  document.getElementById('fNombre').value   = '';
  document.getElementById('fTipo').value     = 'Americano';
  document.getElementById('fPistas').value   = '2';
  document.getElementById('fSistema').value  = 'puntos';
  document.getElementById('fCantidad').value = '24';
  document.getElementById('fDuracion').value = '90 min';
  onTipoChange();
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('fNombre').focus(), 300);
}
function cerrarModal() { document.getElementById('modalOverlay').classList.remove('open'); }
function cerrarModalOverlay(e) { if (e.target === document.getElementById('modalOverlay')) cerrarModal(); }

function onTipoChange() {
  const tipo = document.getElementById('fTipo').value;
  const sel  = document.getElementById('fPistas');
  if (tipo === 'Americano') {
    sel.innerHTML = '<option value="1">1 pista (4 jugadores)</option>' +
      '<option value="2" selected>2 pistas (8 jugadores)</option>' +
      '<option value="3">3 pistas (12 jugadores)</option>';
  } else {
    sel.innerHTML = '<option value="2" selected>2 pistas (8 jugadores)</option>' +
      '<option value="3">3 pistas (12 jugadores)</option>';
  }
  onPistasChange();
}

function onPistasChange() {
  const tipo   = document.getElementById('fTipo').value;
  const pistas = parseInt(document.getElementById('fPistas').value);
  const n      = tipo === 'Americano' && pistas === 1 ? 4 : pistas * 4;
  document.getElementById('labelParticipantes').textContent = `Participantes (${n})`;
  renderParticipantesInputs(n, tipo);
}

// ── Búsqueda de alumnos desde BBDD ───────────────────────────
function renderParticipantesInputs(n, tipo) {
  const esEscalera = tipo === 'Escalera';
  const mitad      = n / 2;
  const db         = loadDB();
  const grupos     = db.grupos || [];

  const optsGrupos = grupos.map(g =>
    `<option value="${g.id}">${escHtml(g.nombre)}</option>`).join('');

  let html = `
    <div style="background:var(--gris-5);border-radius:var(--radio-sm);padding:10px;margin-bottom:10px;">
      <div style="font-size:.75rem;font-weight:700;color:var(--gris-3);margin-bottom:6px;">🔍 FILTRAR POR GRUPO</div>
      <select id="filtroGrupoParticipante" onchange="filtrarAlumnosParticipantes()"
        style="width:100%;padding:8px;border:2px solid var(--gris-4);border-radius:6px;
               font-family:inherit;font-size:.85rem;background:var(--blanco);outline:none;">
        <option value="">Todos los grupos</option>
        ${optsGrupos}
      </select>
    </div>`;

  for (let i = 0; i < n; i++) {
    const rolDefault = esEscalera ? (i < mitad ? 'estrella' : 'promesa') : null;
    html += `
      <div class="participante-row" id="prow_${i}">
        <span class="participante-num">${i + 1}</span>
        <div style="flex:1;position:relative;">
          <input type="text" id="p_${i}" placeholder="Buscar alumno…" autocomplete="off"
            oninput="buscarAlumno(${i})" onfocus="buscarAlumno(${i})"
            style="width:100%;padding:7px 10px;border:2px solid var(--gris-5);border-radius:6px;
                   font-family:inherit;font-size:.88rem;background:var(--gris-5);
                   outline:none;box-sizing:border-box;" />
          <input type="hidden" id="pid_${i}" />
          <div id="pdrop_${i}" style="display:none;position:absolute;top:100%;left:0;right:0;
            background:var(--blanco);border:2px solid var(--verde);border-radius:6px;
            box-shadow:var(--sombra);z-index:100;max-height:160px;overflow-y:auto;"></div>
        </div>
        ${esEscalera ? `
          <button class="rol-btn" id="rol_${i}" data-rol="${rolDefault}" onclick="toggleRol(${i})"
            style="background:${rolDefault==='estrella'?'#fef9e7':'#f4ecf7'};
                   padding:5px 10px;border-radius:20px;border:none;font-size:.85rem;cursor:pointer;">
            ${rolDefault==='estrella'?'⭐':'🌟'}
          </button>` : ''}
      </div>`;
  }
  document.getElementById('participantesContainer').innerHTML = html;
}

function filtrarAlumnosParticipantes() {
  const n = parseInt(document.getElementById('labelParticipantes').textContent.match(/\d+/)[0]);
  for (let i = 0; i < n; i++) {
    const inp = document.getElementById(`p_${i}`);
    if (inp && document.activeElement === inp) buscarAlumno(i);
  }
}

function buscarAlumno(idx) {
  const inp         = document.getElementById(`p_${idx}`);
  const drop        = document.getElementById(`pdrop_${idx}`);
  const texto       = inp.value.toLowerCase().trim();
  const db          = loadDB();
  const alumnos     = db.alumnos || [];
  const grupoFiltro = document.getElementById('filtroGrupoParticipante')?.value || '';
  const n           = parseInt(document.getElementById('labelParticipantes').textContent.match(/\d+/)[0]);

  const yaSeleccionados = [];
  for (let i = 0; i < n; i++) {
    if (i !== idx) {
      const pid = document.getElementById(`pid_${i}`)?.value;
      if (pid) yaSeleccionados.push(pid);
    }
  }

  let candidatos = alumnos.filter(a => !yaSeleccionados.includes(a.id));
  if (grupoFiltro) candidatos = candidatos.filter(a => a.grupoId === grupoFiltro);
  if (texto)       candidatos = candidatos.filter(a => a.nombre.toLowerCase().includes(texto));

  if (candidatos.length === 0) { drop.style.display = 'none'; return; }

  drop.innerHTML = candidatos.slice(0, 8).map(a => {
    const grupo = a.grupoId ? (db.grupos||[]).find(g => g.id === a.grupoId) : null;
    return `
      <div onclick="seleccionarAlumno(${idx},'${a.id}','${escHtml(a.nombre).replace(/'/g,"\\'")}')"
        style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--gris-5);font-size:.85rem;"
        onmouseover="this.style.background='var(--gris-5)'"
        onmouseout="this.style.background=''">
        <span style="font-weight:600;">${escHtml(a.nombre)}</span>
        <span style="font-size:.72rem;color:var(--gris-3);margin-left:6px;">
          ${a.nivel}${grupo?' · '+escHtml(grupo.nombre):''}
        </span>
      </div>`;
  }).join('');
  drop.style.display = 'block';

  setTimeout(() => {
    document.addEventListener('click', function cerrar(e) {
      if (!drop.contains(e.target) && e.target !== inp) {
        drop.style.display = 'none';
        document.removeEventListener('click', cerrar);
      }
    });
  }, 100);
}

function seleccionarAlumno(idx, alumnoId, nombre) {
  document.getElementById(`p_${idx}`).value             = nombre;
  document.getElementById(`pid_${idx}`).value           = alumnoId;
  document.getElementById(`pdrop_${idx}`).style.display = 'none';
  document.getElementById(`p_${idx}`).style.borderColor = 'var(--verde)';
  document.getElementById(`p_${idx}`).style.background  = 'var(--blanco)';
}

function toggleRol(i) {
  const btn  = document.getElementById(`rol_${i}`);
  const nuevo = btn.dataset.rol === 'estrella' ? 'promesa' : 'estrella';
  btn.dataset.rol      = nuevo;
  btn.textContent      = nuevo === 'estrella' ? '⭐' : '🌟';
  btn.style.background = nuevo === 'estrella' ? '#fef9e7' : '#f4ecf7';
}

function crearTorneo() {
  const nombre   = document.getElementById('fNombre').value.trim();
  const tipo     = document.getElementById('fTipo').value;
  const fecha    = document.getElementById('fFecha').value;
  const hora     = document.getElementById('fHora').value;
  const pistas   = parseInt(document.getElementById('fPistas').value);
  const sistema  = document.getElementById('fSistema').value;
  const cantidad = parseInt(document.getElementById('fCantidad').value) || 24;
  const duracion = document.getElementById('fDuracion').value;

  if (!nombre || !fecha) { showToast('⚠️ Nombre y fecha son obligatorios','toast-error'); return; }

  const nJugadores = tipo === 'Americano' && pistas === 1 ? 4 : pistas * 4;
  const participantes = [];
  const db = loadDB();

  for (let i = 0; i < nJugadores; i++) {
    const nombreP  = document.getElementById(`p_${i}`)?.value.trim();
    const alumnoId = document.getElementById(`pid_${i}`)?.value.trim();
    if (!nombreP) { showToast(`⚠️ Falta el jugador ${i+1}`,'toast-error'); return; }

    let alumnoIdFinal = alumnoId;
    if (!alumnoIdFinal) {
      const enc = (db.alumnos||[]).find(a => a.nombre.toLowerCase()===nombreP.toLowerCase());
      if (enc) alumnoIdFinal = enc.id;
    }
    const rolBtn = document.getElementById(`rol_${i}`);
    participantes.push({
      id: `jug_${i}_${Date.now()}`,
      alumnoId: alumnoIdFinal || null,
      nombre: nombreP,
      rol: rolBtn ? rolBtn.dataset.rol : null
    });
  }

  const jornadas = generarJornadas(tipo, participantes, pistas);
  const torneo = {
    id: generarId('tor'), nombre, tipo, fecha, hora, pistas,
    sistema, cantidad, duracion, participantes, jornadas,
    estado: 'En curso', creadoEn: new Date().toISOString()
  };

  if (!db.torneos) db.torneos = [];
  db.torneos.push(torneo);
  saveDB(db);
  cerrarModal();
  showToast(`🏆 "${nombre}" creado`);
  renderLista();
  abrirTorneo(torneo.id);
}

// ════════════════════════════════════════════════════════════
// ── GENERACIÓN DE JORNADAS
// ════════════════════════════════════════════════════════════

function generarJornadas(tipo, participantes, pistas) {
  switch(tipo) {
    case 'Round Robin': return generarRoundRobin(participantes, pistas);
    case 'Americano':   return generarAmericano(participantes, pistas);
    case 'Mexicano':    return generarMexicano(participantes, pistas);
    case 'Escalera':    return generarEscalera(participantes, pistas);
    default: return [];
  }
}

function generarRoundRobin(participantes, pistas) {
  const parejas = [];
  for (let i = 0; i < participantes.length; i += 2)
    parejas.push([participantes[i].id, participantes[i+1].id]);

  const cal4 = [[[0,1],[2,3]],[[0,2],[1,3]],[[0,3],[1,2]]];
  const cal6 = [[[0,1],[2,3],[4,5]],[[0,2],[1,4],[3,5]],
                [[0,3],[1,5],[2,4]],[[0,4],[1,3],[2,5]],[[0,5],[1,2],[3,4]]];
  const calendario = parejas.length === 4 ? cal4 : cal6;

  return calendario.map((ronda, ji) => ({
    numero: ji+1,
    partidos: ronda.map((par, pi) => ({
      id:`p${ji}_${pi}`, pista:pi+1,
      equipoA:parejas[par[0]], equipoB:parejas[par[1]],
      scoreA:null, scoreB:null, finalizado:false
    }))
  }));
}

function generarAmericano(participantes, pistas) {
  const ids = participantes.map(p => p.id);
  const n   = ids.length;
  const tablas = {
    // 4 jugadores, 1 pista, 3 jornadas
    4: [
      [[0,1],[2,3]], [[0,2],[1,3]], [[0,3],[1,2]]
    ],
    // 8 jugadores, 2 pistas, 7 jornadas
    // Emparejamientos exactos proporcionados por Chema (jug1=idx0 ... jug8=idx7)
    // J1: jug8-jug7 vs jug6-jug3 | jug2-jug1 vs jug4-jug5
    // J2: jug7-jug4 vs jug8-jug5 | jug3-jug2 vs jug6-jug1
    // J3: jug8-jug3 vs jug5-jug2 | jug4-jug1 vs jug7-jug6
    // J4: jug5-jug7 vs jug2-jug6 | jug1-jug3 vs jug4-jug8
    // J5: jug1-jug5 vs jug3-jug7 | jug6-jug8 vs jug2-jug4
    // J6: jug3-jug4 vs jug7-jug2 | jug5-jug6 vs jug8-jug1
    // J7: jug4-jug6 vs jug5-jug3 | jug2-jug8 vs jug1-jug7
    8: [
      [ [[7,6],[5,2]], [[1,0],[3,4]] ],
      [ [[6,3],[7,4]], [[2,1],[5,0]] ],
      [ [[7,2],[4,1]], [[3,0],[6,5]] ],
      [ [[4,6],[1,5]], [[0,2],[3,7]] ],
      [ [[0,4],[2,6]], [[5,7],[1,3]] ],
      [ [[2,3],[6,1]], [[4,5],[7,0]] ],
      [ [[3,5],[4,2]], [[1,7],[0,6]] ]
    ],
    // 12 jugadores, 3 pistas, 11 jornadas
    // Emparejamientos exactos proporcionados por Chema (jug1=idx0 ... jug12=idx11)
    12: [
      [ [[4,6],[8,9]], [[0,11],[1,7]], [[2,5],[3,10]] ],
      [ [[3,11],[4,10]], [[5,8],[2,6]], [[7,9],[0,1]] ],
      [ [[0,8],[5,9]], [[1,10],[3,4]], [[6,11],[2,7]] ],
      [ [[2,4],[6,7]], [[9,11],[5,10]], [[0,3],[1,8]] ],
      [ [[1,11],[2,8]], [[3,6],[0,4]], [[5,7],[9,10]] ],
      [ [[6,9],[3,7]], [[8,10],[1,2]], [[4,11],[0,5]] ],
      [ [[0,2],[4,5]], [[7,11],[3,8]], [[1,9],[6,10]] ],
      [ [[10,11],[0,6]], [[1,4],[2,9]], [[3,5],[7,8]] ],
      [ [[4,7],[1,5]], [[6,8],[0,10]], [[2,11],[3,9]] ],
      [ [[0,9],[2,3]], [[5,11],[1,6]], [[7,10],[4,8]] ],
      [ [[8,11],[4,9]], [[2,10],[0,7]], [[1,3],[5,6]] ]
    ]
  };
  const tabla = tablas[n] || tablas[8];
  return tabla.map((ronda, ji) => ({
    numero: ji+1,
    partidos: (n===4?[ronda]:ronda).map((partido, pi) => ({
      id:`p${ji}_${pi}`, pista:pi+1,
      equipoA:[ids[partido[0][0]],ids[partido[0][1]]],
      equipoB:[ids[partido[1][0]],ids[partido[1][1]]],
      scoreA:null, scoreB:null, finalizado:false
    }))
  }));
}

function generarMexicano(participantes, pistas) {
  const ids = shuffle([...participantes.map(p => p.id)]);
  return [generarJornadaMexicano(ids, pistas, 1)];
}

function generarJornadaMexicano(ids, pistas, numero) {
  const partidos = [];
  for (let p = 0; p < pistas; p++) {
    const g = ids.slice(p*4, p*4+4);
    const combos = [[[g[0],g[1]],[g[2],g[3]]],[[g[0],g[2]],[g[1],g[3]]],[[g[0],g[3]],[g[1],g[2]]]];
    combos.forEach((c,ci) => partidos.push({
      id:`j${numero}_p${p}_m${ci}`, pista:p+1, miniPartido:ci+1,
      equipoA:c[0], equipoB:c[1], scoreA:null, scoreB:null, finalizado:false
    }));
  }
  return { numero, partidos };
}

function generarEscalera(participantes, pistas) {
  const estrellas = shuffle(participantes.filter(p=>p.rol==='estrella').map(p=>p.id));
  const promesas  = shuffle(participantes.filter(p=>p.rol==='promesa').map(p=>p.id));
  return [generarJornadaEscalera(estrellas, promesas, pistas, 1, [])];
}

function generarJornadaEscalera(estrellas, promesas, pistas, numero, historialPartidos) {
  /*
   * Cada pista tiene 2 estrellas + 2 promesas (asignadas por rotación).
   * Intentar NO repetir pareja respecto a la jornada ANTERIOR (historialPartidos).
   * Solo hay 2 opciones dentro de cada pista:
   *   Opción A: e1+pr1 vs e2+pr2
   *   Opción B: e1+pr2 vs e2+pr1
   * Se elige la que no repite. Si las dos repiten, se usa A (sin problema).
   * NUNCA se cruzan jugadores entre pistas.
   */

  // Parejas de la jornada anterior
  const parejaAnterior = new Set();
  (historialPartidos || []).forEach(p => {
    if (p.equipoA?.length === 2) {
      parejaAnterior.add(`${p.equipoA[0]}_${p.equipoA[1]}`);
      parejaAnterior.add(`${p.equipoA[1]}_${p.equipoA[0]}`);
    }
    if (p.equipoB?.length === 2) {
      parejaAnterior.add(`${p.equipoB[0]}_${p.equipoB[1]}`);
      parejaAnterior.add(`${p.equipoB[1]}_${p.equipoB[0]}`);
    }
  });

  const repite = (a, b) => parejaAnterior.has(`${a}_${b}`);

  const partidos = [];
  for (let p = 0; p < pistas; p++) {
    const e1  = estrellas[p * 2];
    const e2  = estrellas[p * 2 + 1];
    const pr1 = promesas[p * 2];
    const pr2 = promesas[p * 2 + 1];

    if (!e1 || !e2 || !pr1 || !pr2) continue;

    // Opción A: e1+pr1 vs e2+pr2
    const repiteA = repite(e1, pr1) || repite(e2, pr2);
    // Opción B: e1+pr2 vs e2+pr1
    const repiteB = repite(e1, pr2) || repite(e2, pr1);

    // Usar B solo si mejora respecto a A (A repite y B no)
    let parA, parB;
    if (repiteA && !repiteB) {
      parA = [e1, pr2];
      parB = [e2, pr1];
    } else {
      parA = [e1, pr1];
      parB = [e2, pr2];
    }

    partidos.push({
      id: `j${numero}_p${p}`,
      pista: p + 1,
      equipoA: parA,
      equipoB: parB,
      scoreA: null, scoreB: null, finalizado: false
    });
  }
  return { numero, partidos, estrellas, promesas };
}

// ════════════════════════════════════════════════════════════
// ── VISTA INTERIOR
// ════════════════════════════════════════════════════════════

function abrirTorneo(id) {
  torneoActualId = id;
  jornadaActual  = 0;
  document.getElementById('vistaLista').style.display     = 'none';
  document.getElementById('vistaInterior').style.display  = 'block';
  document.getElementById('fabBtn').style.display         = 'none';
  document.getElementById('btnVolver').style.display      = 'flex';
  document.getElementById('btnHistoryBack').style.display = 'none';

  const db     = loadDB();
  const torneo = (db.torneos||[]).find(t=>t.id===id);
  if (!torneo) return;

  document.getElementById('torneoNombreHeader').textContent = torneo.nombre;
  document.getElementById('headerSub').textContent = `${tipoAEmoji(torneo.tipo)} ${torneo.tipo}`;
  const fecha = new Date(torneo.fecha+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
  document.getElementById('torneoInfoHeader').textContent =
    `${fecha}${torneo.hora?' · '+torneo.hora:''} · ${torneo.participantes.length} jugadores · ${torneo.estado}`;

  const sel = document.getElementById('selJornada');
  sel.innerHTML = torneo.jornadas.map((j,i)=>`<option value="${i}">Jornada ${j.numero}</option>`).join('');

  renderJornada(0);
  renderControles(torneo);
}

function volverALista() {
  torneoActualId = null;
  document.getElementById('vistaLista').style.display     = 'block';
  document.getElementById('vistaInterior').style.display  = 'none';
  document.getElementById('fabBtn').style.display         = 'flex';
  document.getElementById('btnVolver').style.display      = 'none';
  document.getElementById('btnHistoryBack').style.display = 'flex';
  document.getElementById('headerSub').textContent        = '🏆 Torneos';
  renderLista();
}

function cambiarJornada(delta) {
  const db     = loadDB();
  const torneo = (db.torneos||[]).find(t=>t.id===torneoActualId);
  if (!torneo) return;
  const nuevo = jornadaActual + delta;
  if (nuevo < 0 || nuevo >= torneo.jornadas.length) return;
  renderJornada(nuevo);
}

function renderJornada(idx) {
  jornadaActual = idx;
  const db     = loadDB();
  const torneo = (db.torneos||[]).find(t=>t.id===torneoActualId);
  if (!torneo) return;

  document.getElementById('selJornada').value              = idx;
  document.getElementById('btnJornadaAnterior').disabled   = idx === 0;
  document.getElementById('btnJornadaSiguiente').disabled  = idx >= torneo.jornadas.length-1;

  const jornada      = torneo.jornadas[idx];
  const container    = document.getElementById('partidosContainer');
  const esFinalizado = torneo.estado === 'Finalizado';

  const porPista = {};
  jornada.partidos.forEach(p => { if (!porPista[p.pista]) porPista[p.pista]=[]; porPista[p.pista].push(p); });
  container.innerHTML = Object.entries(porPista)
    .map(([,ps]) => ps.map(p => renderPartido(p,torneo,esFinalizado)).join('')).join('');

  // ✅ FIX: clasificación acumulada solo hasta esta jornada
  renderClasificacion(torneo, idx);
}

function renderPartido(partido, torneo, soloLectura) {
  const nombreA  = getNombresEquipo(partido.equipoA, torneo.participantes);
  const nombreB  = getNombresEquipo(partido.equipoB, torneo.participantes);
  const scoreA   = partido.scoreA !== null ? partido.scoreA : '';
  const scoreB   = partido.scoreB !== null ? partido.scoreB : '';
  const claseA   = partido.finalizado ? (partido.scoreA > partido.scoreB ? 'ganador':'perdedor') : '';
  const claseB   = partido.finalizado ? (partido.scoreB > partido.scoreA ? 'ganador':'perdedor') : '';
  const miniLabel = partido.miniPartido ? ` · Partido ${partido.miniPartido}` : '';

  return `
    <div class="partido-card ${partido.finalizado?'finalizado':''}" id="card_${partido.id}">
      <div class="partido-pista">🎾 PISTA ${partido.pista}${miniLabel}${partido.finalizado?' ✅':''}</div>
      <div class="partido-body">
        <div class="partido-equipos">
          <div class="equipo">${escHtml(nombreA)}</div>
          <div class="vs-badge">VS</div>
          <div class="equipo">${escHtml(nombreB)}</div>
        </div>
        <div class="partido-scores">
          <input class="score-input ${claseA}" type="number" min="0" max="99"
            id="sA_${partido.id}" value="${scoreA}" placeholder="${torneo.cantidad}"
            ${soloLectura||partido.finalizado?'readonly':''}
            onchange="onScoreChange('${partido.id}')" />
          <span class="score-sep">—</span>
          <input class="score-input ${claseB}" type="number" min="0" max="99"
            id="sB_${partido.id}" value="${scoreB}" placeholder="${torneo.cantidad}"
            ${soloLectura||partido.finalizado?'readonly':''}
            onchange="onScoreChange('${partido.id}')" />
        </div>
        ${!soloLectura?`
        <div class="partido-btns">
          ${!partido.finalizado
            ?`<button class="btn btn-primary btn-sm" onclick="finalizarPartido('${partido.id}')">✅ Finalizar</button>`
            :`<button class="btn btn-secondary btn-sm" onclick="reiniciarPartido('${partido.id}')">🔄 Reiniciar</button>`}
        </div>`:''}
      </div>
    </div>`;
}

function getNombresEquipo(ids, participantes) {
  return ids.map(id => { const p=participantes.find(j=>j.id===id); return p?p.nombre:'?'; }).join(' & ');
}

function onScoreChange(partidoId) {
  const db=loadDB(), torneo=(db.torneos||[]).find(t=>t.id===torneoActualId);
  if (!torneo) return;
  const partido = encontrarPartido(torneo, partidoId);
  if (!partido||partido.finalizado) return;
  const sA=parseInt(document.getElementById(`sA_${partidoId}`).value);
  const sB=parseInt(document.getElementById(`sB_${partidoId}`).value);
  if (!isNaN(sA)) partido.scoreA=sA;
  if (!isNaN(sB)) partido.scoreB=sB;
  saveDB(db);
}

function finalizarPartido(partidoId) {
  const db=loadDB(), torneo=(db.torneos||[]).find(t=>t.id===torneoActualId);
  if (!torneo) return;
  const partido=encontrarPartido(torneo,partidoId);
  if (!partido) return;
  const sA=parseInt(document.getElementById(`sA_${partidoId}`).value);
  const sB=parseInt(document.getElementById(`sB_${partidoId}`).value);
  if (isNaN(sA)||isNaN(sB)) { showToast('⚠️ Introduce los marcadores primero','toast-error'); return; }
  if (torneo.tipo==='Escalera'&&sA===sB) { showToast('⚠️ En la Escalera no se permiten empates','toast-error'); return; }
  partido.scoreA=sA; partido.scoreB=sB; partido.finalizado=true;
  saveDB(db);
  showToast('✅ Partido finalizado');
  renderJornada(jornadaActual);
}

function reiniciarPartido(partidoId) {
  if (!confirm('¿Borrar el resultado de este partido?')) return;
  const db=loadDB(), torneo=(db.torneos||[]).find(t=>t.id===torneoActualId);
  if (!torneo) return;
  const partido=encontrarPartido(torneo,partidoId);
  if (!partido) return;
  partido.scoreA=null; partido.scoreB=null; partido.finalizado=false;
  saveDB(db);
  renderJornada(jornadaActual);
}

function encontrarPartido(torneo, partidoId) {
  for (const j of torneo.jornadas) { const p=j.partidos.find(p=>p.id===partidoId); if (p) return p; }
  return null;
}

function renderControles(torneo) {
  const cont = document.getElementById('torneoControls');
  if (torneo.estado === 'Finalizado') {
    cont.innerHTML = `
      <div style="font-size:.85rem;color:var(--verde-dark);font-weight:700;margin-bottom:8px;">🏁 Torneo finalizado</div>
      <button class="btn btn-danger-ghost btn-sm" onclick="eliminarTorneo()">🗑️ Eliminar torneo</button>`;
    return;
  }
  const tieneSig = ['Mexicano','Escalera'].includes(torneo.tipo);
  cont.innerHTML = `
    ${tieneSig ? `<button class="btn btn-primary" onclick="siguienteJornada()">➡️ Siguiente Jornada</button>` : ''}
    <button class="btn btn-danger-ghost" onclick="finalizarTorneo()">🏁 Finalizar Torneo</button>
    <button class="btn btn-secondary btn-sm" onclick="eliminarTorneo()">🗑️ Eliminar</button>`;
}

function siguienteJornada() {
  const db=loadDB(), torneo=(db.torneos||[]).find(t=>t.id===torneoActualId);
  if (!torneo) return;
  const jornadaActualObj = torneo.jornadas[torneo.jornadas.length-1];
  const pendientes = jornadaActualObj.partidos.filter(p=>!p.finalizado);
  if (pendientes.length>0) { showToast(`⚠️ Quedan ${pendientes.length} partido(s) por finalizar`,'toast-error'); return; }

  const clasificacion = calcularClasificacion(torneo, torneo.jornadas.length-1);
  const idsOrdenados  = clasificacion.map(r=>r.id);
  const pistas        = torneo.pistas;
  const numJornada    = torneo.jornadas.length+1;
  let nuevaJornada;

  if (torneo.tipo==='Mexicano') {
    nuevaJornada = generarJornadaMexicano(idsOrdenados, pistas, numJornada);
  } else if (torneo.tipo==='Escalera') {
    const nd = calcularRotacionEscalera(torneo, pistas);
    nuevaJornada = generarJornadaEscalera(nd.estrellas, nd.promesas, pistas, numJornada, jornadaActualObj.partidos);
  }

  if (nuevaJornada) {
    torneo.jornadas.push(nuevaJornada);
    saveDB(db);
    showToast(`✅ Jornada ${numJornada} generada`);
    const sel=document.getElementById('selJornada');
    sel.innerHTML = torneo.jornadas.map((j,i)=>`<option value="${i}">Jornada ${j.numero}</option>`).join('');
    renderJornada(torneo.jornadas.length-1);
    renderControles(torneo);
  }
}

function calcularRotacionEscalera(torneo, pistas) {
  /*
   * Rotación correcta Escalera:
   * Pista 1: Ganadores se quedan en P1 / Perdedores bajan a P2
   * Pista 2: Ganadores suben a P1     / Perdedores bajan a P3
   * Pista 3: Ganadores suben a P2     / Perdedores se quedan en P3
   * (Para 2 pistas: Gan P1 quedan P1, Per P1 bajan P2, Gan P2 suben P1, Per P2 quedan P2)
   */
  const ultimaJornada = torneo.jornadas[torneo.jornadas.length-1];

  // Recoger ganadores y perdedores de cada pista
  const porPista = {};
  ultimaJornada.partidos.forEach(p => {
    if (!porPista[p.pista]) porPista[p.pista] = p;
  });

  // pistaDestino[p] = array de IDs que van a la pista p en la siguiente jornada
  const pistaDestino = {};
  for (let p = 1; p <= pistas; p++) pistaDestino[p] = [];

  for (let p = 1; p <= pistas; p++) {
    const partido = porPista[p];
    if (!partido || !partido.finalizado) continue;

    const [ganadores, perdedores] = partido.scoreA > partido.scoreB
      ? [partido.equipoA, partido.equipoB]
      : [partido.equipoB, partido.equipoA];

    // Ganadores: suben una pista (mínimo P1)
    const pistaGan = Math.max(1, p - 1);
    // Perdedores: bajan una pista (máximo pistas)
    const pistaPer = Math.min(pistas, p + 1);

    pistaDestino[pistaGan].push(...ganadores);
    pistaDestino[pistaPer].push(...perdedores);
  }

  // Para cada pista destino, separar estrellas y promesas
  // y construir los arrays en orden de pista (P1 primero)
  const estrellasOrdenadas = [];
  const promesasOrdenadas  = [];

  for (let p = 1; p <= pistas; p++) {
    const jugadores = pistaDestino[p];
    const estr = jugadores.filter(id => {
      const jug = torneo.participantes.find(j => j.id === id);
      return jug && jug.rol === 'estrella';
    });
    const prom = jugadores.filter(id => {
      const jug = torneo.participantes.find(j => j.id === id);
      return jug && jug.rol === 'promesa';
    });
    // Shuffle dentro de cada pista para romper parejas anteriores
    estrellasOrdenadas.push(...shuffle(estr));
    promesasOrdenadas.push(...shuffle(prom));
  }

  return {
    estrellas: estrellasOrdenadas,
    promesas:  promesasOrdenadas,
    pistaDestino  // guardamos para usarlo en generarJornadaEscalera
  };
}

function finalizarTorneo() {
  if (!confirm('¿Finalizar el torneo? Ya no se podrán editar los resultados.')) return;
  const db=loadDB(), torneo=(db.torneos||[]).find(t=>t.id===torneoActualId);
  if (!torneo) return;
  torneo.estado='Finalizado';
  saveDB(db);
  showToast('🏁 Torneo finalizado');
  abrirTorneo(torneoActualId);
}

function eliminarTorneo() {
  const db=loadDB(), torneo=(db.torneos||[]).find(t=>t.id===torneoActualId);
  if (!torneo) return;
  if (!confirm(`¿Eliminar el torneo "${torneo.nombre}"?`)) return;
  db.torneos=db.torneos.filter(t=>t.id!==torneoActualId);
  saveDB(db);
  showToast('🗑️ Torneo eliminado');
  volverALista();
}

// ════════════════════════════════════════════════════════════
// ── CLASIFICACIÓN – acumulada hasta jornadaIdx ───────────────
// ════════════════════════════════════════════════════════════

function calcularClasificacion(torneo, hastaJornadaIdx) {
  const stats = {};
  torneo.participantes.forEach(p => {
    stats[p.id] = { id:p.id, nombre:p.nombre, rol:p.rol, pts:0, pg:0, pp:0, pf:0, pc:0 };
  });

  const limite = hastaJornadaIdx !== undefined ? hastaJornadaIdx : torneo.jornadas.length-1;

  torneo.jornadas.slice(0, limite+1).forEach(jornada => {
    jornada.partidos.forEach(partido => {
      if (!partido.finalizado) return;

      const sA   = partido.scoreA;
      const sB   = partido.scoreB;
      const ganA = sA > sB;  // ✅ FIX: A gana si scoreA > scoreB

      const procesarEquipo = (ids, puntosPartido, gano) => {
        ids.forEach(id => {
          if (!stats[id]) return;

          // Puntos de clasificación
          if (torneo.tipo === 'Round Robin' || torneo.tipo === 'Escalera') {
            // ✅ FIX Round Robin: 2pts victoria, 1pt derrota (no puntos del marcador)
            stats[id].pts += gano ? 2 : 1;
          } else {
            // Americano/Mexicano: acumula los puntos reales del marcador
            stats[id].pts += puntosPartido;
          }

          stats[id].pg += gano ? 1 : 0;
          stats[id].pp += gano ? 0 : 1;

          // ✅ FIX diferencia: pf = puntos a favor, pc = puntos en contra
          // El ganador siempre tiene más puntos que el perdedor
          stats[id].pf += gano ? Math.max(sA,sB) : Math.min(sA,sB);
          stats[id].pc += gano ? Math.min(sA,sB) : Math.max(sA,sB);
        });
      };

      procesarEquipo(partido.equipoA, sA, ganA);
      procesarEquipo(partido.equipoB, sB, !ganA);
    });
  });

  return Object.values(stats).sort((a,b) => {
    if (b.pts!==a.pts) return b.pts-a.pts;
    if (b.pg !==a.pg)  return b.pg-a.pg;
    const difA=a.pf-a.pc, difB=b.pf-b.pc;
    if (difB!==difA) return difB-difA;
    return Math.random()-0.5;
  });
}

function renderClasificacion(torneo, hastaJornadaIdx) {
  const clasificacion = calcularClasificacion(torneo, hastaJornadaIdx);
  const medallas      = ['🥇','🥈','🥉'];
  const container     = document.getElementById('clasificacionContainer');
  const label         = hastaJornadaIdx !== undefined ? `tras J${hastaJornadaIdx+1}` : '';

  container.innerHTML = `
    <div style="font-family:'Bebas Neue',cursive;font-size:1.1rem;letter-spacing:1.5px;
      margin-bottom:8px;color:var(--gris-3);">📊 Clasificación ${label}</div>
    <table class="clasificacion-table">
      <thead><tr><th>#</th><th>Jugador</th><th>PTS</th><th>PG</th><th>DIF</th></tr></thead>
      <tbody>
        ${clasificacion.map((r,i) => {
          const dif = r.pf-r.pc;
          const rolBadge = r.rol==='estrella'?' ⭐':r.rol==='promesa'?' 🌟':'';
          return `
            <tr>
              <td><span class="pos-medal">${medallas[i]||(i+1)}</span></td>
              <td>${escHtml(r.nombre)}${rolBadge}</td>
              <td><strong>${r.pts}</strong></td>
              <td>${r.pg}</td>
              <td style="color:${dif>=0?'var(--verde-dark)':'var(--rojo)'}">
                ${dif>=0?'+':''}${dif}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

function shuffle(arr) {
  for (let i=arr.length-1;i>0;i--) {
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

renderLista();
onTipoChange();
