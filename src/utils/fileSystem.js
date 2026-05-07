export const isFileSystemAccessSupported = () => 'showDirectoryPicker' in window;

export const openDirectory = () => window.showDirectoryPicker();

export const readJsonFilesFromDirectory = async (dirHandle) => {
  const files = new Map();
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === 'file' && name.endsWith('.json')) {
      const file = await handle.getFile();
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        files.set(name, JSON.stringify(parsed, null, 2));
      } catch {
        files.set(name, text);
      }
    }
  }
  return files;
};

export const writeFile = async (dirHandle, fileName, content) => {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
};