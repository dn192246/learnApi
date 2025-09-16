// js/services/productService.js
const API_URL = "https://learnapifront-9de8a2348f9a.herokuapp.com/api/products";

export async function getProducts(page = 0, size = 10) {
  const res = await fetch(`${API_URL}/getAllProducts`, {
    credentials: "include",
  });
  return res.json();
}

export async function createProduct(data) {
  await fetch(`${API_URL}/newProduct`, {
    credentials: "include",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id, data) {
  await fetch(`${API_URL}/updateProduct/${id}`, {
    credentials: "include",
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id) {
  await fetch(`${API_URL}/deleteProduct/${id}`, {
    credentials: "include",
    method: "DELETE",
  });
}
