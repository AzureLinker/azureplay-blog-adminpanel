import { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button, Table, Modal, ButtonGroup, Pagination } from 'react-bootstrap';

const PAGE_SIZE = 10;

// --- Вспомогательные функции и компоненты (без изменений) ---
function getDefaultItem(data) {
  if (!Array.isArray(data) || data.length === 0) return {};
  const sample = data[0];
  if (typeof sample !== 'object' || sample === null) return '';
  const newItem = {};
  for (const key of Object.keys(sample)) {
    const val = sample[key];
    if (Array.isArray(val)) newItem[key] = [];
    else if (typeof val === 'object' && val !== null) newItem[key] = {};
    else if (typeof val === 'number') newItem[key] = 0;
    else if (typeof val === 'boolean') newItem[key] = false;
    else newItem[key] = '';
  }
  return newItem;
}

function EditableCell({ value, onChange, multiline }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value == null ? '' : String(value));

  useEffect(() => {
    if (!editing) {
      setDraft(value == null ? '' : String(value));
    }
  }, [value, editing]);

  const commit = () => {
    const num = Number(draft);
    onChange(!isNaN(num) && draft.trim() !== '' ? num : draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <textarea
        className="form-control form-control-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setDraft(value == null ? '' : String(value)); setEditing(false); }
        }}
        autoFocus rows={3} style={{ resize: 'vertical' }}
      />
    );
  }

  return (
    <div
      style={{ minHeight: '1.5em', whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: 'pointer', maxWidth: 300 }}
      onDoubleClick={() => setEditing(true)}
    >
      {value == null ? '' : String(value)}
    </div>
  );
}

function CellWithNested({ value, onChange, onUpdateNestedArray }) {
  const [showModal, setShowModal] = useState(false);
  if (Array.isArray(value)) {
    return (
      <>
        <div className="d-flex align-items-center">
          <span className="text-truncate" style={{ maxWidth: 150 }}>
            {value.length === 0 ? '[]' : typeof value[0] === 'object' && value[0] !== null ? `[${value.length} объекта]` : JSON.stringify(value).substring(0, 30) + (JSON.stringify(value).length > 30 ? '…' : '')}
          </span>
          <Button variant="link" size="sm" className="ms-1 p-0" onClick={() => setShowModal(true)}>✎</Button>
        </div>
        <Modal size="lg" show={showModal} onHide={() => setShowModal(false)} scrollable>
          <Modal.Header closeButton><Modal.Title>Редактировать массив</Modal.Title></Modal.Header>
          <Modal.Body><ArrayEditor array={value} onArrayChange={onUpdateNestedArray} /></Modal.Body>
        </Modal>
      </>
    );
  }
  const isComplex = typeof value === 'object' && value !== null;
  const display = isComplex ? JSON.stringify(value, null, 2) : value;
  const handleChange = (newVal) => {
    if (isComplex) { try { onChange(JSON.parse(newVal)); } catch { onChange(newVal); } }
    else onChange(newVal);
  };
  return <EditableCell value={display} onChange={handleChange} multiline={isComplex || (typeof value === 'string' && value.includes('\n'))} />;
}

function ArrayEditor({ array, onArrayChange }) {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(array, null, 2));
  const [subViewMode, setSubViewMode] = useState('table');
  const isEmpty = array.length === 0;
  const isArrayOfObjects = !isEmpty && typeof array[0] === 'object' && array[0] !== null;

  useEffect(() => { setSubViewMode(isEmpty || !isArrayOfObjects ? 'json' : 'table'); }, [array, isEmpty, isArrayOfObjects]);
  useEffect(() => { if (subViewMode === 'json') setJsonText(JSON.stringify(array, null, 2)); }, [subViewMode, array]);

  const handleJsonSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) onArrayChange(parsed);
      else alert('Введённые данные не являются массивом.');
    } catch (e) { alert('Невалидный JSON: ' + e.message); }
  };

  return (
    <div>
      {!isEmpty && isArrayOfObjects && (
        <div className="d-flex justify-content-between align-items-center mb-2">
          <ButtonGroup size="sm">
            <Button variant={subViewMode === 'table' ? 'primary' : 'outline-primary'} onClick={() => setSubViewMode('table')}>Таблица</Button>
            <Button variant={subViewMode === 'json' ? 'primary' : 'outline-primary'} onClick={() => setSubViewMode('json')}>JSON</Button>
          </ButtonGroup>
          {subViewMode === 'json' && <Button size="sm" variant="success" onClick={handleJsonSave}>Сохранить</Button>}
        </div>
      )}
      {subViewMode === 'table' && isArrayOfObjects && (
        <JsonTableEditor
  data={array}
  fileName="nested"
  onUpdateItem={(i, item) => { const a = [...array]; a[i] = item; onArrayChange(a); }}
  onDeleteItem={(i) => { const a = array.filter((_, idx) => idx !== i); onArrayChange(a); }}
  onMoveItem={(src, dst) => { const a = [...array]; const [m] = a.splice(src, 1); a.splice(dst, 0, m); onArrayChange(a); }}
  onAddItem={(tpl) => { onArrayChange([...array, tpl]); }}
  onDuplicateItem={(i) => {
    const a = [...array];
    const copy = JSON.parse(JSON.stringify(a[i]));
    a.splice(i + 1, 0, copy);
    onArrayChange(a);
  }}
/>
      )}
      {subViewMode === 'json' && (
        <div>
          <textarea className="form-control mb-2" rows={10} value={jsonText}
            onChange={(e) => setJsonText(e.target.value)} style={{ fontFamily: 'monospace', resize: 'vertical' }} />
          <Button variant="primary" onClick={handleJsonSave}>Сохранить массив</Button>
        </div>
      )}
    </div>
  );
}

// --- Новый компонент ячейки порядка ---
function OrderCell({ value, max, onApply }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => { setDraft(String(value)); }, [value]);

  const commit = () => {
    onApply(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        type="number"
        className="form-control form-control-sm"
        style={{ width: '70px' }}
        value={draft}
        min={1}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); }
        }}
        autoFocus
      />
    );
  }

  return (
    <div style={{ cursor: 'pointer', textAlign: 'center' }} onDoubleClick={() => setEditing(true)}>
      {value}
    </div>
  );
}

// --- Основной компонент таблицы с пагинацией и порядком ---
export default function JsonTableEditor({
  data,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  onAddItem,
  onDuplicateItem, // новое
  fileName,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const isArray = Array.isArray(data);
  const firstItem = isArray && data.length > 0 ? data[0] : null;
  const isPrimitive = firstItem === null || typeof firstItem !== 'object';

  // Корректировка страницы при удалении на последней странице
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
    if (currentPage > maxPage) setCurrentPage(maxPage);
  }, [data.length, currentPage]);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const paginatedData = data.slice(startIdx, startIdx + PAGE_SIZE);
  const columns = isPrimitive ? ['value'] : Object.keys(data[0] || {});

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const sourceGlobal = startIdx + result.source.index;
    const destGlobal = startIdx + result.destination.index;
    onMoveItem(sourceGlobal, destGlobal);
  };

  const handleCellChange = (localIndex, key, newValue) => {
    const globalIndex = startIdx + localIndex;
    if (isPrimitive) {
      onUpdateItem(globalIndex, newValue);
    } else {
      const newItem = { ...data[globalIndex], [key]: newValue };
      onUpdateItem(globalIndex, newItem);
    }
  };

  const handleOrderChange = useCallback((localIndex, newPos) => {
    const position = Number(newPos);
    if (isNaN(position) || position < 1 || position > data.length) return;
    const targetIndex = position - 1;
    const currentGlobal = startIdx + localIndex;
    if (targetIndex === currentGlobal) return;
    onMoveItem(currentGlobal, targetIndex);
    const newPage = Math.ceil((targetIndex + 1) / PAGE_SIZE);
    setCurrentPage(newPage);
  }, [data.length, startIdx, onMoveItem]);

  const handleAdd = () => {
    onAddItem(getDefaultItem(data));
    const newLength = data.length + 1;
    setCurrentPage(Math.ceil(newLength / PAGE_SIZE));
  };

  const handleDelete = (localIndex) => {
    onDeleteItem(startIdx + localIndex);
  };

  const handleDuplicateLocal = (localIndex) => {
    const globalIndex = startIdx + localIndex;
    onDuplicateItem(globalIndex);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    for (let i = 1; i <= totalPages; i++) {
      items.push(
        <Pagination.Item key={i} active={i === currentPage} onClick={() => handlePageChange(i)}>
          {i}
        </Pagination.Item>
      );
    }
    return (
      <div className="d-flex justify-content-center mt-2">
        <Pagination size="sm">
          <Pagination.Prev disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} />
          {items}
          <Pagination.Next disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} />
        </Pagination>
      </div>
    );
  };

  if (!isArray || data.length === 0) {
    return (
      <div className="text-muted">
        <p>Файл пуст или не является массивом.</p>
        <Button variant="outline-primary" onClick={() => onAddItem(getDefaultItem(data))}>
          Создать первый элемент
        </Button>
      </div>
    );
  }

  return (
    <div className="table-responsive w-100">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <Button variant="success" size="sm" onClick={handleAdd}>
          + Добавить строку
        </Button>
        <small className="text-muted">
          {data.length} записей (стр. {currentPage} из {totalPages})
        </small>
      </div>
      {renderPagination()}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`table-${fileName}`}>
          {(provided) => (
            <Table striped bordered hover size="sm" ref={provided.innerRef}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th style={{ width: 60 }}>Порядок</th>
                  {columns.map(col => <th key={col}>{isPrimitive ? 'Значение' : col}</th>)}
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody {...provided.droppableProps}>
                {paginatedData.map((item, localIdx) => {
                  const globalIdx = startIdx + localIdx;
                  return (
                    <Draggable key={`${fileName}-${globalIdx}`} draggableId={`${fileName}-${globalIdx}`} index={localIdx}>
                      {(provided, snapshot) => (
                        <tr ref={provided.innerRef} {...provided.draggableProps}
                          style={{ ...provided.draggableProps.style, background: snapshot.isDragging ? '#e9ecef' : undefined }}>
                          <td {...provided.dragHandleProps} style={{ cursor: 'grab', textAlign: 'center' }}>⠿</td>
                          <td>
                            <OrderCell
                              value={globalIdx + 1}
                              max={data.length}
                              onApply={(newOrder) => handleOrderChange(localIdx, newOrder)}
                            />
                          </td>
                          {isPrimitive ? (
                            <td colSpan={columns.length}>
                              <EditableCell
                                value={item}
                                onChange={(v) => handleCellChange(localIdx, null, v)}
                                multiline
                              />
                            </td>
                          ) : (
                            columns.map(col => (
                              <td key={col}>
                                <CellWithNested
                                  value={item[col]}
                                  onChange={(v) => handleCellChange(localIdx, col, v)}
                                  onUpdateNestedArray={(newArr) => {
                                    const updated = { ...data[globalIdx], [col]: newArr };
                                    onUpdateItem(globalIdx, updated);
                                  }}
                                />
                              </td>
                            ))
                          )}
                          <td>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(localIdx)} className="me-1">✕</Button>
                            <Button variant="info" size="sm" onClick={() => onDuplicateItem(startIdx + localIdx)}>⧉</Button>
                          </td>
                        </tr>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </tbody>
            </Table>
          )}
        </Droppable>
      </DragDropContext>
      {renderPagination()}
    </div>
  );
}