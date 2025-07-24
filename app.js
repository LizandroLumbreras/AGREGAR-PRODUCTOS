import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, getDocs
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

let productosCache = [];

async function cargarProductos() {
  const snapshot = await getDocs(productosRef);
  productosCache = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    productosCache.push({
      id: doc.id,
      concepto: data.Concepto || "",
      codigo: data["Codigo Barra"] || "",
      publico: data["Precio Publico"] || 0
    });
  });

  productosCache.sort((a, b) => a.concepto.localeCompare(b.concepto));
  mostrarResultados(productosCache.slice(0, 8));
}

window.buscarProducto = () => {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const filtrados = productosCache.filter(p =>
    p.concepto.toLowerCase().includes(texto)
  );
  mostrarResultados(filtrados.slice(0, 8));
};

function mostrarResultados(lista) {
  const tbody = document.getElementById("resultados");
  tbody.innerHTML = "";

  lista.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.concepto}</td>
      <td>${p.codigo}</td>
      <td>${parseFloat(p.publico).toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.limpiarBusqueda = () => {
  document.getElementById("buscador").value = "";
  buscarProducto();
};

window.mostrarFormulario = () => {
  alert("Aquí irá el formulario para nuevo producto.");
};

window.cerrarVentana = () => {
  window.location.href = "about:blank";
};

cargarProductos();
