import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Alert, ButtonGroup, Modal, Form } from 'react-bootstrap'; // или свои иконки
import { useFileManager } from './hooks/useFileManager';
import FileList from './components/FileList';
import JsonTableEditor from './components/JsonTableEditor';
import JsonEditor from './components/JsonEditor';  // Monaco редактор
import JSZip from 'jszip';
import { saveAs } from 'file-saver';


function App() {
  const {
    supported,
    openDir,
    files,
    selectedFile,
    selectFile,
    currentData,
    error,
    updateItem,
    deleteItem,
    moveItem,
    addItem,
    saveCurrentFile,
    saveRawFile,        // новый метод
    duplicateItem,
    createNewFile,
    dirHandle,
    deleteFile
  } = useFileManager();

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'json'
  const [rawJson, setRawJson] = useState('');

 const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const isDark = theme === 'dark';

  
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileTemplate, setNewFileTemplate] = useState('emptyArray'); // 'emptyArray' | 'emptyObject' | 'copyCurrent'

  const templates = {
    emptyArray: '[]',
    emptyObject: '{}',
    copyCurrent: currentData ? JSON.stringify(currentData, null, 2) : '[]',
  };

  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  // При смене выбранного файла или режима синхронизируем rawJson для Monaco
  useEffect(() => {
    if (selectedFile && viewMode === 'json') {
      const data = currentData;
      setRawJson(data ? JSON.stringify(data, null, 2) : '');
    }
  }, [selectedFile, viewMode, currentData]);

  const exportAsZip = async () => {
    const zip = new JSZip();
    files.forEach((content, name) => zip.file(name, content));
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'blog-data.zip');
  };

  const isArray = Array.isArray(currentData);

  // Обработчик сохранения из Monaco
  const handleRawSave = () => {
    if (selectedFile) {
      saveRawFile(selectedFile, rawJson);
    }
  };

  const handleCreateFile = () => {
  const name = newFileName.trim();
  if (!name) return;
  const fullName = name.endsWith('.json') ? name : `${name}.json`;
  const initialContent = newFileTemplate === 'copyCurrent'
    ? (currentData ? JSON.stringify(currentData, null, 2) : '[]')
    : templates[newFileTemplate];
  createNewFile(fullName, initialContent);
  setShowNewFileModal(false);
  setNewFileName('');
  setNewFileTemplate('emptyArray');
};

const handleDeleteFile = (fileName) => {
  setDeleteTarget(fileName);
};

const confirmDeleteFile = async () => {
  if (deleteTarget) {
    await deleteFile(deleteTarget);
    setDeleteTarget(null);
  }
};

  useEffect(() => {
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      // Предотвращаем стандартное сохранение страницы
      e.preventDefault();
      e.stopPropagation();
      // Сохраняем файл в зависимости от режима
      if (selectedFile) {
        if (viewMode === 'table') saveCurrentFile();
        else if (viewMode === 'json') handleRawSave();
      }
    }
  };
  // Используем фазу захвата, чтобы перехватить событие до Monaco
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
}, [viewMode, selectedFile, saveCurrentFile, handleRawSave]);

  if (!supported) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          File System Access API не поддерживается. Используй Chrome, Edge или Opera.
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-3">
      <Row className="mb-3">
        <Col>
          <Button onClick={openDir} variant="primary">
            Открыть папку с JSON
          </Button>
          <Button
            variant="outline-success"
            onClick={() => setShowNewFileModal(true)}
            className="ms-2"
          >
            + Новый файл
          </Button>
          {files.size > 0 && (
            <Button onClick={exportAsZip} variant="secondary" className="ms-2">
              Экспорт ZIP
            </Button>
          )}
        </Col>
        <Col className="text-end">
          <Button
            variant="outline-secondary"
            onClick={toggleTheme}
            size="sm"
            title="Переключить тему"
          >
            {isDark ? '☀️' : '🌙'}
          </Button>
        </Col>
      </Row>
      {error && (
        <Alert variant="warning" dismissible onClose={() => {}}>
          {error}
        </Alert>
      )}
      <Modal show={!!deleteTarget} onHide={() => setDeleteTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Удалить файл?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Вы уверены, что хотите навсегда удалить <strong>{deleteTarget}</strong>? <strong>После этого файл будет невозможно восстановить!</strong></p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Отмена</Button>
          <Button variant="danger" onClick={confirmDeleteFile}>Удалить</Button>
        </Modal.Footer>
      </Modal>
      <Row>
        <Col md={2}>
          <FileList
            files={files}
            selected={selectedFile}
            onSelect={selectFile}
            onDeleteFile={handleDeleteFile}
          />
        </Col>
        <Col md={10}>
          {!selectedFile && <p className="text-muted">Выбери файл из списка</p>}
          {selectedFile && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <ButtonGroup size="sm">
                  <Button
                    variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                    onClick={() => setViewMode('table')}
                  >
                    Таблица
                  </Button>
                  <Button
                    variant={viewMode === 'json' ? 'primary' : 'outline-primary'}
                    onClick={() => setViewMode('json')}
                  >
                    JSON
                  </Button>
                </ButtonGroup>
                <Button
                  variant="success"
                  size="sm"
                  onClick={viewMode === 'table' ? saveCurrentFile : handleRawSave}
                >
                  Сохранить файл
                </Button>
              </div>

              {viewMode === 'table' && isArray && (
                <JsonTableEditor
                  data={currentData}
                  fileName={selectedFile}
                  onUpdateItem={(index, newItem) => updateItem(selectedFile, index, newItem)}
                  onDeleteItem={(index) => deleteItem(selectedFile, index)}
                  onMoveItem={(src, dst) => moveItem(selectedFile, src, dst)}
                  onAddItem={(template) => addItem(selectedFile, template)}
                  onDuplicateItem={(index) => duplicateItem(selectedFile, index)}
                />
              )}
              {viewMode === 'table' && !isArray && (
                <Alert variant="info">
                  Этот файл не является массивом — табличный вид недоступен. Переключитесь в режим JSON.
                </Alert>
              )}
              {viewMode === 'json' && (
  <div
    style={{
      resize: 'vertical',
      overflow: 'auto',
      height: '60vh',          // явная начальная высота
      minHeight: '200px',
      maxHeight: '90vh',
      border: '1px solid var(--bs-border-color)',
      borderRadius: '0.375rem',
    }}
  >
    <JsonEditor value={rawJson} onChange={setRawJson} isDark={isDark} height="100%" />
  </div>
)}
            </>
          )}
        </Col>
      </Row>
      <Modal show={showNewFileModal} onHide={() => setShowNewFileModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>Новый JSON-файл</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form.Group className="mb-3">
      <Form.Label>Имя файла</Form.Label>
      <Form.Control
        type="text"
        placeholder="например, posts"
        value={newFileName}
        onChange={(e) => setNewFileName(e.target.value)}
        autoFocus
      />
      <Form.Text className="text-muted">.json добавится автоматически, если не указан</Form.Text>
    </Form.Group>
    <Form.Group>
      <Form.Label>Начальное содержимое</Form.Label>
      <Form.Select value={newFileTemplate} onChange={(e) => setNewFileTemplate(e.target.value)}>
        <option value="emptyArray">Пустой массив [ ]</option>
        <option value="emptyObject">Пустой объект {'{ }'}</option>
        {currentData && <option value="copyCurrent">Копия текущего открытого файла</option>}
      </Form.Select>
    </Form.Group>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowNewFileModal(false)}>Отмена</Button>
    <Button variant="primary" onClick={handleCreateFile} disabled={!newFileName.trim()}>
      Создать
    </Button>
  </Modal.Footer>
</Modal>
    </Container>
  );
}

export default App;