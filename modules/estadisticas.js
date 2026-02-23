/**
 * ============================================================
 * MÓDULO ESTADÍSTICAS – Chema Pádel V2
 * 6 secciones: General, Alumnos, Grupos, Ejercicios, Clases, Torneos
 * Filtros por rango de fecha. Sin gráficos, solo números y listas.
 * ============================================================
 */

// ── Estado ───────────────────────────────────────────────────
let tabActual   = 'general';
let rangoActual = 'todo';

// ── Helpers de fecha ─────────────────────────────────────────
function fechaDesde(rango) {
  const hoy  = new Date();
  const d    = new Date(hoy);
  if (rango === 'semana')    d.setDate(hoy.getDate() - 7);
  else if (rango === 'mes')  d.setMonth(hoy.getMonth() - 1);
  else if (rango === 'trimestre') d.setMonth(hoy.getMonth() - 3);
  else if (rango === 'anio') d.setFullYear(hoy.getFullYear() - 1);
  else return null; // 'todo'
  return d.toISOString().slice(0, 10);
}

function enRango(fecha, desde) {
  if (!desde) return true;
  return fecha >= desde;
}

function formatFecha(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES',
    { day: 'numeric', month: 'short', year: 'numeric' });
}

function mesCorto(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short' });
}

// ── Tabs y rangos ─────────────────────────────────────────────
function setTab(tab, btn) {
  tabActual = tab;
  document.querySelectorAll('.stat-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTab();
}

function setRango(rango, btn) {
  rangoActual = rango;
  document.querySelectorAll('.rango-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTab();
}

function renderTab() {
  const content = document.getElementById('statContent');
  const db      = loadDB();
  const desde   = fechaDesde(rangoActual);

  switch (tabActual) {
    case 'general':    content.innerHTML = renderGeneral(db, desde);   break;
    case 'alumnos':    content.innerHTML = renderAlumnos(db, desde);   break;
    case 'grupos':     content.innerHTML = renderGrupos(db, desde);    break;
    case 'ejercicios': content.innerHTML = renderEjercicios(db, desde);break;
    case 'clases':     content.innerHTML = renderClases(db, desde);    break;
    case 'torneos':    content.innerHTML = renderTorneos(db, desde);   break;
  }
}

// ════════════════════════════════════════════════════════════
// ── GENERAL ──────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function renderGeneral(db, desde) {
  const clases   = (db.clases   || []).filter(c => enRango(c.fecha, desde));
  const torneos  = (db.torneos  || []).filter(t => enRango(t.fecha, desde));
  const alumnos  = db.alumnos  || [];
  const grupos   = db.grupos   || [];
  const ejercs   = db.ejercicios || [];

  const clasesReal = clases.filter(c => c.estado === 'Realizada');
  const torneosF   = torneos.filter(t => t.estado === 'Finalizado');

  // Clases por mes (últimos 6 meses)
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const mes = d.toISOString().slice(0, 7);
    meses.push({
      label: d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase(),
      n: (db.clases || []).filter(c => c.fecha.startsWith(mes) && c.estado === 'Realizada').length
    });
  }
  const maxMes = Math.max(...meses.map(m => m.n), 1);

  // Asistencia media por grupo
  const asistGrupos = grupos.map(g => {
    const cls = clasesReal.filter(c => c.grupoId === g.id);
    const total = cls.reduce((s, c) => s + (c.asistentes?.length || 0), 0);
    const media = cls.length > 0 ? (total / cls.length).toFixed(1) : '—';
    return { nombre: g.nombre, media };
  }).filter(r => r.media !== '—');

  return `
    <!-- KPIs -->
    <div class="stat-block">
      <div class="stat-block-title">📈 Resumen general</div>
      <div class="kpi-grid">
        <div class="kpi-item"><div class="kpi-value">${alumnos.length}</div><div class="kpi-label">Alumnos</div></div>
        <div class="kpi-item"><div class="kpi-value">${grupos.length}</div><div class="kpi-label">Grupos activos</div></div>
        <div class="kpi-item"><div class="kpi-value">${clasesReal.length}</div><div class="kpi-label">Clases realizadas</div></div>
        <div class="kpi-item"><div class="kpi-value">${torneosF.length}</div><div class="kpi-label">Torneos finalizados</div></div>
        <div class="kpi-item" style="grid-column:span 2"><div class="kpi-value">${ejercs.length}</div><div class="kpi-label">Ejercicios en BBDD</div></div>
      </div>
    </div>

    <!-- Clases por mes -->
    <div class="stat-block">
      <div class="stat-block-title">📅 Clases realizadas — últimos 6 meses</div>
      ${meses.every(m => m.n === 0)
        ? `<div class="no-data">Sin datos de clases aún</div>`
        : `<div class="month-bars">
            ${meses.map(m => `
              <div class="month-col">
                <div class="month-num">${m.n || ''}</div>
                <div class="month-bar" style="height:${Math.max(4, (m.n / maxMes) * 50)}px"></div>
                <div class="month-label">${m.label}</div>
              </div>`).join('')}
           </div>`}
    </div>

    <!-- Asistencia por grupo -->
    <div class="stat-block">
      <div class="stat-block-title">👨‍👩‍👧‍👦 Asistencia media por grupo</div>
      ${asistGrupos.length === 0
        ? `<div class="no-data">Sin datos de asistencia aún</div>`
        : asistGrupos.sort((a,b) => parseFloat(b.media) - parseFloat(a.media))
            .map(r => `
              <div style="display:flex;justify-content:space-between;align-items:center;
                padding:8px 0;border-bottom:1px solid var(--gris-5);font-size:.88rem;">
                <span style="font-weight:600;">${escHtml(r.nombre)}</span>
                <span style="font-family:'Bebas Neue',cursive;font-size:1.2rem;color:var(--verde)">
                  ${r.media} alumnos/clase</span>
              </div>`).join('')}
    </div>`;
}

// ════════════════════════════════════════════════════════════
// ── ALUMNOS ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function renderAlumnos(db, desde) {
  const alumnos  = db.alumnos || [];
  const clases   = (db.clases   || []).filter(c => enRango(c.fecha, desde) && c.estado === 'Realizada');
  const torneos  = (db.torneos  || []).filter(t => enRango(t.fecha, desde));

  if (alumnos.length === 0) return `<div class="no-data">Sin alumnos registrados.</div>`;

  // Ranking asistencias
  const rankAsist = alumnos.map(a => {
    const clAsist = clases.filter(c => (c.asistentes || []).includes(a.id));
    const clTotal = clases.filter(c => {
      const grupo = (db.grupos || []).find(g => g.id === c.grupoId);
      return grupo && (grupo.alumnos || []).includes(a.id);
    });
    const pct = clTotal.length > 0 ? Math.round((clAsist.length / clTotal.length) * 100) : 0;
    return { id: a.id, nombre: a.nombre, nivel: a.nivel, clAsist: clAsist.length, clTotal: clTotal.length, pct };
  }).sort((a, b) => b.clAsist - a.clAsist);

  // Ranking torneos
  const rankTorneos = alumnos.map(a => {
    let jugados = 0, victorias = 0;
    torneos.forEach(t => {
      const participa = (t.participantes || []).some(p => p.nombre === a.nombre);
      if (!participa) return;
      jugados++;
      // Victoria = 1er puesto en clasificación final
      if (t.estado === 'Finalizado') {
        const clasi = calcularClasifSimple(t);
        if (clasi[0]?.nombre === a.nombre) victorias++;
      }
    });
    return { nombre: a.nombre, jugados, victorias };
  }).filter(r => r.jugados > 0).sort((a, b) => b.victorias - a.victorias || b.jugados - a.jugados);

  // Selector individual
  const optsAlumnos = alumnos.map(a => `<option value="${a.id}">${escHtml(a.nombre)}</option>`).join('');

  return `
    <!-- Detalle individual -->
    <div class="stat-block">
      <div class="stat-block-title">👤 Detalle individual</div>
      <div class="selector-row">
        <select id="selAlumno" onchange="renderDetalleAlumno()">
          <option value="">— Selecciona alumno —</option>
          ${optsAlumnos}
        </select>
      </div>
      <div id="detalleAlumnoContent"></div>
    </div>

    <!-- Ranking asistencia -->
    <div class="stat-block">
      <div class="stat-block-title">🏃 Alumnos más activos</div>
      ${rankAsist.length === 0 || rankAsist.every(r => r.clAsist === 0)
        ? `<div class="no-data">Sin datos de asistencia</div>`
        : `<table class="ranking-table">
            ${rankAsist.slice(0, 10).map((r, i) => `
              <tr>
                <td class="ranking-pos">${['🥇','🥈','🥉'][i] || i+1}</td>
                <td>
                  <div class="ranking-name">${escHtml(r.nombre)}</div>
                  <div class="ranking-sub">${r.clAsist} de ${r.clTotal} clases (${r.pct}%)</div>
                  <div class="pct-bar-bg" style="margin-top:3px;">
                    <div class="pct-bar-fill" style="width:${r.pct}%;background:var(--verde)"></div>
                  </div>
                </td>
                <td class="ranking-val">${r.clAsist}</td>
              </tr>`).join('')}
           </table>`}
    </div>

    <!-- Hall of fame torneos -->
    <div class="stat-block">
      <div class="stat-block-title">🏆 Ranking de torneos</div>
      ${rankTorneos.length === 0
        ? `<div class="no-data">Sin datos de torneos</div>`
        : `<table class="ranking-table">
            ${rankTorneos.slice(0, 10).map((r, i) => `
              <tr>
                <td class="ranking-pos">${['🥇','🥈','🥉'][i] || i+1}</td>
                <td>
                  <div class="ranking-name">${escHtml(r.nombre)}</div>
                  <div class="ranking-sub">${r.jugados} torneo${r.jugados !== 1 ? 's' : ''} jugado${r.jugados !== 1 ? 's' : ''}</div>
                </td>
                <td class="ranking-val">${r.victorias} 🏆</td>
              </tr>`).join('')}
           </table>`}
    </div>`;
}

function renderDetalleAlumno() {
  const id = document.getElementById('selAlumno')?.value;
  if (!id) { document.getElementById('detalleAlumnoContent').innerHTML = ''; return; }

  const db      = loadDB();
  const desde   = fechaDesde(rangoActual);
  const alumno  = (db.alumnos || []).find(a => a.id === id);
  const clases  = (db.clases  || []).filter(c => enRango(c.fecha, desde) && c.estado === 'Realizada');
  const torneos = (db.torneos || []).filter(t => enRango(t.fecha, desde));
  const grupo   = alumno?.grupoId ? (db.grupos || []).find(g => g.id === alumno.grupoId) : null;

  const clAsist = clases.filter(c => (c.asistentes || []).includes(id));
  const clTotal = clases.filter(c => {
    const gr = (db.grupos || []).find(g => g.id === c.grupoId);
    return gr && (gr.alumnos || []).includes(id);
  });
  const pct     = clTotal.length > 0 ? Math.round((clAsist.length / clTotal.length) * 100) : 0;

  let torneosJugados = 0, victorias = 0;
  torneos.forEach(t => {
    if ((t.participantes || []).some(p => p.nombre === alumno.nombre)) {
      torneosJugados++;
      if (t.estado === 'Finalizado') {
        const clasi = calcularClasifSimple(t);
        if (clasi[0]?.nombre === alumno.nombre) victorias++;
      }
    }
  });

  document.getElementById('detalleAlumnoContent').innerHTML = `
    <div class="kpi-grid" style="margin-top:10px;">
      <div class="kpi-item"><div class="kpi-value">${clAsist.length}</div><div class="kpi-label">Clases asistidas</div></div>
      <div class="kpi-item"><div class="kpi-value">${pct}%</div><div class="kpi-label">% Asistencia</div></div>
      <div class="kpi-item"><div class="kpi-value">${torneosJugados}</div><div class="kpi-label">Torneos jugados</div></div>
      <div class="kpi-item"><div class="kpi-value">${victorias}</div><div class="kpi-label">Victorias 🏆</div></div>
    </div>
    <div style="font-size:.82rem;color:var(--gris-3);margin-top:8px;">
      Nivel: <strong>${alumno.nivel}</strong>
      ${grupo ? ` · Grupo: <strong>${escHtml(grupo.nombre)}</strong>` : ''}
    </div>`;
}

// ════════════════════════════════════════════════════════════
// ── GRUPOS ────────────────────────────────════════════════════
// ════════════════════════════════════════════════════════════
function renderGrupos(db, desde) {
  const grupos  = db.grupos || [];
  const clases  = (db.clases || []).filter(c => enRango(c.fecha, desde));

  if (grupos.length === 0) return `<div class="no-data">Sin grupos registrados.</div>`;

  // Stats por grupo
  const statsGrupos = grupos.map(g => {
    const cls      = clases.filter(c => c.grupoId === g.id);
    const real     = cls.filter(c => c.estado === 'Realizada');
    const susp     = cls.filter(c => c.estado === 'Suspendida');
    const fest     = cls.filter(c => c.estado === 'Festivo');
    const asist    = real.reduce((s, c) => s + (c.asistentes?.length || 0), 0);
    const media    = real.length > 0 ? (asist / real.length).toFixed(1) : '—';
    const ultima   = cls.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    const efect    = cls.length > 0 ? Math.round((real.length / cls.length) * 100) : 0;

    // Ejercicios más usados por este grupo
    const ejCount = {};
    real.forEach(c => (c.bloques || []).forEach(b => {
      if (b.ejercicioId && !b.noRealizado) ejCount[b.ejercicioId] = (ejCount[b.ejercicioId] || 0) + 1;
    }));
    const topEjs = Object.entries(ejCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([ejId, n]) => {
        const ej = (db.ejercicios || []).find(e => e.id === ejId);
        return ej ? `${escHtml(ej.nombre)} (×${n})` : null;
      }).filter(Boolean);

    return { g, real: real.length, susp: susp.length, fest: fest.length,
             media, efect, ultima, topEjs };
  });

  // Ranking: más activo y más asistencia
  const masActivo   = [...statsGrupos].sort((a, b) => b.real - a.real)[0];
  const masAsist    = [...statsGrupos].filter(r => r.media !== '—')
                        .sort((a, b) => parseFloat(b.media) - parseFloat(a.media))[0];

  const optsGrupos = grupos.map(g => `<option value="${g.id}">${escHtml(g.nombre)}</option>`).join('');

  return `
    <!-- Comparativa rápida -->
    <div class="stat-block">
      <div class="stat-block-title">🏅 Comparativa</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${masActivo ? `<div style="display:flex;justify-content:space-between;font-size:.88rem;padding:8px;
          background:var(--gris-5);border-radius:var(--radio-sm);">
          <span>🔥 Más activo</span>
          <strong>${escHtml(masActivo.g.nombre)} (${masActivo.real} clases)</strong></div>` : ''}
        ${masAsist ? `<div style="display:flex;justify-content:space-between;font-size:.88rem;padding:8px;
          background:var(--gris-5);border-radius:var(--radio-sm);">
          <span>👥 Más asistencia</span>
          <strong>${escHtml(masAsist.g.nombre)} (${masAsist.media}/clase)</strong></div>` : ''}
      </div>
    </div>

    <!-- Detalle individual -->
    <div class="stat-block">
      <div class="stat-block-title">📋 Detalle por grupo</div>
      <div class="selector-row">
        <select id="selGrupo" onchange="renderDetalleGrupo()">
          <option value="">— Selecciona grupo —</option>
          ${optsGrupos}
        </select>
      </div>
      <div id="detalleGrupoContent"></div>
    </div>

    <!-- Tabla todos los grupos -->
    <div class="stat-block">
      <div class="stat-block-title">👨‍👩‍👧‍👦 Todos los grupos</div>
      ${statsGrupos.map(r => `
        <div style="padding:10px 0;border-bottom:1px solid var(--gris-5);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-weight:700;">${escHtml(r.g.nombre)}</span>
            <span class="badge badge-${r.g.nivel.toLowerCase()}">${r.g.nivel}</span>
          </div>
          <div style="display:flex;gap:12px;font-size:.78rem;color:var(--gris-3);">
            <span>✅ ${r.real}</span><span>❌ ${r.susp}</span>
            <span>🎉 ${r.fest}</span><span>👥 ${r.media}/clase</span>
            <span style="color:${r.efect>=70?'var(--verde)':r.efect>=40?'var(--amarillo)':'var(--rojo)'}">
              ${r.efect}% efectividad</span>
          </div>
        </div>`).join('')}
    </div>`;
}

function renderDetalleGrupo() {
  const id = document.getElementById('selGrupo')?.value;
  if (!id) { document.getElementById('detalleGrupoContent').innerHTML = ''; return; }

  const db     = loadDB();
  const desde  = fechaDesde(rangoActual);
  const grupo  = (db.grupos || []).find(g => g.id === id);
  const clases = (db.clases || []).filter(c => c.grupoId === id && enRango(c.fecha, desde));
  const real   = clases.filter(c => c.estado === 'Realizada');

  const asist    = real.reduce((s, c) => s + (c.asistentes?.length || 0), 0);
  const media    = real.length > 0 ? (asist / real.length).toFixed(1) : '—';
  const ultima   = clases.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  // Ejercicios más usados
  const ejCount = {};
  real.forEach(c => (c.bloques || []).forEach(b => {
    if (b.ejercicioId && !b.noRealizado)
      ejCount[b.ejercicioId] = (ejCount[b.ejercicioId] || 0) + 1;
  }));
  const topEjs = Object.entries(ejCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([ejId, n]) => {
      const ej = (db.ejercicios || []).find(e => e.id === ejId);
      return ej ? { nombre: ej.nombre, n } : null;
    }).filter(Boolean);

  document.getElementById('detalleGrupoContent').innerHTML = `
    <div class="kpi-grid" style="margin-top:10px;">
      <div class="kpi-item"><div class="kpi-value">${real.length}</div><div class="kpi-label">Clases realizadas</div></div>
      <div class="kpi-item"><div class="kpi-value">${media}</div><div class="kpi-label">Asist. media</div></div>
    </div>
    ${ultima ? `<div style="font-size:.8rem;color:var(--gris-3);margin:8px 0;">
      Última clase: <strong>${formatFecha(ultima.fecha)}</strong></div>` : ''}
    ${topEjs.length > 0 ? `
      <div class="section-sep">Ejercicios más usados</div>
      ${topEjs.map((e, i) => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;
          border-bottom:1px solid var(--gris-5);font-size:.85rem;">
          <span>${i+1}. ${escHtml(e.nombre)}</span>
          <span style="font-weight:700;color:var(--verde)">×${e.n}</span>
        </div>`).join('')}` : ''}`;
}

// ════════════════════════════════════════════════════════════
// ── EJERCICIOS ────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function renderEjercicios(db, desde) {
  const ejercs  = db.ejercicios || [];
  const clases  = (db.clases   || []).filter(c => enRango(c.fecha, desde) && c.estado === 'Realizada');

  if (ejercs.length === 0) return `<div class="no-data">Sin ejercicios en la base de datos.</div>`;

  // Contar usos de cada ejercicio en las clases filtradas
  const usosEj = {};
  clases.forEach(c => (c.bloques || []).forEach(b => {
    if (b.ejercicioId && !b.noRealizado)
      usosEj[b.ejercicioId] = (usosEj[b.ejercicioId] || 0) + 1;
  }));

  // Top 10 más usados
  const topUsados = ejercs
    .filter(e => usosEj[e.id])
    .sort((a, b) => (usosEj[b.id] || 0) - (usosEj[a.id] || 0))
    .slice(0, 10);

  // Sin usar hace más de 30 días
  const hace30 = new Date(); hace30.setDate(hace30.getDate() - 30);
  const sinUsar = ejercs.filter(e => {
    if (!e.ultimoUso) return true;
    return new Date(e.ultimoUso) < hace30;
  });

  // Por categoría
  const config = db.config || {};
  const categorias = config.categorias || ['Calentamiento','Carritos','Situaciones','Partiditos'];
  const porCat = categorias.map(cat => {
    const ejsCat = ejercs.filter(e => e.categoria === cat);
    const usados = ejsCat.filter(e => usosEj[e.id]).length;
    return { cat, total: ejsCat.length, usados };
  });

  // Por tipo: balance
  const tipos = {};
  clases.forEach(c => (c.bloques || []).forEach(b => {
    if (!b.ejercicioId || b.noRealizado) return;
    const ej = ejercs.find(e => e.id === b.ejercicioId);
    if (ej) tipos[ej.tipo] = (tipos[ej.tipo] || 0) + 1;
  }));
  const totalTipos = Object.values(tipos).reduce((s, n) => s + n, 0);
  const topTipos   = Object.entries(tipos).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return `
    <!-- Sin usar -->
    <div class="stat-block">
      <div class="stat-block-title">⏰ Ejercicios sin usar (>30 días)</div>
      ${sinUsar.length === 0
        ? `<div class="no-data">¡Todos los ejercicios han sido usados recientemente! 🎉</div>`
        : `<div style="font-size:.82rem;color:var(--gris-3);margin-bottom:8px;">${sinUsar.length} ejercicio${sinUsar.length!==1?'s':''} sin usar</div>
           ${sinUsar.slice(0, 8).map(e => `
             <div style="display:flex;justify-content:space-between;padding:7px 0;
               border-bottom:1px solid var(--gris-5);font-size:.85rem;">
               <span>${escHtml(e.nombre)}</span>
               <span style="color:var(--gris-3);font-size:.75rem;">
                 ${e.ultimoUso ? formatFecha(e.ultimoUso) : 'Nunca'}</span>
             </div>`).join('')}
           ${sinUsar.length > 8 ? `<div style="font-size:.78rem;color:var(--gris-3);margin-top:6px;">
             +${sinUsar.length - 8} más…</div>` : ''}`}
    </div>

    <!-- Top 10 más usados -->
    <div class="stat-block">
      <div class="stat-block-title">🔥 Top ejercicios más usados</div>
      ${topUsados.length === 0
        ? `<div class="no-data">Sin datos de uso</div>`
        : `<table class="ranking-table">
            ${topUsados.map((e, i) => `
              <tr>
                <td class="ranking-pos">${['🥇','🥈','🥉'][i] || i+1}</td>
                <td>
                  <div class="ranking-name">${escHtml(e.nombre)}</div>
                  <div class="ranking-sub">${e.categoria} · ${e.tipo}</div>
                </td>
                <td class="ranking-val">×${usosEj[e.id]}</td>
              </tr>`).join('')}
           </table>`}
    </div>

    <!-- Por categoría -->
    <div class="stat-block">
      <div class="stat-block-title">📂 Por categoría</div>
      ${porCat.map(r => `
        <div class="pct-bar-wrap">
          <div class="pct-bar-label">
            <span>${escHtml(r.cat)} (${r.total})</span>
            <span>${r.usados} usados</span>
          </div>
          <div class="pct-bar-bg">
            <div class="pct-bar-fill" style="width:${r.total>0?Math.round((r.usados/r.total)*100):0}%;
              background:var(--verde)"></div>
          </div>
        </div>`).join('')}
    </div>

    <!-- Balance por tipo -->
    <div class="stat-block">
      <div class="stat-block-title">⚖️ Balance por tipo (usos)</div>
      ${topTipos.length === 0
        ? `<div class="no-data">Sin datos de tipos aún</div>`
        : topTipos.map(([tipo, n]) => {
            const pct = totalTipos > 0 ? Math.round((n / totalTipos) * 100) : 0;
            return `
              <div class="pct-bar-wrap">
                <div class="pct-bar-label"><span>${escHtml(tipo)}</span><span>${pct}% (×${n})</span></div>
                <div class="pct-bar-bg">
                  <div class="pct-bar-fill" style="width:${pct}%;background:var(--azul)"></div>
                </div>
              </div>`;
          }).join('')}
    </div>`;
}

// ════════════════════════════════════════════════════════════
// ── CLASES ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function renderClases(db, desde) {
  const todasClases = db.clases || [];
  const clases = todasClases.filter(c => enRango(c.fecha, desde));

  if (todasClases.length === 0) return `<div class="no-data">Sin clases registradas.</div>`;

  const real = clases.filter(c => c.estado === 'Realizada');
  const susp = clases.filter(c => c.estado === 'Suspendida');
  const fest = clases.filter(c => c.estado === 'Festivo');
  const pctReal = clases.length > 0 ? Math.round((real.length / clases.length) * 100) : 0;

  // Duración media
  const duraciones = real.filter(c => c.duracion).map(c => parseInt(c.duracion));
  const mediaMin = duraciones.length > 0
    ? Math.round(duraciones.reduce((s, n) => s + n, 0) / duraciones.length) : null;

  // Media de bloques por categoría
  const cats = ['Calentamiento', 'Carritos', 'Situaciones', 'Partiditos'];
  const mediaBloques = {};
  cats.forEach(cat => {
    const total = real.reduce((s, c) =>
      s + (c.bloques || []).filter(b => b.categoria === cat && !b.noRealizado).length, 0);
    mediaBloques[cat] = real.length > 0 ? (total / real.length).toFixed(1) : '—';
  });

  const catIcons = { Calentamiento: '🏃', Carritos: '🎯', Situaciones: '⚡', Partiditos: '🏆' };

  // Por grupo
  const grupos = db.grupos || [];
  const statsPorGrupo = grupos.map(g => {
    const cls  = clases.filter(c => c.grupoId === g.id);
    const r    = cls.filter(c => c.estado === 'Realizada');
    const s    = cls.filter(c => c.estado === 'Suspendida');
    const f    = cls.filter(c => c.estado === 'Festivo');
    const efect = cls.length > 0 ? Math.round((r.length / cls.length) * 100) : 0;
    return { nombre: g.nombre, r: r.length, s: s.length, f: f.length, efect, total: cls.length };
  }).filter(r => r.total > 0);

  return `
    <!-- KPIs generales -->
    <div class="stat-block">
      <div class="stat-block-title">📅 Resumen de clases</div>
      <div class="kpi-grid">
        <div class="kpi-item"><div class="kpi-value">${real.length}</div><div class="kpi-label">Realizadas</div></div>
        <div class="kpi-item"><div class="kpi-value">${pctReal}%</div><div class="kpi-label">% Efectividad</div></div>
        <div class="kpi-item"><div class="kpi-value">${susp.length}</div><div class="kpi-label">Suspendidas</div></div>
        <div class="kpi-item"><div class="kpi-value">${fest.length}</div><div class="kpi-label">Festivos</div></div>
      </div>
      ${mediaMin ? `<div style="font-size:.85rem;color:var(--gris-2);margin-top:8px;">
        ⏱ Duración media: <strong>${mediaMin} min</strong></div>` : ''}
    </div>

    <!-- Estructura media de bloques -->
    <div class="stat-block">
      <div class="stat-block-title">📊 Estructura media por clase</div>
      ${cats.map(cat => `
        <div style="display:flex;justify-content:space-between;align-items:center;
          padding:9px 0;border-bottom:1px solid var(--gris-5);">
          <span style="font-size:.88rem;">${catIcons[cat]} ${cat}</span>
          <span style="font-family:'Bebas Neue',cursive;font-size:1.3rem;color:var(--verde)">
            ${mediaBloques[cat]}</span>
        </div>`).join('')}
    </div>

    <!-- Por grupo -->
    ${statsPorGrupo.length > 0 ? `
    <div class="stat-block">
      <div class="stat-block-title">👨‍👩‍👧‍👦 Por grupo</div>
      ${statsPorGrupo.map(r => `
        <div style="padding:10px 0;border-bottom:1px solid var(--gris-5);">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
            <span style="font-weight:700;">${escHtml(r.nombre)}</span>
            <span style="font-size:.8rem;font-weight:700;
              color:${r.efect>=70?'var(--verde)':r.efect>=40?'var(--amarillo)':'var(--rojo)'}">
              ${r.efect}%</span>
          </div>
          <div class="pct-bar-bg">
            <div class="pct-bar-fill" style="width:${r.efect}%;background:var(--verde)"></div>
          </div>
          <div style="display:flex;gap:10px;font-size:.75rem;color:var(--gris-3);margin-top:4px;">
            <span>✅ ${r.r}</span><span>❌ ${r.s}</span><span>🎉 ${r.f}</span>
          </div>
        </div>`).join('')}
    </div>` : ''}`;
}

// ════════════════════════════════════════════════════════════
// ── TORNEOS ───────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function renderTorneos(db, desde) {
  const torneos = (db.torneos || []).filter(t => enRango(t.fecha, desde));
  const todos   = db.torneos || [];

  if (todos.length === 0) return `<div class="no-data">Sin torneos registrados.</div>`;

  const finalizados = torneos.filter(t => t.estado === 'Finalizado');
  const porTipo     = {};
  torneos.forEach(t => { porTipo[t.tipo] = (porTipo[t.tipo] || 0) + 1; });

  // Hall of Fame: ganadores históricos
  const victorias = {};
  todos.filter(t => t.estado === 'Finalizado').forEach(t => {
    const clasi = calcularClasifSimple(t);
    if (clasi[0]) {
      const nom = clasi[0].nombre;
      if (!victorias[nom]) victorias[nom] = { nombre: nom, v: 0, tipos: [] };
      victorias[nom].v++;
      victorias[nom].tipos.push(t.tipo);
    }
  });
  const hallOfFame = Object.values(victorias).sort((a, b) => b.v - a.v);

  // Más participaciones
  const participaciones = {};
  torneos.forEach(t => {
    (t.participantes || []).forEach(p => {
      participaciones[p.nombre] = (participaciones[p.nombre] || 0) + 1;
    });
  });
  const rankParticip = Object.entries(participaciones)
    .sort((a, b) => b[1] - a[1]).slice(0, 8);

  const tipoEmoji = { 'Round Robin': '🔄', 'Americano': '🇺🇸', 'Mexicano': '🇲🇽', 'Escalera': '🪜' };

  return `
    <!-- KPIs -->
    <div class="stat-block">
      <div class="stat-block-title">🏆 Resumen de torneos</div>
      <div class="kpi-grid">
        <div class="kpi-item"><div class="kpi-value">${torneos.length}</div><div class="kpi-label">Total torneos</div></div>
        <div class="kpi-item"><div class="kpi-value">${finalizados.length}</div><div class="kpi-label">Finalizados</div></div>
      </div>
      <div class="section-sep">Por tipo</div>
      ${Object.entries(porTipo).map(([tipo, n]) => `
        <div style="display:flex;justify-content:space-between;padding:7px 0;
          border-bottom:1px solid var(--gris-5);font-size:.88rem;">
          <span>${tipoEmoji[tipo] || '🏆'} ${tipo}</span>
          <span style="font-weight:700;color:var(--verde)">${n}</span>
        </div>`).join('')}
    </div>

    <!-- Hall of Fame -->
    <div class="stat-block">
      <div class="stat-block-title">🥇 Hall of Fame — Ganadores históricos</div>
      ${hallOfFame.length === 0
        ? `<div class="no-data">Sin torneos finalizados aún</div>`
        : `<table class="ranking-table">
            ${hallOfFame.slice(0, 10).map((r, i) => `
              <tr>
                <td class="ranking-pos">${['🥇','🥈','🥉'][i] || i+1}</td>
                <td>
                  <div class="ranking-name">${escHtml(r.nombre)}</div>
                  <div class="ranking-sub">${r.tipos.join(', ')}</div>
                </td>
                <td class="ranking-val">${r.v} 🏆</td>
              </tr>`).join('')}
           </table>`}
    </div>

    <!-- Más participaciones -->
    <div class="stat-block">
      <div class="stat-block-title">🎾 Más participaciones en torneos</div>
      ${rankParticip.length === 0
        ? `<div class="no-data">Sin datos</div>`
        : `<table class="ranking-table">
            ${rankParticip.map(([nombre, n], i) => `
              <tr>
                <td class="ranking-pos">${i+1}</td>
                <td class="ranking-name">${escHtml(nombre)}</td>
                <td class="ranking-val">${n}</td>
              </tr>`).join('')}
           </table>`}
    </div>`;
}

// ── Helper: clasificación simplificada de un torneo ───────────
function calcularClasifSimple(torneo) {
  const stats = {};
  (torneo.participantes || []).forEach(p => {
    stats[p.nombre] = { nombre: p.nombre, pts: 0, pg: 0 };
  });

  (torneo.jornadas || []).forEach(jornada => {
    (jornada.partidos || []).forEach(partido => {
      if (!partido.finalizado) return;
      const sA = partido.scoreA, sB = partido.scoreB;
      const ganA = sA > sB;

      const sumar = (ids, gano, puntos) => {
        ids.forEach(id => {
          const p = (torneo.participantes || []).find(j => j.id === id);
          if (!p || !stats[p.nombre]) return;
          if (torneo.tipo === 'Escalera') {
            stats[p.nombre].pts += gano ? 2 : 1;
          } else if (torneo.tipo === 'Round Robin') {
            stats[p.nombre].pts += gano ? 3 : 0;
          } else {
            stats[p.nombre].pts += puntos;
          }
          if (gano) stats[p.nombre].pg++;
        });
      };

      sumar(partido.equipoA, ganA, sA);
      sumar(partido.equipoB, !ganA, sB);
    });
  });

  return Object.values(stats).sort((a, b) => b.pts - a.pts || b.pg - a.pg);
}

// ── Inicializar ───────────────────────────────────────────────
renderTab();
