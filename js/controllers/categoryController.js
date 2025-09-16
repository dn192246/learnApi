// js/controllers/categoryController.js

import {
  getCategories,
  updateCategory,
  deleteCategory,
  createCategory,
} from "../services/categoryService.js";

import { renderUser, requireAuth, role } from "./sessionController.js";

// Para evitar múltiples registros de listeners si se vuelve con el botón Atrás (bfcache)
let listenersActivos = false;

// Arranque con pageshow: asegura sesión antes de montar UI
window.addEventListener("pageshow", async () => {
  await renderUser(); // pinta menú/usuario coherentes con la sesión
  const ok = await requireAuth({ redirect: true }); // exige sesión; si no hay, redirige a login
  if (!ok) return;

  if (!listenersActivos) activarListeners();

  // Carga inicial
  await loadCategories();
});

function activarListeners() {
  listenersActivos = true;

  // Referencias DOM
  const tableBody = document.querySelector("#categoriesTable tbody");
  const form = document.getElementById("categoryForm");
  const modal = new bootstrap.Modal(document.getElementById("categoryModal"));
  const lbModal = document.getElementById("categoryModalLabel");
  const btnSave = document.getElementById("saveCategory");
  const btnAdd = document.getElementById("btnAddCategory");

  if (!role.isAdmin()) {
    document.getElementById("btnAddCategory")?.classList.add("d-none");
  }


  // Abrir modal en modo "Agregar"
  btnAdd?.addEventListener("click", () => {
    form.reset();
    form.categoryId.value = "";
    lbModal.textContent = "Agregar Categoría";
    modal.show();
  });

  // Guardar (crear/actualizar)
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = form.categoryId.value;
    const payload = {
      // Backend acepta nombreCategoria y descripcion
      nombreCategoria: form.categoryName.value.trim(),
      descripcion: form.categoryDescription.value.trim(),
    };

    if (!payload.nombreCategoria || !payload.descripcion) {
      alert("Por favor, completa Nombre y Descripción.");
      return;
    }

    // Evita doble submit
    btnSave?.setAttribute("disabled", "disabled");

    try {
      if (id) {
        await updateCategory(id, payload);
      } else {
        await createCategory(payload);
      }
      modal.hide();
      await loadCategories();
    } catch (err) {
      console.error("Error al guardar la categoría: ", err);
      alert("No se pudo guardar la categoría.");
    } finally {
      btnSave?.removeAttribute("disabled");
    }
  });

  // Guarda referencias para uso dentro de loadCategories
  activarListeners._refs = { tableBody, form, modal, lbModal };
}

// Cargar y renderizar categorías (se asume array directo)
async function loadCategories() {
  const { tableBody, form, modal, lbModal } = activarListeners._refs || {};
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="5" class="text-muted">Cargando…</td></tr>';

  try {
    const data = await getCategories();

    // Se asume que SIEMPRE devuelve un array directo de categorías
    const categories = Array.isArray(data) ? data : [];

    tableBody.innerHTML = "";

    if (!categories.length) {
      tableBody.innerHTML = '<tr><td colspan="5">Actualmente no hay registros</td></tr>';
      return;
    }

    categories.forEach((cat) => {
      const tr = document.createElement("tr");

      // --- ID ---
      const tdId = document.createElement("td");
      tdId.textContent = cat.idCategoria ?? cat.id ?? "";
      tr.appendChild(tdId);

      // --- Nombre ---
      const tdNombre = document.createElement("td");
      tdNombre.textContent = cat.nombreCategoria ?? cat.nombre ?? "Categoría";
      tr.appendChild(tdNombre);

      // --- Descripción ---
      const tdDesc = document.createElement("td");
      tdDesc.textContent = cat.descripcion || "Descripción no asignada";
      tr.appendChild(tdDesc);

      // --- Fecha ---
      const tdFecha = document.createElement("td");
      tdFecha.textContent = formatDate(cat.fechaCreacion ?? cat.createdAt ?? cat.fecha);
      tr.appendChild(tdFecha);

      // --- Acciones ---
      const tdBtns = document.createElement("td");
      tdBtns.className = "text-nowrap";

      //Verificar rol del usuario
      if (role.isAdmin()) {
        tdBtns.innerHTML = `
        <button class="btn btn-sm btn-outline-secondary me-1 edit-btn" title="Editar">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" 
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/>
          </svg>
        </button>
        <button class="btn btn-sm btn-outline-danger delete-btn" title="Eliminar">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      `;

        // Editar
        tdBtns.querySelector(".edit-btn")?.addEventListener("click", () => {
          form.categoryId.value = cat.idCategoria ?? cat.id ?? "";
          form.categoryName.value = cat.nombreCategoria ?? cat.nombre ?? "";
          form.categoryDescription.value = cat.descripcion ?? "";
          lbModal.textContent = "Editar Categoría";
          modal.show();
        });

        // Eliminar
        tdBtns.querySelector(".delete-btn")?.addEventListener("click", async () => {
          const id = cat.idCategoria ?? cat.id;
          if (!id) return;
          if (confirm("¿Desea eliminar la categoría?")) {
            try {
              await deleteCategory(id);
              await loadCategories();
            } catch (err) {
              console.error("Error eliminando categoría: ", err);
              alert("No se pudo eliminar la categoría.");
            }
          }
        });
      }
      else {
        tdBtns.innerHTML = ""; // Almacenista/Cliente: sin acciones
      }

      tr.appendChild(tdBtns);
      tableBody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error cargando categorías: ", err);
    tableBody.innerHTML =
      '<tr><td colspan="5" class="text-danger">No se pudieron cargar las categorías</td></tr>';
  }
}

// Utilidad: formatear fecha legible o '-'
function formatDate(d) {
  try {
    if (!d) return "-";
    const dt = new Date(d);
    if (isNaN(dt)) return "-";
    return dt.toLocaleDateString("es-SV", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
}
