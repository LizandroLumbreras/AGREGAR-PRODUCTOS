// app.js
// 🔹 Firebase CDN imports (navegador puro)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, getDoc, doc, query, where, limit,
  updateDoc, deleteDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// 🔹 Tu configuración
const firebaseConfig = {
  apiKey: "AIzaSyCK5nb6u2CGRJ8AB1aPlRn54b97bdeAFeM",
  authDomain: "inventariopv-643f1.firebaseapp.com",
  projectId: "inventariopv-643f1",
  // El bucket no se usa aquí; si lo necesitas, suele ser "<project>.appspot.com"
  storageBucket: "inventariopv-643f1.appspot.com",
  messagingSenderId: "96242533231",
  appId: "1:96242533231:web:aae75a18fbaf9840529e9a"
};

// 🔹 Init
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);
signInAnonymously(auth).catch(console.error);

// 🔹 DOM
const $buscador   = document.getElementById("buscador");
const $resultados = document.getElementById("resultados");
const $modal      = document.getElementById("modal");
const $modalDatos = document.getElementById("modal-datos");

const COL = "productos"; // <-- cambia si tu colección se llama distinto

// Utilidad: formateo precio
const fmt = n => (n === undefined || n === null || isNaN(n)) ? "" : Number(n).toFixed(2);

// Estado cache simple para filtrar en cliente
let cacheProductos = []; // [{id, ...data}]

// Carga hasta N productos para búsquedas por texto (simple y práctico)
async function cargarCacheProductos(max = 400) {
  if (cacheProductos.length) return cacheProductos;
  const q = query(collection(db, COL), limit(max));
  const snap = await getDocs(q);
  cacheProductos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return cacheProductos;
}

// Render de filas
function renderFilas(items) {
  $resultados.innerHTML = "";
  if (!items.length) {
    window.actualizarContador?.(0);
    return;
  }

  for (const p of items) {
    const tr = document.createElement("tr");
    const desc = p.concepto ?? "";
    const cod  = p.codigoBarra ?? p.id ?? "";
    const precio = p.precioPublico ?? p.mayoreo ?? p.medioMayoreo ?? p.costoSinImpuesto ?? "";

    tr.innerHTML = `
      <td title="${desc}">${desc}</td>
      <td>${cod}</td>
      <td>$ ${fmt(precio)}</td>
      <td>
        <button data-id="${p.id}" class="btn-editar">Modificar</button>
        <button data-id="${p.id}" class="btn-eliminar">Eliminar</button>
      </td>
    `;
    $resultados.appendChild(tr);
  }

  // Bind de botones por fila
  $resultados.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", () => abrirModalEdicion(btn.dataset.id));
  });
  $resultados.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", () => eliminarProducto(btn.dataset.id));
  });

  window.actualizarContador?.(items.length);
}

// Búsqueda
async function buscarProducto() {
  const term = ($buscador.value || "").trim();

  // Si es código de barras (solo dígitos), intenta match exacto por ID o por campo codigoBarra
  if (/^\d{6,}$/.test(term)) {
    // 1) Buscar doc por ID = código
    const docRef = doc(db, COL, term);
    const byId = await getDoc(docRef);
    if (byId.exists()) {
      renderFilas([{ id: byId.id, ...byId.data() }]);
      return;
    }
    // 2) Buscar por campo codigoBarra == term
    const q = query(collection(db, COL), where("codigoBarra", "==", term), limit(10));
    const snap = await getDocs(q);
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderFilas(arr);
    return;
  }

  // Si es texto normal: filtrar en cliente (cache)
  const list = await cargarCacheProductos();
  const t = term.toLowerCase();
  const filtrados = list.filter(p =>
    (p.concepto && p.concepto.toLowerCase().includes(t)) ||
    (p.marca && p.marca.toLowerCase().includes(t)) ||
    (p.departamento && p.departamento.toLowerCase().includes(t)) ||
    (p.codigoBarra && String(p.codigoBarra).includes(term))
  ).slice(0, 200); // recorta lo mostrado
  // Orden simple por descripción
  filtrados.sort((a, b) => (a.concepto ?? "").localeCompare(b.concepto ?? ""));
  renderFilas(filtrados);
}

// Modal de edición
async function abrirModalEdicion(id) {
  const ref = doc(db, COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    alert("El producto ya no existe.");
    return;
  }
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

    // Parseo de tipos
    const upd = {
      concepto: fd.get("concepto")?.trim() || "",
      marca: fd.get("marca")?.trim() || "",
      departamento: fd.get("departamento")?.trim() || "",
      // codigoBarra no se cambia porque es el ID/clave
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
      // Refrescar la búsqueda actual
      cacheProductos = []; // limpia cache para que no muestre datos viejos
      buscarProducto();
    } catch (err) {
      console.error(err);
      alert("No se pudo guardar. Revisa tus reglas de Firestore y la consola.");
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

// Crear nuevo
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
      $buscador.value = id;
      buscarProducto();
    } catch (err) {
      console.error(err);
      alert("No se pudo crear. Revisa reglas de Firestore / consola.");
    }
  });
}

// Utilidades varias
function cerrarModal() {
  $modal.style.display = "none";
  $modalDatos.innerHTML = "";
}
function limpiarBusqueda() {
  $buscador.value = "";
  $resultados.innerHTML = "";
  window.actualizarContador?.(0);
}
function cerrarVentana() {
  // Ajusta a tu navegación deseada
  if (history.length > 1) history.back();
  else window.location.href = "./";
}
function numOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

// Exponer funciones para los atributos inline del HTML
window.buscarProducto     = buscarProducto;
window.mostrarFormulario  = mostrarFormulario;
window.cerrarModal        = cerrarModal;
window.cerrarVentana      = cerrarVentana;
window.limpiarBusqueda    = limpiarBusqueda;

// Opcional: autoseleccionar buscador al cargar
$buscador?.focus();
