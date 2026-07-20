const API = 'http://localhost:3001/api';

export const isFileSystemAccessSupported = () => true; // теперь всегда "поддерживается"

export async function openDirectory() {
  // В новой схеме открытие папки не нужно — сервер всегда работает с data/
  return true;
}

export async function readJsonFilesFromDirectory() {
  const res = await fetch(`${API}/files`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const map = new Map();
  for (const [name, content] of Object.entries(data.files)) {
    map.set(name, content);
  }
  return map;
}

export async function writeFile(dirHandle, fileName, content) {
  const res = await fetch(`${API}/files/${encodeURIComponent(fileName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
}

export async function deleteFileRequest(fileName) {
  const res = await fetch(`${API}/files/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
}

export async function createFileRequest(name, content) {
  const res = await fetch(`${API}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.name;
}