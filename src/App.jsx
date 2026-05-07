import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Alert, ButtonGroup } from 'react-bootstrap'; // или свои иконки
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
  } = useFileManager();

  const [viewMode, setViewMode] = useState('table'); // 'table' | 'json'
  const [rawJson, setRawJson] = useState('');

 const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const isDark = theme === 'dark';

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
      <Row>
        <Col md={2}>
          <FileList
            files={files}
            selected={selectedFile}
            onSelect={selectFile}
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
    </Container>
  );
}

export default App;