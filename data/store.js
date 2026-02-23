/**
 * ============================================================
 * CHEMA PÁDEL – store.js
 * Base de datos central compartida por todos los módulos.
 * Arquitectura: localStorage con validaciones y helpers.
 * ============================================================
 */

const DB_KEY      = 'chemaPadelDB';
const DB_VERSION  = '2.0';

// ── Estructura base de la DB ─────────────────────────────────
const defaultDB = {
  version:    DB_VERSION,
  alumnos:    [],
  grupos:     [],
  ejercicios: [],  // preparado para Fase 2
  clases:     [],  // preparado para Fase 2
  torneos:    []   // preparado para Fase 2
};

// ── Estructuras de datos ─────────────────────────────────────
/*
  Alumno: {
    id:       string,
    nombre:   string,
    telefono: string,
    email:    string,
    fechaNac: string,
    nivel:    'Principiante' | 'Intermedio' | 'Avanzado',
    avatar:   string (emoji o iniciales),
    grupoId:  string | null,
    creadoEn: string (ISO date)
  }

  Grupo: {
    id:       string,
    nombre:   string,
    nivel:    'Principiante' | 'Intermedio' | 'Avanzado',
    pista:    1 | 2 | 3,
    alumnos:  string[] (array de ids),
    creadoEn: string (ISO date)
  }
*/

// ── loadDB ───────────────────────────────────────────────────
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultDB));
    const db = JSON.parse(raw);
    // Asegurar que existen todas las colecciones (compatibilidad futura)
    return {
      ...defaultDB,
      ...db
    };
  } catch (e) {
    console.error('[store] Error al cargar DB:', e);
    return JSON.parse(JSON.stringify(defaultDB));
  }
}

// ── saveDB ───────────────────────────────────────────────────
function saveDB(db) {
  try {
    db.version = DB_VERSION;
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    console.error('[store] Error al guardar DB:', e);
    return false;
  }
}

// ── generarId ────────────────────────────────────────────────
function generarId(prefijo = 'id') {
  return `${prefijo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Helpers de Grupos ────────────────────────────────────────
function getGrupoPorId(db, id) {
  return db.grupos.find(g => g.id === id) || null;
}

function getAlumnosPorGrupo(db, grupoId) {
  const grupo = getGrupoPorId(db, grupoId);
  if (!grupo) return [];
  return db.alumnos.filter(a => grupo.alumnos.includes(a.id));
}

// ── Helpers de Alumnos ───────────────────────────────────────
function getAlumnoPorId(db, id) {
  return db.alumnos.find(a => a.id === id) || null;
}

// ── Asignar alumno a grupo (bidireccional) ───────────────────
function asignarAlumnoAGrupo(db, alumnoId, nuevoGrupoId) {
  const alumno = getAlumnoPorId(db, alumnoId);
  if (!alumno) return db;

  // Quitar del grupo anterior si lo tenía
  if (alumno.grupoId) {
    const grupoAnterior = getGrupoPorId(db, alumno.grupoId);
    if (grupoAnterior) {
      grupoAnterior.alumnos = grupoAnterior.alumnos.filter(id => id !== alumnoId);
    }
  }

  // Actualizar alumno
  alumno.grupoId = nuevoGrupoId;

  // Añadir al nuevo grupo si se especificó
  if (nuevoGrupoId) {
    const nuevoGrupo = getGrupoPorId(db, nuevoGrupoId);
    if (nuevoGrupo && !nuevoGrupo.alumnos.includes(alumnoId)) {
      nuevoGrupo.alumnos.push(alumnoId);
    }
  }

  return db;
}

// ── Eliminar alumno con limpieza ─────────────────────────────
function eliminarAlumnoDeDB(db, alumnoId) {
  const alumno = getAlumnoPorId(db, alumnoId);
  if (!alumno) return db;

  // Quitar de su grupo
  if (alumno.grupoId) {
    const grupo = getGrupoPorId(db, alumno.grupoId);
    if (grupo) {
      grupo.alumnos = grupo.alumnos.filter(id => id !== alumnoId);
    }
  }

  // Eliminar alumno
  db.alumnos = db.alumnos.filter(a => a.id !== alumnoId);
  return db;
}

// ── Eliminar grupo con limpieza ──────────────────────────────
function eliminarGrupoDB(db, grupoId, accion = 'sin-grupo', destinoGrupoId = null) {
  const grupo = getGrupoPorId(db, grupoId);
  if (!grupo) return db;

  // Gestionar alumnos del grupo según la acción elegida
  grupo.alumnos.forEach(alumnoId => {
    const alumno = getAlumnoPorId(db, alumnoId);
    if (!alumno) return;

    if (accion === 'mover' && destinoGrupoId) {
      asignarAlumnoAGrupo(db, alumnoId, destinoGrupoId);
    } else {
      // Dejar sin grupo
      alumno.grupoId = null;
    }
  });

  // Eliminar el grupo
  db.grupos = db.grupos.filter(g => g.id !== grupoId);
  return db;
}

// ── Exportar datos ───────────────────────────────────────────
function exportarDatos() {
  const db = loadDB();
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const fecha = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `chema-padel-backup-${fecha}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Importar datos ───────────────────────────────────────────
function importarDatos(jsonStr) {
  try {
    const data = JSON.parse(jsonStr);
    if (!data.alumnos || !data.grupos) throw new Error('Formato inválido');
    saveDB({ ...defaultDB, ...data });
    return true;
  } catch (e) {
    console.error('[store] Error al importar:', e);
    return false;
  }
}

// ── Utilidad: escapar HTML ───────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Utilidad: avatar por defecto (iniciales + color) ─────────
const AVATAR_COLORES = [
  '#2ecc71','#3498db','#9b59b6','#e67e22',
  '#e74c3c','#1abc9c','#f39c12','#2980b9'
];

function avatarIniciales(nombre) {
  const partes = nombre.trim().split(' ');
  const iniciales = partes.length >= 2
    ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
    : nombre.slice(0, 2).toUpperCase();
  const color = AVATAR_COLORES[nombre.charCodeAt(0) % AVATAR_COLORES.length];
  return { iniciales, color };
}
