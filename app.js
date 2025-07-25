// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc, deleteDoc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Tu configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCK5nb6u2CGRJ8AB1aPlRn54b97bdeAFeM",
  authDomain: "inventariopv-643f1.firebaseapp.com",
  projectId: "inventariopv-643f1",
  storageBucket: "inventariopv-643f1.firebasestorage.app",
  messagingSenderId: "96242533231",
  appId: "1:96242533231:web:aae75a18fbaf9840529e9a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productosRef = collection(db, "productos");
let todosLosProductos = [];

async function cargarProductos() {
  const querySnapshot = await getDocs(productosRef);
  todosLosProductos = [];
  querySnapshot.forEach((doc) => {
    todosLosProductos.push({ id: doc.id, ...doc.data() });
  });
}
 
// Cargar productos al iniciar
document.addEventListener("DOMContentLoaded", async () => {
  await cargarProductos();  // cargar productos solo una vez
  mostrarResultados(todosLosProductos);
});

// Buscar productos por texto
window.buscarProducto = function () {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const filtrados = todosLosProductos.filter(p =>
    p.Concepto?.toLowerCase().includes(texto) ||
    p["Codigo"]?.includes(texto)
  );
  mostrarResultados(filtrados);
};

function mostrarResultados(lista) {
  const tbody = document.getElementById("resultados");
  tbody.innerHTML = "";

  lista.sort((a, b) => (a.Concepto || "").localeCompare(b.Concepto || ""));
  lista.slice(0, 8).forEach(p => {
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.Concepto || ""}</td>
      <td>${p.Codigo || p.id}</td>
      <td>$${parseFloat(p["Precio Publico"] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      <td>
        <button onclick="event.stopPropagation(); editarProducto('${p.id}')">✏️</button>
        <button onclick="event.stopPropagation(); borrarProducto('${p.id}')">🗑️</button>
      </td>
    `;
    fila.setAttribute("onclick", `mostrarDetalle('${p.id}')`);
    fila.style.cursor = "pointer";
    tbody.appendChild(fila);
  });

  if (window.actualizarContador) {
    window.actualizarContador(lista.length);
  }
}

// Limpiar buscador
window.limpiarBusqueda = function () {
  document.getElementById("buscador").value = "";
  mostrarResultados(todosLosProductos);
};

// Borrar producto por ID
window.borrarProducto = async function (id) {
  if (confirm(`¿Seguro que quieres eliminar el producto ${id}?`)) {
    await deleteDoc(doc(productosRef, id));
    todosLosProductos = todosLosProductos.filter(p => p.id !== id);
    buscarProducto();
    alert("Producto eliminado.");
  }
};

window.mostrarFormulario = async function () {
  const codigo = prompt("Código de barras:");
  if (!codigo) return;

  const concepto = prompt("Descripción del producto:");
  const publico = prompt("Precio público:");
  const mayoreo = prompt("Precio mayoreo:");
  const medioMayoreo = prompt("1/2 Mayoreo:");

  if (!concepto || !publico) return alert("Faltan datos obligatorios");

  // Validar existencia
  const docExistente = await getDoc(doc(productosRef, codigo));
  if (docExistente.exists()) {
    alert("Este código ya existe. No se puede duplicar.");
    return;
  }

  const nuevo = {
    "1/2 Mayoreo": medioMayoreo,
    "Clave Sat": "50131700",
    "Codigo": codigo,
    "Codigo Barra": codigo,
    "Concepto": concepto,
    "Costo sin Impuesto": "0",
    "Departamento": "1",
    "Mayoreo": mayoreo,
    "Precio Publico": publico,
    "Unidad de Medida Sat": "H87",
    "estado": "Nuevo"
  };

  await setDoc(doc(productosRef, codigo), nuevo);
  await cargarProductos();
  buscarProducto();
  alert("Producto agregado correctamente.");
};
// Editar producto existente
window.editarProducto = async function (id) {
  const productoRef = doc(productosRef, id);
  const docSnap = await getDoc(productoRef);

  if (!docSnap.exists()) {
    alert("El producto no existe.");
    return;
  }

  const data = docSnap.data();

  // Pedimos nuevos valores mostrando los actuales como default
  const nuevoConcepto = prompt("Descripción:", data.Concepto || "") || data.Concepto;
  const nuevoPublico = prompt("Precio público:", data["Precio Publico"] || "") || data["Precio Publico"];
  const nuevoMayoreo = prompt("Precio mayoreo:", data.Mayoreo || "") || data.Mayoreo;
  const nuevoMedio = prompt("1/2 Mayoreo:", data["1/2 Mayoreo"] || "") || data["1/2 Mayoreo"];

  // Actualizamos Firestore
  await setDoc(productoRef, {
    ...data,
    "Concepto": nuevoConcepto,
    "Precio Publico": nuevoPublico,
    "Mayoreo": nuevoMayoreo,
    "1/2 Mayoreo": nuevoMedio,
    "estado": "Modificado"
  });

  await cargarProductos();
  buscarProducto();
  alert("Producto actualizado.");
};

// Cerrar ventana (solo útil si es modal)
window.cerrarVentana = function () {
  alert("Aquí puedes cerrar el modal o redirigir si lo deseas.");
};
window.mostrarDetalle = function (id) {
  const producto = todosLosProductos.find(p => p.id === id);
  if (!producto) return;

  const contenedor = document.getElementById("modal-datos");
  contenedor.innerHTML = `
    <p><strong>Concepto:</strong> ${producto.Concepto || ""}</p>
    <p><strong>Código:</strong> ${producto.Codigo || producto.id}</p>
    <p><strong>Código Barra:</strong> ${producto["Codigo Barra"] || ""}</p>
    <p><strong>Precio Público:</strong> $${parseFloat(producto["Precio Publico"] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
    <p><strong>Mayoreo:</strong> $${parseFloat(producto.Mayoreo || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
    <p><strong>1/2 Mayoreo:</strong> $${parseFloat(producto["1/2 Mayoreo"] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
    <p><strong>Costo sin Impuesto:</strong> $${parseFloat(producto["Costo sin Impuesto"] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
    <p><strong>Clave Sat:</strong> ${producto["Clave Sat"] || ""}</p>
    <p><strong>Departamento:</strong> ${producto.Departamento || ""}</p>
    <p><strong>Unidad de Medida Sat:</strong> ${producto["Unidad de Medida Sat"] || ""}</p>
    <p><strong>Estado:</strong> ${producto.estado || ""}</p>
  `;
  document.getElementById("modal").style.display = "flex";
};

window.cerrarModal = function () {
  document.getElementById("modal").style.display = "none";
};
