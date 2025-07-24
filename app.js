// Importa Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCK5nb6u2CGRJ8AB1aPlRn54b97bdeAFeM",
  authDomain: "inventariopv-643f1.firebaseapp.com",
  projectId: "inventariopv-643f1",
  storageBucket: "inventariopv-643f1.firebasestorage.app",
  messagingSenderId: "96242533231",
  appId: "1:96242533231:web:aae75a18fbaf9840529e9a"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productosRef = collection(db, "productos");

const tablaBody = document.getElementById("tablaBody");

function limpiarFormulario() {
  document.querySelectorAll("#formulario input").forEach(input => input.value = "");
}

function cargarProductos() {
  onSnapshot(productosRef, (snapshot) => {
    tablaBody.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data["Codigo Barra"] || doc.id}</td>
        <td>${data.Concepto || ""}</td>
        <td>${data.Departamento || ""}</td>
        <td>
          <button onclick="editar('${doc.id}')">Editar</button>
          <button onclick="eliminar('${doc.id}')">Eliminar</button>
        </td>
      `;
      tablaBody.appendChild(tr);
    });
  });
}

window.guardarProducto = async () => {
  const codigo = document.getElementById("codigo").value;
  if (!codigo) return alert("El código de barras es obligatorio.");

  const producto = {
    "Codigo Barra": codigo,
    "Concepto": document.getElementById("concepto").value,
    "Clave Sat": document.getElementById("claveSat").value,
    "Unidad de Medida Sat": document.getElementById("unidadSat").value,
    "Costo sin Impuesto": parseFloat(document.getElementById("costo").value) || 0,
    "Mayoreo": parseFloat(document.getElementById("mayoreo").value) || 0,
    "1/2 Mayoreo": parseFloat(document.getElementById("medioMayoreo").value) || 0,
    "Precio Publico": parseFloat(document.getElementById("publico").value) || 0,
    "Departamento": parseInt(document.getElementById("departamento").value) || 0
  };

  await setDoc(doc(db, "productos", codigo), producto);
  limpiarFormulario();
};

window.editar = async (id) => {
  const docRef = doc(db, "productos", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    document.getElementById("codigo").value = id;
    document.getElementById("concepto").value = data.Concepto || "";
    document.getElementById("claveSat").value = data["Clave Sat"] || "";
    document.getElementById("unidadSat").value = data["Unidad de Medida Sat"] || "";
    document.getElementById("costo").value = data["Costo sin Impuesto"] || "";
    document.getElementById("mayoreo").value = data["Mayoreo"] || "";
    document.getElementById("medioMayoreo").value = data["1/2 Mayoreo"] || "";
    document.getElementById("publico").value = data["Precio Publico"] || "";
    document.getElementById("departamento").value = data["Departamento"] || "";
  }
};

window.eliminar = async (id) => {
  if (confirm("¿Estás seguro de eliminar este producto?")) {
    await deleteDoc(doc(db, "productos", id));
  }
};

cargarProductos();
