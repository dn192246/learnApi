// js/controllers/productController.js

// --- 1. Importamos servicios para comunicación con la API ---
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  // getProductById // si lo tienes, puedes usarlo en editar
} from "../services/productService.js";

import { getCategories } from "../services/categoryService.js";
import { uploadImageToFolder } from "../services/imageService.js";

// 👇 NUEVO: integrar sesión/menú y guard
import { renderUser, requireAuth } from "./sessionController.js";

// --- 2. Variables globales para la paginación ---
let currentPage = 0;
let currentSize = 10;

// Para no duplicar listeners si pageshow corre más de una vez
let _listenersBound = false;

// --- 3. Arranque robusto con pageshow (cubre bfcache) ---
window.addEventListener("pageshow", async () => {
  // Menú, saludo, logout
  await renderUser();

  // Pide sesión; si no hay, redirige a login
  const ok = await requireAuth({ redirect: true });
  if (!ok) return;

  // Enlazar listeners una sola vez
  if (!_listenersBound) bindOnce();

  // Tamaño inicial
  const sizeSelector = document.getElementById("pageSize");
  currentSize = parseInt(sizeSelector?.value || "10") || 10;
  currentPage = 0;

  // Datos iniciales
  await cargarCategorias();
  await cargarProductos();
});

// Enlaza handlers/UI solo una vez
function bindOnce() {
  _listenersBound = true;

  // Referencias a elementos del DOM
  const tableBody = document.querySelector("#itemsTable tbody");
  const form = document.getElementById("productForm");
  const modal = new bootstrap.Modal(document.getElementById("itemModal")); // Bootstrap modal
  const modalLabel = document.getElementById("itemModalLabel");
  const btnAdd = document.getElementById("btnAdd");

  // Campos para manejo de imágenes
  const imageFileInput = document.getElementById("productImageFile"); // Input type="file"
  const imageUrlHidden = document.getElementById("productImageUrl");  // Campo hidden
  const imagePreview = document.getElementById("productImagePreview"); // Preview <img>

  // --- 4. Previsualizar imagen seleccionada ---
  if (imageFileInput && imagePreview) {
    imageFileInput.addEventListener("change", () => {
      const file = imageFileInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => (imagePreview.src = reader.result); // Mostrar preview
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

  // --- 6. Botón "Agregar" resetea formulario y abre modal ---
  btnAdd?.addEventListener("click", () => {
    limpiarFormulario();
    modalLabel.textContent = "Agregar Producto";
    modal.show();
  });

  // --- 7. Submit del formulario (Crear/Actualizar producto) ---
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    let id = form.productId.value;

    // --- 8. Manejo de imagen: usar valor actual o subir nueva ---
    let finalImageUrl = imageUrlHidden?.value || "";
    const file = imageFileInput?.files?.[0];
    if (file) {
      try {
        const data = await uploadImageToFolder(file, "products"); // Subir al backend
        finalImageUrl = data.url || "";
      } catch (err) {
        console.error("Error subiendo imagen:", err);
        alert("No se pudo subir la imagen. Intenta nuevamente.");
        return; // Si falla la subida, no guardamos producto
      }
    }

    // --- 9. Construcción del payload para enviar a API ---
    const payload = {
      nombre: form.productName.value.trim(),
      precio: Number(form.productPrice.value),
      descripcion: form.productDescription.value.trim(),
      stock: Number(form.productStock.value),
      fechaIngreso: form.productDate.value,
      categoriaId: Number(form.productCategory.value),
      usuarioId: 2, // Por ahora fijo (ajústalo cuando tengas user real)
      imagen_url: finalImageUrl || null, // <-- mantiene tu campo backend
    };

    // --- 10. Crear o actualizar producto ---
    try {
      if (id) {
        await updateProduct(id, payload);
      } else {
        await createProduct(payload);
      }
      modal.hide();
      await cargarProductos(); // Refrescar tabla
    } catch (err) {
      console.error("Error guardando:", err);
      alert("Ocurrió un error al guardar el producto.");
    }
  });

  // Exponer en closures lo que usa más abajo
  // (para no re-declarar en cada llamada)
  bindOnce._refs = { tableBody, form, modal, modalLabel, imageFileInput, imageUrlHidden, imagePreview };
}

// --- 11. Cargar productos con paginación (soporta pageable o array) ---
async function cargarProductos() {
  const { tableBody } = bindOnce._refs || {};
  if (!tableBody) return;

  try {
    // Aquí mandamos a traer productos del backend.
    // Le indicamos la cantidad de registros y la página actual.
    const data = await getProducts(currentPage, currentSize);

    // Normalización por si el backend devuelve array plano
    const items = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
    const pageNumber  = Number.isFinite(data?.number) ? data.number : currentPage;
    const totalPages  = Number.isFinite(data?.totalPages) ? data.totalPages
                       : Math.max(1, Math.ceil((Array.isArray(data) ? data.length : (data?.totalElements || items.length || 0)) / currentSize));

    // Limpiamos la tabla antes de llenarla.
    tableBody.innerHTML = "";
    renderPagination(pageNumber, totalPages);

    // --- 12. Renderizado de filas en la tabla ---
    items.forEach((item) => {
      // Por cada registro se crea un <tr>
      const tr = document.createElement("tr");

      // ID
      const tdId = document.createElement("td");
      tdId.textContent = item.id;
      tr.appendChild(tdId);

      // Imagen
      const tdImg = document.createElement("td");
      if (item.imagen_url) {
        const img = document.createElement("img");
        img.className = "thumb";
        img.alt = "img";
        img.src = item.imagen_url; // Opcional: validar dominio aquí
        tdImg.appendChild(img);
      } else {
        const span = document.createElement("span");
        span.className = "text-muted";
        span.textContent = "Sin imagen";
        tdImg.appendChild(span);
      }
      tr.appendChild(tdImg);

      // Nombre
      const tdNombre = document.createElement("td");
      tdNombre.textContent = item.nombre ?? item.nombreProducto ?? "Producto";
      tr.appendChild(tdNombre);

      // Descripción
      const tdDesc = document.createElement("td");
      tdDesc.textContent = item.descripcion ?? "";
      tr.appendChild(tdDesc);

      // Stock
      const tdStock = document.createElement("td");
      tdStock.textContent = item.stock ?? 0;
      tr.appendChild(tdStock);

      // Fecha
      const tdFecha = document.createElement("td");
      tdFecha.textContent = item.fechaIngreso ?? item.createdAt ?? item.fecha ?? "";
      tr.appendChild(tdFecha);

      // Precio
      const tdPrecio = document.createElement("td");
      const precioNum = Number(item.precio ?? item.precioUnitario ?? 0);
      tdPrecio.textContent = `$${precioNum.toFixed(2)}`;
      tr.appendChild(tdPrecio);

      // Botones Editar/Eliminar
      const tdBtns = document.createElement("td");

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

      // Añadir fila
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error cargando productos:", err);
    tableBody.innerHTML = `<tr><td colspan="8" class="text-danger">No se pudieron cargar los productos.</td></tr>`;
  }
}

// --- 13. Cargar categorías para <select> (soporta pageable o array) ---
async function cargarCategorias() {
  const select = document.getElementById("productCategory");
  if (!select) return;

  try {
    const data = await getCategories();
    const cats = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
    select.innerHTML = "";

    const opt = document.createElement("option");
    opt.value = "";
    opt.disabled = true;
    opt.selected = true;
    opt.hidden = true;
    opt.textContent = "Seleccione...";
    select.appendChild(opt);

    cats.forEach((c) => {
      const id = c.idCategoria ?? c.id ?? c.categoriaId;
      const nombre = c.nombreCategoria ?? c.nombre ?? "Categoría";
      const option = document.createElement("option");
      option.value = id;
      option.textContent = nombre;
      option.title = c.descripcion ?? "";
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error cargando categorías:", err);
  }
}

// --- 14. Rellenar formulario para editar producto ---
function setFormulario(item) {
  const { form, modal, modalLabel, imageUrlHidden, imagePreview, imageFileInput } = bindOnce._refs || {};
  if (!form) return;

  form.productId.value = item.id;
  form.productName.value = item.nombre ?? item.nombreProducto ?? "";
  form.productPrice.value = item.precio ?? item.precioUnitario ?? 0;
  form.productStock.value = item.stock ?? 0;
  form.productDescription.value = item.descripcion ?? "";
  form.productCategory.value = (item.categoriaId ?? item.idCategoria ?? "") || "";
  form.productDate.value = (item.fechaIngreso ?? item.createdAt ?? item.fecha ?? "").toString().slice(0, 10);

  if (imageUrlHidden) imageUrlHidden.value = item.imagen_url || item.imagenUrl || item.imageUrl || "";
  if (imagePreview) imagePreview.src = imageUrlHidden?.value || "";
  if (imageFileInput) imageFileInput.value = "";

  modalLabel.textContent = "Editar Producto";
  modal.show();
}

// --- 15. Resetear formulario (al agregar nuevo producto) ---
function limpiarFormulario() {
  const { form, imageUrlHidden, imagePreview, imageFileInput } = bindOnce._refs || {};
  if (!form) return;
  form.reset();
  form.productId.value = "";
  if (imageUrlHidden) imageUrlHidden.value = "";
  if (imagePreview) imagePreview.src = "";
  if (imageFileInput) imageFileInput.value = "";
}

// --- 16. Eliminar producto por ID ---
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

  // Botón Anterior
  const prev = document.createElement("li");
  prev.className = `page-item ${current === 0 ? "disabled" : ""}`;
  const prevLink = document.createElement("a");
  prevLink.className = "page-link";
  prevLink.href = "#";
  prevLink.textContent = "Anterior";
  prevLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (current > 0) {
      currentPage = current - 1;
      cargarProductos();
    }
  });
  prev.appendChild(prevLink);
  pagination.appendChild(prev);

  // Números de página
  for (let i = 0; i < totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === current ? "active" : ""}`;
    const link = document.createElement("a");
    link.className = "page-link";
    link.href = "#";
    link.textContent = i + 1;
    link.addEventListener("click", (e) => {
      e.preventDefault();
      currentPage = i;
      cargarProductos();
    });
    li.appendChild(link);
    pagination.appendChild(li);
  }

  // Botón Siguiente
  const next = document.createElement("li");
  next.className = `page-item ${current >= totalPages - 1 ? "disabled" : ""}`;
  const nextLink = document.createElement("a");
  nextLink.className = "page-link";
  nextLink.href = "#";
  nextLink.textContent = "Siguiente";
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
