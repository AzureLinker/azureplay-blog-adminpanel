import { useState, useCallback } from 'react';
import {
  openDirectory,
  readJsonFilesFromDirectory,
  writeFile,
  isFileSystemAccessSupported,
} from '../utils/fileSystem';

// В начале хука:
const ID_FIELD = 'id'; // <-- смени, если у тебя другое имя поля

// Вспомогательная функция пересчёта ID
const recalcIdsIfNumeric = (arr) => {
  if (!Array.isArray(arr) || arr.length === 0) return;
  const firstId = arr[0]?.[ID_FIELD];
  // Пересчитываем только если id существует и является числом
  if (typeof firstId !== 'number') return;

  arr.forEach((item, idx) => {
    item[ID_FIELD] = idx + 1; // 1-based
  });
};

export function useFileManager() {
  const [dirHandle, setDirHandle] = useState(null);
  const [fileContents, setFileContents] = useState(new Map());   // сырые строки
  const [parsedData, setParsedData] = useState(new Map());        // Map<fileName, any>
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);

  // Загрузка директории
  const openDir = useCallback(async () => {
    try {
      const handle = await openDirectory();
      const jsonFiles = await readJsonFilesFromDirectory(handle);
      setDirHandle(handle);
      setFileContents(jsonFiles);

      // Парсим каждый файл
      const parsed = new Map();
      for (const [name, content] of jsonFiles) {
        try {
          parsed.set(name, JSON.parse(content));
        } catch {
          parsed.set(name, content); // оставляем как есть, если не валидный JSON
        }
      }
      setParsedData(parsed);
      setSelectedFile(null);
      setError(null);
    } catch (e) {
      setError(e.message || 'Не удалось открыть папку');
    }
  }, []);

  const selectFile = useCallback((name) => {
    setSelectedFile(name);
  }, []);

  // Получить текущие данные выбранного файла (распарсенные)
  const currentData = selectedFile ? parsedData.get(selectedFile) : undefined;

  // Обновление элемента массива
  const updateItem = useCallback((fileName, index, newItem) => {
    setParsedData((prev) => {
      const next = new Map(prev);
      const arr = [...(next.get(fileName) || [])];
      if (index >= 0 && index < arr.length) {
        arr[index] = newItem;
        next.set(fileName, arr);
      }
      return next;
    });
  }, []);

  // Удаление элемента массива
 const deleteItem = useCallback((fileName, index) => {
  setParsedData((prev) => {
    const next = new Map(prev);
    const arr = [...(next.get(fileName) || [])];
    arr.splice(index, 1);
    recalcIdsIfNumeric(arr);
    next.set(fileName, arr);
    return next;
  });
}, []);

  // Перемещение (Drag & Drop)
const moveItem = useCallback((fileName, from, to) => {
  setParsedData((prev) => {
    const next = new Map(prev);
    const arr = [...(next.get(fileName) || [])];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    recalcIdsIfNumeric(arr);
    next.set(fileName, arr);
    return next;
  });
}, []);

// В useFileManager.js, функция addItem
const addItem = useCallback((fileName, template = {}) => {
  setParsedData(prev => {
    const next = new Map(prev);
    const arr = [...(next.get(fileName) || [])];

    let newItem;
    // Определяем тип элементов массива
    if (arr.length > 0) {
      const sample = arr[0];
      if (typeof sample === 'object' && sample !== null) {
        // Объект: клонируем template или создаём пустой с ключами первого элемента
        newItem = Object.keys(sample).reduce((acc, key) => {
          acc[key] = template[key] !== undefined ? template[key] : '';
          return acc;
        }, {});
        // Генерация id
        const lastItem = arr[arr.length - 1];
        if (lastItem && typeof lastItem === 'object' && ID_FIELD in lastItem) {
          const lastId = lastItem[ID_FIELD];
          if (typeof lastId === 'number') {
            newItem[ID_FIELD] = lastId + 1;
          } else if (typeof lastId === 'string') {
            const match = lastId.match(/(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10) + 1;
              newItem[ID_FIELD] = lastId.slice(0, -match[1].length) + num;
            } else {
              newItem[ID_FIELD] = String(arr.length + 1);
            }
          }
        } else {
          newItem[ID_FIELD] = 1; // число по умолчанию
        }
      } else {
        // Примитив: новый элемент — пустая строка или template, если он совпадает по типу
        newItem = typeof template === typeof sample ? template : '';
      }
    } else {
      // Пустой массив: используем template, иначе пустой объект/строка
      newItem = typeof template === 'object' ? { ...template } : template ?? '';
    }

    arr.push(newItem);
    next.set(fileName, arr);
    return next;
  });
}, []);

  // Сохранение файла на диск
  const saveCurrentFile = useCallback(async () => {
    if (!dirHandle || !selectedFile) return;
    const data = parsedData.get(selectedFile);
    if (data === undefined) return;
    try {
      const content = JSON.stringify(data, null, 2);
      await writeFile(dirHandle, selectedFile, content);
      // обновляем сырое содержимое для консистентности
      setFileContents((prev) => {
        const next = new Map(prev);
        next.set(selectedFile, content);
        return next;
      });
      setError(null);
    } catch (e) {
      setError(e.message || 'Ошибка сохранения');
    }
  }, [dirHandle, selectedFile, parsedData]);

  // Внутри useFileManager, перед return
const saveRawFile = useCallback(async (fileName, rawContent) => {
  if (!dirHandle) return;
  try {
    // Валидация JSON
    const parsed = JSON.parse(rawContent);
    // Обновляем состояния
    setFileContents(prev => {
      const next = new Map(prev);
      next.set(fileName, rawContent);
      return next;
    });
    setParsedData(prev => {
      const next = new Map(prev);
      next.set(fileName, parsed);
      return next;
    });
    await writeFile(dirHandle, fileName, rawContent);
    setError(null);
  } catch (e) {
    setError('Ошибка сохранения: ' + e.message);
  }
}, [dirHandle]);

  return {
    supported: isFileSystemAccessSupported(),
    openDir,
    files: fileContents,
    selectedFile,
    selectFile,
    currentData,          // распарсенные данные выбранного файла
    error,
    updateItem,
    deleteItem,
    moveItem,
    addItem,
    saveCurrentFile,
    saveRawFile,
  };
}