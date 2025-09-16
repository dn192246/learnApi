// js/controllers/productController.js

// --- 1. Importación de servicios para comunicación con la API ---
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../services/productService.js";

import { getCategories } from "../services/categoryService.js";
import { uploadImageToFolder } from "../services/imageService.js";

// Integración de sesión, menú y guard
import { renderUser, requireAuth } from "./sessionController.js";

// --- 2. Variables globales para la paginación ---
let currentPage = 0;
let currentSize = 10;

// Evita duplicar listeners si pageshow se ejecuta más de una vez
let listenersActivos = false;

// --- 3. Arranque robusto con pageshow ---
// Este evento cubre también los casos en que el navegador usa Back-Forward Cache.
// Garantiza que la sesión y los datos sean revalidados.
window.addEventListener("pageshow", async () => {
  await renderUser(); // pinta menú y saludo
  const ok = await requireAuth({ redirect: true }); // verifica autenticación
  if (!ok) return;

  if (!listenersActivos) ActivarListeners();

  // Inicializa tamaño de página desde el <select>
  const sizeSelector = document.getElementById("pageSize");
  currentSize = parseInt(sizeSelector?.value || "10") || 10;
  currentPage = 0;

  // Carga inicial de datos
  await cargarCategorias();
  await cargarProductos();
});

// Enlaza los eventos de la interfaz una sola vez
function ActivarListeners() {
  listenersActivos = true;

  const tableBody = document.querySelector("#itemsTable tbody");
  const form = document.getElementById("productForm");
  const modal = new bootstrap.Modal(document.getElementById("itemModal"));
  const modalLabel = document.getElementById("itemModalLabel");
  const btnAdd = document.getElementById("btnAdd");

  const imageFileInput = document.getElementById("productImageFile");
  const imageUrlHidden = document.getElementById("productImageUrl");
  const imagePreview = document.getElementById("productImagePreview");

  // --- 4. Previsualizar imagen seleccionada ---
  if (imageFileInput && imagePreview) {
    imageFileInput.addEventListener("change", () => {
      const file = imageFileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => (imagePreview.src = reader.result);
        reader.readAsDataURL(file);
      } else {
        imagePreview.src = imageUrlHidden?.value || "";
      }
    });
  }

  // --- 5. Selector de tamaño de página ---
  const sizeSelector = document.getElementById("pageSize");
  sizeSelector?.addEventListener("change", () => {
    currentSize = parseInt(sizeSelector.value) || 10;
    currentPage = 0;
    cargarProductos();
  });

  // --- 6. Botón "Agregar" ---
  btnAdd?.addEventListener("click", () => {
    limpiarFormulario();
    modalLabel.textContent = "Agregar Producto";
    modal.show();
  });

  // --- 7. Submit del formulario (crear/actualizar producto) ---
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    let id = form.productId.value;

    // --- 8. Manejo de imagen ---
    let finalImageUrl = imageUrlHidden?.value || "";
    const file = imageFileInput?.files?.[0];
    if (file) {
      try {
        const data = await uploadImageToFolder(file, "products");
        finalImageUrl = data.url || "";
      } catch (err) {
        console.error("Error subiendo imagen:", err);
        alert("No se pudo subir la imagen. Intenta nuevamente.");
        return;
      }
    }

    // --- 9. Construcción del payload ---
    const payload = {
      nombre: form.productName.value.trim(),
      precio: Number(form.productPrice.value),
      descripcion: form.productDescription.value.trim(),
      stock: Number(form.productStock.value),
      fechaIngreso: form.productDate.value,
      categoriaId: Number(form.productCategory.value),
      usuarioId: 2,
      imagen_url: finalImageUrl || null,
    };

    // --- 10. Crear o actualizar producto ---
    try {
      if (id) {
        await updateProduct(id, payload);
      } else {
        await createProduct(payload);
      }
      modal.hide();
      await cargarProductos();
    } catch (err) {
      console.error("Error guardando:", err);
      alert("Ocurrió un error al guardar el producto.");
    }
  });

  // Guarda referencias en un objeto asociado a la función
  ActivarListeners._refs = { tableBody, form, modal, modalLabel, imageFileInput, imageUrlHidden, imagePreview };
}

// --- 11. Cargar productos con paginación ---
async function cargarProductos() {
  const { tableBody } = ActivarListeners._refs || {};
  if (!tableBody) return; // si aún no hay tabla, no hace nada

  try {
    // Solicitud al backend de la página y tamaño actuales
    const data = await getProducts(currentPage, currentSize);

    // Se asume respuesta paginada: { content, number, totalPages, totalElements }
    const items = data?.content ?? [];
    const pageNumber = data?.number ?? currentPage;
    const totalPages = data?.totalPages ?? 1;

    // Limpieza de tabla y renderizado de la paginación
    tableBody.innerHTML = "";
    renderPagination(pageNumber, totalPages);

    // --- 12. Renderizado de filas ---
    items.forEach((item) => {
      const tr = document.createElement("tr");

      // ID del producto
      const tdId = document.createElement("td");
      tdId.textContent = item.id;
      tr.appendChild(tdId);

      // Imagen (si existe se muestra, si no aparece “Sin imagen”)
      const tdImg = document.createElement("td");
      if (item.imagen_url) {
        const img = document.createElement("img");
        img.className = "thumb";
        img.alt = "img";
        img.src = item.imagen_url;
        tdImg.appendChild(img);
      } else {
        const span = document.createElement("span");
        span.className = "text-muted";
        span.textContent = "Sin imagen";
        tdImg.appendChild(span);
      }
      tr.appendChild(tdImg);

      // Nombre del producto (con fallback por compatibilidad)
      const tdNombre = document.createElement("td");
      tdNombre.textContent = item.nombre ?? item.nombreProducto ?? "Producto";
      tr.appendChild(tdNombre);

      // Descripción
      const tdDesc = document.createElement("td");
      tdDesc.textContent = item.descripcion ?? "";
      tr.appendChild(tdDesc);

      // Stock disponible
      const tdStock = document.createElement("td");
      tdStock.textContent = item.stock ?? 0;
      tr.appendChild(tdStock);

      // Fecha de ingreso (compatibilidad con distintos nombres de campo)
      const tdFecha = document.createElement("td");
      tdFecha.textContent = item.fechaIngreso ?? item.createdAt ?? item.fecha ?? "";
      tr.appendChild(tdFecha);

      // Precio (con formato numérico de 2 decimales)
      const tdPrecio = document.createElement("td");
      const precioNum = Number(item.precio ?? item.precioUnitario ?? 0);
      tdPrecio.textContent = `$${precioNum.toFixed(2)}`;
      tr.appendChild(tdPrecio);

      // Columna de botones de acción
      const tdBtns = document.createElement("td");

      // Botón Editar → abre modal con formulario
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-sm btn-outline-secondary me-1 edit-btn";
      btnEdit.title = "Editar";
      btnEdit.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="lucide lucide-square-pen">
          <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>
        </svg>`;
      btnEdit.addEventListener("click", () => setFormulario(item));
      tdBtns.appendChild(btnEdit);

      // Botón Eliminar → pide confirmación antes de eliminar
      const btnDel = document.createElement("button");
      btnDel.className = "btn btn-sm btn-outline-danger delete-btn";
      btnDel.title = "Eliminar";
      btnDel.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          class="lucide lucide-trash-2">
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          <path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>`;
      btnDel.addEventListener("click", () => {
        if (confirm("¿Eliminar este producto?")) {
          eliminarProducto(item.id);
        }
      });
      tdBtns.appendChild(btnDel);

      tr.appendChild(tdBtns);

      // Inserta la fila en la tabla
      tableBody.appendChild(tr);
    });
  } catch (err) {
    // En caso de error, se muestra mensaje en la tabla
    console.error("Error cargando productos:", err);
    tableBody.innerHTML = `<tr><td colspan="8" class="text-danger">No se pudieron cargar los productos.</td></tr>`;
  }
}


// --- 13. Cargar categorías ---
async function cargarCategorias() {
  // Referencia al <select> donde se mostrarán las categorías
  const select = document.getElementById("productCategory");
  if (!select) return; // si no existe el select, se termina la función

  try {
    // 1. Solicita categorías al backend
    const data = await getCategories();

    // 2. Se asume respuesta paginada: se obtiene data.content
    const cats = Array.isArray(data?.content) ? data.content : [];

    // 3. Limpia el contenido actual del <select>
    select.innerHTML = "";

    // 4. Inserta un placeholder "Seleccione..."
    const opt = document.createElement("option");
    opt.value = "";
    opt.disabled = true;
    opt.selected = true;
    opt.hidden = true;
    opt.textContent = "Seleccione...";
    select.appendChild(opt);

    // 5. Recorre cada categoría y genera una <option> en el <select>
    cats.forEach((c) => {
      const id = c.idCategoria ?? c.id ?? c.categoriaId; // posibles nombres de ID según backend
      const nombre = c.nombreCategoria ?? c.nombre ?? "Categoría"; // posibles nombres de campo para nombre
      const option = document.createElement("option");
      option.value = id;
      option.textContent = nombre;
      option.title = c.descripcion ?? ""; // la descripción se usa como tooltip
      select.appendChild(option);
    });
  } catch (err) {
    // 6. Manejo de error si falla la carga
    console.error("Error cargando categorías:", err);
  }
}


// --- 14. Rellenar formulario ---
function setFormulario(item) {
  // Obtiene referencias a los elementos del formulario y modal desde ActivarListeners
  const { form, modal, modalLabel, imageUrlHidden, imagePreview, imageFileInput } = ActivarListeners._refs || {};
  if (!form) return; // si no existe el formulario, termina la ejecución

  // Asigna valores básicos del producto a los campos del formulario
  form.productId.value = item.id;
  form.productName.value = item.nombre ?? item.nombreProducto ?? ""; // usa nombre alternativo si existe
  form.productPrice.value = item.precio ?? item.precioUnitario ?? 0;
  form.productStock.value = item.stock ?? 0;
  form.productDescription.value = item.descripcion ?? "";
  form.productCategory.value = (item.categoriaId ?? item.idCategoria ?? "") || "";

  // Formatea fecha en formato YYYY-MM-DD
  form.productDate.value = (item.fechaIngreso ?? item.createdAt ?? item.fecha ?? "").toString().slice(0, 10);

  // Manejo de la imagen del producto
  if (imageUrlHidden) imageUrlHidden.value = item.imagen_url || item.imagenUrl || item.imageUrl || "";
  if (imagePreview) imagePreview.src = imageUrlHidden?.value || ""; // muestra preview si existe
  if (imageFileInput) imageFileInput.value = ""; // limpia campo file

  // Actualiza título del modal y lo muestra
  modalLabel.textContent = "Editar Producto";
  modal.show();
}

// --- 15. Limpiar formulario ---
function limpiarFormulario() {
  const { form, imageUrlHidden, imagePreview, imageFileInput } = ActivarListeners._refs || {};
  if (!form) return;
  form.reset();
  form.productId.value = "";
  if (imageUrlHidden) imageUrlHidden.value = "";
  if (imagePreview) imagePreview.src = "";
  if (imageFileInput) imageFileInput.value = "";
}

// --- 16. Eliminar producto ---
async function eliminarProducto(id) {
  try {
    await deleteProduct(id);
    await cargarProductos();
  } catch (err) {
    console.error("Error eliminando:", err);
    alert("No se pudo eliminar el producto.");
  }
}

// --- 17. Renderizado de paginación ---
function renderPagination(current, totalPages) {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  pagination.innerHTML = "";

  // Crear botón "Anterior"
  const prev = document.createElement("li");
  prev.className = `page-item ${current === 0 ? "disabled" : ""}`; // deshabilita si está en la primera página
  const prevLink = document.createElement("a");
  prevLink.className = "page-link";
  prevLink.href = "#";
  prevLink.textContent = "Anterior";
  // Al hacer clic, retrocede una página si no está en la primera
  prevLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (current > 0) {
      currentPage = current - 1;
      cargarProductos();
    }
  });
  prev.appendChild(prevLink);
  pagination.appendChild(prev);

  // Crear botones numéricos para cada página
  for (let i = 0; i < totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === current ? "active" : ""}`; // resalta la página actual
    const link = document.createElement("a");
    link.className = "page-link";
    link.href = "#";
    link.textContent = i + 1; // muestra número de página
    // Al hacer clic, carga la página seleccionada
    link.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = i;
      cargarProductos();
    });
    li.appendChild(link);
    pagination.appendChild(li);
  }

  // Crear botón "Siguiente"
  const next = document.createElement("li");
  next.className = `page-item ${current >= totalPages - 1 ? "disabled" : ""}`; // deshabilita si está en la última página
  const nextLink = document.createElement("a");
  nextLink.className = "page-link";
  nextLink.href = "#";
  nextLink.textContent = "Siguiente";
  // Al hacer clic, avanza una página si no está en la última
  nextLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (current < totalPages - 1) {
      currentPage = current + 1;
      cargarProductos();
    }
  });
  next.appendChild(nextLink);
  pagination.appendChild(next);

}
