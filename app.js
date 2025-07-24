import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, getDocs, getDoc
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

window.buscarProducto = async () => {
  const texto = document.getElementById("buscador").value.toLowerCase();
  const snapshot = await getDocs(productosRef);
  let encontrados = [];

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const concepto = (data.Concepto || "").toLowerCase();
    if (concepto.includes(texto)) {
      encontrados.push({ id: docSnap.id, ...data });
    }
  });

  mostrarResultados(encontrados.slice(0, 5));
};

function mostrarResultados(productos) {
  const tbody = document.getElementById("resultados");
  tbody.innerHTML = "";

  productos.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p["Concepto"] || ""}</td>
      <td>${p["Codigo Barra"] || p.id}</td>
      <td>${p["Precio Publico"]?.toFixed(2) || ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.mostrarFormulario = () => {
  document.getElementById("formulario").style.display = "block";
};

window.limpiarBusqueda = () => {
  document.getElementById("buscador").value = "";
  document.getElementById("resultados").innerHTML = "";
};

window.cerrarVentana = () => {
  window.location.href = "about:blank"; // o puedes cerrar un modal, según estructura
};
