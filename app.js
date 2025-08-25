// app.js – Consulta/edición de artículos (Firestore, solo activos)

// 🔸 Firebase CDN (navegador, sin bundler)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, getDoc, doc, query, where, limit,
  updateDoc, deleteDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ───────────────── Configuración Firebase ─────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCK5nb6u2CGRJ8AB1aPlRn54b97bdeAFeM",
  authDomain: "inventariopv-643f1.firebaseapp.com",
  projectId: "inventariopv-643f1",
  storageBucket: "inventariopv-643f1.appspot.com",
  messagingSenderId: "96242533231",
  appId: "1:96242533231:web:aae75a18fbaf9840529e9a"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);
// Habilita Anonymous en Firebase Auth si tus reglas requieren auth
signInAnonymously(auth).catch(console.error);

// ───────────────── Parámetros de la vista ─────────────────
const COL = "productos";     // cambia si tu colección se llama distinto
const MAX_CACHE = 1200;      // cuantos docs se cargan para filtrar en cliente
const SOLO_ACTIVOS = true;   // ← Muestra únicamente artículos con activo:true

// ───────────────── Referencias DOM ─────────────────
const $buscador   = document.getElementById("buscador");
const $resultados = document.getElementById("resultados");
const $modal      = document.getElementById("modal");
const $modalDatos = document.getElementById("modal-datos");

// ───────────────── Utilidades ─────────────────
const fmt = n => (n === undefined || n === null || isNaN(n)) ? "" : Number(n).toFixed(2);
const norm = s => (s ?? "").toString().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
function numOrNull(v){ if(v===null||v===undefined||v==="")return null; const n=Number(v); return isNaN(n)?null:n; }

// ───────────────── Cache ─────────────────
let cacheProductos = []; // [{id, ...data}]

async function cargarCacheProductos(max = MAX_CACHE) {
  if (cacheProductos.length) return cacheProductos;

  const base = collection(db, COL);
  const qy = SOLO_ACTIVOS
    ? query(base, where("activo", "==", true), limit(max))
    : query(base, limit(max));

  const snap = await getDocs(qy);
  cacheProductos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return cacheProductos;
}

// ───────────────── Render ─────────────────
function renderFilas(items) {
  $resultados.innerHTML = "";
  window.actualizarContador?.(items.length);
  if (!items.length) return;

  for (const p of items) {
    const tr = document.createElement("tr");
    const desc   = p.concepto ?? "";
    const codigo = p.codigoBarra ?? p.id ?? "";
    const precio = p.precioPublico ?? p.mayoreo ?? p.medioMayoreo ?? p.costoSinImpuesto ?? "";
    tr.innerHTML = `
      <td title="${desc}">${desc}</td>
      <td>${codigo}</td>
      <td>$ ${fmt(precio)}</td>
      <td>
        <button data-id="${p.id}" class="btn-editar">Modificar</button>
        <button data-id="${p.id}" class="btn-eliminar">Eliminar</button>
      </td>
    `;
    $resultados.appendChild(tr);
  }

  // Eventos por fila
  $resultados.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", () => abrirModalEdicion(btn.dataset.id));
  });
  $resultados.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", () => eliminarProducto(btn.dataset.id));
  });
}

// ───────────────── Búsqueda ─────────────────
async function buscarProducto() {
  const el = document.getElementById('buscador');
  const termRaw = (el && el.value) ? el.value : "";
  const termDigits = termRaw.trim();
  const term = norm(termDigits);

  // Nada escrito → no mostrar todo
  if (!term) {
    $resultados.innerHTML = "";
    window.actualizarContador?.(0);
    return;
  }

  // Código de barras exacto (solo dígitos, 6+)
  if (/^\d{6,}$/.test(termDigits)) {
    // 1) por ID
    const refById = doc(db, COL, termDigits);
    const byId = await getDoc(refById);
    if (byId.exists()) {
      const data = byId.data();
      if (!SOLO_ACTIVOS || data.activo === true) {
        renderFilas([{ id: byId.id, ...data }]);
      } else {
        renderFilas([]); // inactivo
      }
      return;
    }
    // 2) por campo codigoBarra
    const qy = query(collection(db, COL), where("codigoBarra", "==", termDigits), limit(10));
    let arr = (await getDocs(qy)).docs.map(d => ({ id: d.id, ...d.data() }));
    if (SOLO_ACTIVOS) arr = arr.filter(p => p.activo === true);
    renderFilas(arr);
    return;
  }

  // Texto libre: concepto/marca/departamento/código contiene…
  const list = await cargarCacheProductos(); // ya viene filtrado por activo si SOLO_ACTIVOS=true
  const campo = s => norm(s);
  let filtrados = list.filter(p =>
    (!SOLO_ACTIVOS || p.activo === true) && (
      (p.concepto && campo(p.concepto).includes(term)) ||
      (p.marca && campo(p.marca).includes(term)) ||
      (p.departamento && campo(p.departamento).includes(term)) ||
      (p.codigoBarra && String(p.codigoBarra).includes(termDigits))
    )
  );

  filtrados.sort((a,b) => (a.concepto ?? "").localeCompare(b.concepto ?? ""));
  renderFilas(filtrados.slice(0, 200));
}

// ───────────────── Modal edición ─────────────────
async function abrirModalEdicion(id) {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) { alert("El producto ya no existe."); return; }
  const p = { id: snap.id, ...snap.data() };

  $modalDatos.innerHTML = `
    <form id="form-editar">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <label>Descripción
          <input name="concepto" type="text" value="${p.concepto ?? ""}" required />
        </label>
        <label>Marca
          <input name="marca" type="text" value="${p.marca ?? ""}" />
        </label>
        <label>Departamento
          <input name="departamento" type="text" value="${p.departamento ?? ""}" />
        </label>
        <label>Código de barras
          <input name="codigoBarra" type="text" value="${p.codigoBarra ?? p.id ?? ""}" readonly />
        </label>
        <label>Cant. por caja
          <input name="cantidadPorCaja" type="number" step="1" value="${p.cantidadPorCaja ?? ""}" />
        </label>
        <label>Clave SAT
          <input name="claveSat" type="text" value="${p.claveSat ?? ""}" />
        </label>
        <label>Costo sin impuesto
          <input name="costoSinImpuesto" type="number" step="0.01" value="${p.costoSinImpuesto ?? ""}" />
        </label>
        <label>IVA Tasa
          <input name="ivaTasa" type="number" step="0.01" value="${p.ivaTasa ?? 0}" />
        </label>
        <label>IEPS Tasa
          <input name="iepsTasa" type="number" step="0.01" value="${p.iepsTasa ?? 0}" />
        </label>
        <label>Precio Público
          <input name="precioPublico" type="number" step="0.01" value="${p.precioPublico ?? ""}" />
        </label>
        <label>1/2 Mayoreo
          <input name="medioMayoreo" type="number" step="0.01" value="${p.medioMayoreo ?? ""}" />
        </label>
        <label>Mayoreo
          <input name="mayoreo" type="number" step="0.01" value="${p.mayoreo ?? ""}" />
        </label>
        <label style="grid-column:1 / -1;display:flex;align-items:center;gap:8px;">
          <input name="activo" type="checkbox" ${p.activo ? "checked" : ""} />
          Activo
        </label>
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end;">
        <button type="button" id="btn-eliminar-modal" style="background:#e74c3c;color:#fff;border:none;padding:8px 14px;border-radius:6px;">Eliminar</button>
        <button type="submit" style="background:#2ecc71;color:#fff;border:none;padding:8px 14px;border-radius:6px;">Guardar cambios</button>
      </div>
    </form>
  `;
  $modal.style.display = "flex";

  // Guardar
  document.getElementById("form-editar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const upd = {
      concepto: fd.get("concepto")?.trim() || "",
      marca: fd.get("marca")?.trim() || "",
      departamento: fd.get("departamento")?.trim() || "",
      cantidadPorCaja: numOrNull(fd.get("cantidadPorCaja")),
      claveSat: fd.get("claveSat")?.trim() || "",
      costoSinImpuesto: numOrNull(fd.get("costoSinImpuesto")),
      ivaTasa: numOrNull(fd.get("ivaTasa")) ?? 0,
      iepsTasa: numOrNull(fd.get("iepsTasa")) ?? 0,
      precioPublico: numOrNull(fd.get("precioPublico")),
      medioMayoreo: numOrNull(fd.get("medioMayoreo")),
      mayoreo: numOrNull(fd.get("mayoreo")),
      activo: fd.get("activo") === "on"
    };
    try {
      await updateDoc(ref, upd);
      alert("Producto actualizado.");
      cerrarModal();
      cacheProductos = [];
      buscarProducto();
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar. Revisa reglas de Firestore y la consola.");
    }
  });

  // Eliminar
  document.getElementById("btn-eliminar-modal").addEventListener("click", async () => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await deleteDoc(ref);
      alert("Producto eliminado.");
      cerrarModal();
      cacheProductos = [];
      buscarProducto();
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar. Revisa reglas de Firestore.");
    }
  });
}

// ───────────────── Crear nuevo ─────────────────
function mostrarFormulario() {
  $modalDatos.innerHTML = `
    <form id="form-nuevo">
      <p style="margin-top:0">Crear nuevo producto</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <label>Código de barras (ID del documento)
          <input name="codigoBarra" type="text" required />
        </label>
        <label>Descripción
          <input name="concepto" type="text" required />
        </label>
        <label>Marca
          <input name="marca" type="text" />
        </label>
        <label>Departamento
          <input name="departamento" type="text" />
        </label>
        <label>Precio Público
          <input name="precioPublico" type="number" step="0.01" />
        </label>
        <label>1/2 Mayoreo
          <input name="medioMayoreo" type="number" step="0.01" />
        </label>
        <label>Mayoreo
          <input name="mayoreo" type="number" step="0.01" />
        </label>
        <label>Costo sin impuesto
          <input name="costoSinImpuesto" type="number" step="0.01" />
        </label>
        <label>IVA Tasa
          <input name="ivaTasa" type="number" step="0.01" value="0" />
        </label>
        <label>IEPS Tasa
          <input name="iepsTasa" type="number" step="0.01" value="0" />
        </label>
        <label style="grid-column:1 / -1;display:flex;align-items:center;gap:8px;">
          <input name="activo" type="checkbox" checked />
          Activo
        </label>
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end;">
        <button type="submit" style="background:#3498db;color:#fff;border:none;padding:8px 14px;border-radius:6px;">Crear</button>
      </div>
    </form>
  `;
  $modal.style.display = "flex";

  document.getElementById("form-nuevo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const id = (fd.get("codigoBarra") || "").trim();
    if (!id) { alert("Código de barras requerido."); return; }

    const data = {
      codigoBarra: id,
      concepto: (fd.get("concepto") || "").trim(),
      marca: (fd.get("marca") || "").trim(),
      departamento: (fd.get("departamento") || "").trim(),
      precioPublico: numOrNull(fd.get("precioPublico")),
      medioMayoreo: numOrNull(fd.get("medioMayoreo")),
      mayoreo: numOrNull(fd.get("mayoreo")),
      costoSinImpuesto: numOrNull(fd.get("costoSinImpuesto")),
      ivaTasa: numOrNull(fd.get("ivaTasa")) ?? 0,
      iepsTasa: numOrNull(fd.get("iepsTasa")) ?? 0,
      activo: fd.get("activo") === "on",
      cantidadPorCaja: null,
      claveSat: ""
    };

    try {
      await setDoc(doc(db, COL, id), data);
      alert("Producto creado.");
      cerrarModal();
      cacheProductos = [];
      const input = document.getElementById('buscador');
      if (input) input.value = id;
      buscarProducto();
    } catch (err) {
      console.error(err);
      alert("No se pudo crear. Revisa reglas de Firestore / consola.");
    }
  });
}

// ───────────────── Acciones varias ─────────────────
function cerrarModal() {
  $modal.style.display = "none";
  $modalDatos.innerHTML = "";
}
function limpiarBusqueda() {
  const el = document.getElementById("buscador");
  if (el) el.value = "";
  $resultados.innerHTML = "";
  window.actualizarContador?.(0);
}
function cerrarVentana() {
  if (history.length > 1) history.back();
  else window.location.href = "./";
}
async function eliminarProducto(id) {
  const ref = doc(db, COL, id);
  if (!confirm("¿Eliminar este producto?")) return;
  try {
    await deleteDoc(ref);
    alert("Producto eliminado.");
    cacheProductos = [];
    buscarProducto();
  } catch (err) {
    console.error(err);
    alert("No se pudo eliminar. Revisa reglas de Firestore.");
  }
}

// ───────────────── Exponer a window + listeners ─────────────────
window.buscarProducto     = buscarProducto;
window.mostrarFormulario  = mostrarFormulario;
window.cerrarModal        = cerrarModal;
window.cerrarVentana      = cerrarVentana;
window.limpiarBusqueda    = limpiarBusqueda;

const $inputBuscador = document.getElementById('buscador');
if ($inputBuscador) $inputBuscador.addEventListener('input', buscarProducto);

$buscador?.focus();
