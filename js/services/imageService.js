// js/services/imageService.js
const IMAGE_API = 'https://learnapifront-9de8a2348f9a.herokuapp.com/api/image'; // Remoto

// Sube una imagen y devuelve el JSON del backend: { message, url }
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file); // Debe coincidir con @RequestParam("image")

  const res = await fetch(`${IMAGE_API}/upload`, {
    method: 'POST',
    body: formData,
    credentials: "include"
  });

  return res.json();
}

// Sube a una carpeta específica
export async function uploadImageToFolder(file, folder) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  const res = await fetch(`${IMAGE_API}/upload-to-folder`, {
    method: 'POST',
    body: formData,
    credentials: "include"
  });

  return res.json();
}
