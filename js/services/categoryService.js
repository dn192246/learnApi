// js/services/categoryService.js
const API_URL = "https://learnapifront-9de8a2348f9a.herokuapp.com/api/category";

export async function getCategories() {
  const res = await fetch(`${API_URL}/getDataCategories`, {
    credentials: "include",
  });
  return res.json();
}

export async function createCategory(payload) {
  await fetch(`${API_URL}/newCategory`, {
    credentials: "include",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateCategory(id, payload) {
  await fetch(`${API_URL}/updateCategory/${id}`, {
    credentials: "include",
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteCategory(id) {
  await fetch(`${API_URL}/deleteCategory/${id}`, {
    credentials: "include",
    method: "DELETE",
  });
}
