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

// Cargar productos al iniciar
document.addEventListener("DOMContentLoaded", async () => {
  const querySnapshot = await getDocs(productosRef);
  todosLosProductos = [];
  querySnapshot.forEach((doc) => {
    todosLosProductos.push({ id: doc.id, ...doc.data() });
  });
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
      <td>${p["Precio Publico"] || ""}</td>
      <td><button onclick="borrarProducto('${p.id}')">🗑️</button></td>
    `;
    tbody.appendChild(fila);
  });
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

// Mostrar formulario para nuevo producto
window.mostrarFormulario = function () {
  const codigo = prompt("Código de barras:");
  if (!codigo) return;
  const concepto = prompt("Descripción del producto:");
  const publico = prompt("Precio público:");
  const mayoreo = prompt("Precio mayoreo:");
  const medioMayoreo = prompt("1/2 Mayoreo:");

  if (!concepto || !publico) return alert("Faltan datos obligatorios");

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

  setDoc(doc(productosRef, codigo), nuevo).then(() => {
    todosLosProductos.push({ id: codigo, ...nuevo });
    buscarProducto();
    alert("Producto agregado.");
  }).catch(err => alert("Error: " + err));
};

// Cerrar ventana (solo útil si es modal)
window.cerrarVentana = function () {
  alert("Aquí puedes cerrar el modal o redirigir si lo deseas.");
};
