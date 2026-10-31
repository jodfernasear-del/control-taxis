// Control de Taxis: lógica de la aplicación.
// Los datos se guardan en localStorage del navegador (sin backend).

const STORAGE_KEY = "control-taxis-v1";

const ESTADOS_VIAJE = ["pendiente", "asignado", "en_curso", "finalizado", "cancelado"];
const ESTADO_LABEL = {
  pendiente: "Pendiente",
  asignado: "Asignado",
  en_curso: "En curso",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

const state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("No se pudo leer el almacenamiento local", e);
  }
  return { taxis: [], conductores: [], viajes: [], nextViajeId: 1 };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("No se pudo guardar el estado", e);
  }
}

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const money = (n) => "$" + Number(n || 0).toLocaleString("es-CO");
const badge = (estado) => `<span class="badge ${esc(estado)}">${esc(ESTADO_LABEL[estado] || estado)}</span>`;

function findById(list, id) {
  return list.find((x) => x.id === id);
}

// ---------- Pestañas ----------
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${btn.dataset.tab}`));
    render();
  });
});

// ---------- Formularios ----------
$("#form-viaje").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  state.viajes.push({
    id: state.nextViajeId++,
    cliente: f.cliente.trim(),
    telefono: f.telefono.trim(),
    origen: f.origen.trim(),
    destino: f.destino.trim(),
    tarifa: Number(f.tarifa) || 0,
    taxiId: null,
    conductorId: null,
    estado: "pendiente",
    creado: new Date().toISOString(),
  });
  e.target.reset();
  saveState();
  render();
});

$("#form-taxi").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const placa = f.placa.trim().toUpperCase();
  if (state.taxis.some((t) => t.placa === placa)) return alert("Ya existe un taxi con esa placa.");
  state.taxis.push({ id: crypto.randomUUID(), placa, modelo: f.modelo.trim(), activo: true });
  e.target.reset();
  saveState();
  render();
});

$("#form-conductor").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const documento = f.documento.trim();
  if (state.conductores.some((c) => c.documento === documento)) return alert("Ya existe un conductor con ese documento.");
  state.conductores.push({
    id: crypto.randomUUID(),
    nombre: f.nombre.trim(),
    documento,
    telefono: f.telefono.trim(),
    activo: true,
  });
  e.target.reset();
  saveState();
  render();
});

$("#filtro-estado").addEventListener("change", renderViajes);

// ---------- Acciones de viajes ----------
function asignarViaje(viajeId) {
  const viaje = findById(state.viajes, viajeId);
  const libres = state.taxis.filter((t) => t.activo && !estaOcupado("taxi", t.id));
  const conductoresLibres = state.conductores.filter((c) => c.activo && !estaOcupado("conductor", c.id));
  if (!libres.length || !conductoresLibres.length) {
    return alert("No hay taxis o conductores disponibles.");
  }
  const taxiPlaca = prompt("Placa del taxi:\n" + libres.map((t) => t.placa).join(", "));
  const taxi = libres.find((t) => t.placa === (taxiPlaca || "").trim().toUpperCase());
  if (!taxi) return alert("Taxi no válido o no disponible.");
  const docs = prompt("Documento del conductor:\n" + conductoresLibres.map((c) => c.documento).join(", "));
  const conductor = conductoresLibres.find((c) => c.documento === (docs || "").trim());
  if (!conductor) return alert("Conductor no válido o no disponible.");
  viaje.taxiId = taxi.id;
  viaje.conductorId = conductor.id;
  viaje.estado = "asignado";
  saveState();
  render();
}

function cambiarEstado(viajeId, estado) {
  const viaje = findById(state.viajes, viajeId);
  if (!viaje) return;
  if (estado === "asignado" && !viaje.taxiId) return alert("Primero asigne un taxi y conductor.");
  viaje.estado = estado;
  // Al volver a pendiente o cancelar se libera el taxi y el conductor.
  if (estado === "pendiente" || estado === "cancelado") {
    viaje.taxiId = null;
    viaje.conductorId = null;
  }
  saveState();
  render();
}

// Un taxi o conductor está ocupado si tiene un viaje asignado o en curso.
function estaOcupado(tipo, id) {
  const campo = tipo === "taxi" ? "taxiId" : "conductorId";
  return state.viajes.some((v) => v[campo] === id && (v.estado === "asignado" || v.estado === "en_curso"));
}

function eliminarEntidad(lista, id) {
  if (!confirm("¿Eliminar este registro?")) return;
  const idx = state[lista].findIndex((x) => x.id === id);
  if (idx >= 0) state[lista].splice(idx, 1);
  saveState();
  render();
}

function toggleActivo(lista, id) {
  const item = findById(state[lista], id);
  if (item) item.activo = !item.activo;
  saveState();
  render();
}

// Exponer funciones usadas desde los botones generados en HTML.
Object.assign(window, { asignarViaje, cambiarEstado, eliminarEntidad, toggleActivo });

// ---------- Render ----------
function renderViajes() {
  const filtro = $("#filtro-estado").value;
  const viajes = state.viajes
    .filter((v) => !filtro || v.estado === filtro)
    .sort((a, b) => b.id - a.id);
  const tbody = $("#tbody-viajes");
  if (!viajes.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Sin viajes</td></tr>`;
    return;
  }
  tbody.innerHTML = viajes
    .map((v) => {
      const taxi = findById(state.taxis, v.taxiId);
      const conductor = findById(state.conductores, v.conductorId);
      const asignacion = taxi || conductor
        ? `${esc(taxi?.placa || "—")} / ${esc(conductor?.nombre || "—")}`
        : "Sin asignar";
      const acciones = [];
      if (v.estado === "pendiente" || v.estado === "cancelado") {
        acciones.push(`<button class="small" onclick="asignarViaje(${v.id})">Asignar</button>`);
      }
      if (v.estado === "asignado") {
        acciones.push(`<button class="small" onclick="cambiarEstado(${v.id},'en_curso')">Iniciar</button>`);
      }
      if (v.estado === "en_curso") {
        acciones.push(`<button class="small" onclick="cambiarEstado(${v.id},'finalizado')">Finalizar</button>`);
      }
      if (v.estado === "pendiente" || v.estado === "asignado") {
        acciones.push(`<button class="small danger" onclick="cambiarEstado(${v.id},'cancelado')">Cancelar</button>`);
      }
      return `<tr>
        <td>${v.id}</td>
        <td>${esc(v.cliente)}<br><small>${esc(v.telefono)}</small></td>
        <td>${esc(v.origen)} → ${esc(v.destino)}</td>
        <td>${asignacion}</td>
        <td>${badge(v.estado)}</td>
        <td>${money(v.tarifa)}</td>
        <td><div class="actions">${acciones.join("")}</div></td>
      </tr>`;
    })
    .join("");
}

function renderTaxis() {
  const tbody = $("#tbody-taxis");
  if (!state.taxis.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Sin taxis registrados</td></tr>`;
    return;
  }
  tbody.innerHTML = state.taxis
    .map((t) => {
      const estado = !t.activo ? "inactivo" : estaOcupado("taxi", t.id) ? "ocupado" : "disponible";
      const label = { inactivo: "Inactivo", ocupado: "Ocupado", disponible: "Disponible" }[estado];
      return `<tr>
        <td>${esc(t.placa)}</td>
        <td>${esc(t.modelo)}</td>
        <td><span class="badge ${estado}">${label}</span></td>
        <td><div class="actions">
          <button class="small" onclick="toggleActivo('taxis','${t.id}')">${t.activo ? "Desactivar" : "Activar"}</button>
          <button class="small danger" onclick="eliminarEntidad('taxis','${t.id}')">Eliminar</button>
        </div></td>
      </tr>`;
    })
    .join("");
}

function renderConductores() {
  const tbody = $("#tbody-conductores");
  if (!state.conductores.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Sin conductores registrados</td></tr>`;
    return;
  }
  tbody.innerHTML = state.conductores
    .map((c) => {
      const estado = !c.activo ? "inactivo" : estaOcupado("conductor", c.id) ? "ocupado" : "disponible";
      const label = { inactivo: "Inactivo", ocupado: "Ocupado", disponible: "Disponible" }[estado];
      return `<tr>
        <td>${esc(c.nombre)}</td>
        <td>${esc(c.documento)}</td>
        <td>${esc(c.telefono)}</td>
        <td><span class="badge ${estado}">${label}</span></td>
        <td><div class="actions">
          <button class="small" onclick="toggleActivo('conductores','${c.id}')">${c.activo ? "Desactivar" : "Activar"}</button>
          <button class="small danger" onclick="eliminarEntidad('conductores','${c.id}')">Eliminar</button>
        </div></td>
      </tr>`;
    })
    .join("");
}

function renderReportes() {
  const finalizados = state.viajes.filter((v) => v.estado === "finalizado");
  const ingresos = finalizados.reduce((s, v) => s + v.tarifa, 0);
  const activos = state.viajes.filter((v) => v.estado === "asignado" || v.estado === "en_curso").length;

  $("#stats").innerHTML = [
    ["Viajes totales", state.viajes.length],
    ["Finalizados", finalizados.length],
    ["En curso / asignados", activos],
    ["Ingresos", money(ingresos)],
  ]
    .map(([label, value]) => `<div class="stat"><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`)
    .join("");

  const porConductor = new Map();
  for (const v of finalizados) {
    const c = findById(state.conductores, v.conductorId);
    const nombre = c ? c.nombre : "Sin conductor";
    const fila = porConductor.get(nombre) || { viajes: 0, total: 0 };
    fila.viajes++;
    fila.total += v.tarifa;
    porConductor.set(nombre, fila);
  }
  const filas = [...porConductor.entries()];
  $("#tbody-reportes").innerHTML = filas.length
    ? filas.map(([n, f]) => `<tr><td>${esc(n)}</td><td>${f.viajes}</td><td>${money(f.total)}</td></tr>`).join("")
    : `<tr><td colspan="3" class="empty">Sin viajes finalizados</td></tr>`;
}

function render() {
  renderViajes();
  renderTaxis();
  renderConductores();
  renderReportes();
}

render();
