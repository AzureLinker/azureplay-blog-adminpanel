import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button, Table, Modal, ButtonGroup } from 'react-bootstrap';

// Создание шаблона нового элемента на основе первого элемента массива
function getDefaultItem(data) {
  if (!Array.isArray(data) || data.length === 0) {
    // для пустого массива — пустой объект (можно доработать подсказку)
    return {};
  }
  const sample = data[0];
  if (typeof sample !== 'object' || sample === null) {
    return ''; // примитивный массив
  }
  const newItem = {};
  for (const key of Object.keys(sample)) {
    const val = sample[key];
    if (Array.isArray(val)) {
      newItem[key] = [];
    } else if (typeof val === 'object' && val !== null) {
      newItem[key] = {};
    } else if (typeof val === 'number') {
      newItem[key] = 0;
    } else if (typeof val === 'boolean') {
      newItem[key] = false;
    } else {
      newItem[key] = '';
    }
  }
  return newItem;
}

function EditableCell({ value, onChange, multiline }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value == null ? '' : String(value));

  const commit = () => {
    const num = Number(draft);
    if (!isNaN(num) && draft.trim() !== '') {
      onChange(num);
    } else {
      onChange(draft);
    }
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
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            setDraft(value == null ? '' : String(value));
            setEditing(false);
          }
        }}
        autoFocus
        rows={3}
        style={{ resize: 'vertical' }}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: '1.5em',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        cursor: 'pointer',
        maxWidth: 300,
      }}
      onDoubleClick={() => setEditing(true)}
    >
      {value == null ? '' : String(value)}
    </div>
  );
}

function CellWithNested({ value, onChange, onUpdateNestedArray }) {
  const [showModal, setShowModal] = useState(false);
  const isArray = Array.isArray(value);

  if (isArray) {
    const isArrayOfObjects = value.length > 0 && typeof value[0] === 'object' && value[0] !== null;
    return (
      <>
        <div className="d-flex align-items-center">
          <span className="text-truncate" style={{ maxWidth: 150 }}>
            {value.length === 0
              ? '[]'
              : isArrayOfObjects
                ? `[${value.length} объекта]`
                : JSON.stringify(value).substring(0, 30) +
                  (JSON.stringify(value).length > 30 ? '…' : '')}
          </span>
          <Button variant="link" size="sm" className="ms-1 p-0" onClick={() => setShowModal(true)}>
            ✎
          </Button>
        </div>
        <Modal size="lg" show={showModal} onHide={() => setShowModal(false)} scrollable>
          <Modal.Header closeButton>
            <Modal.Title>Редактировать массив</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ArrayEditor
              array={value}
              onArrayChange={(newArray) => {
                onUpdateNestedArray(newArray);
              }}
            />
          </Modal.Body>
        </Modal>
      </>
    );
  }

  const isComplex = typeof value === 'object' && value !== null;
  const displayValue = isComplex ? JSON.stringify(value, null, 2) : value;

  const handleChange = (newVal) => {
    if (isComplex) {
      try {
        onChange(JSON.parse(newVal));
      } catch {
        onChange(newVal);
      }
    } else {
      onChange(newVal);
    }
  };

  return (
    <EditableCell
      value={displayValue}
      onChange={handleChange}
      multiline={isComplex || (typeof value === 'string' && value.includes('\n'))}
    />
  );
}

function ArrayEditor({ array, onArrayChange }) {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(array, null, 2));
  // subViewMode: 'table' | 'json'
  const [subViewMode, setSubViewMode] = useState('table');

  const isEmpty = array.length === 0;
  const isArrayOfObjects = !isEmpty && typeof array[0] === 'object' && array[0] !== null;

  useEffect(() => {
    // Если массив пуст или не из объектов — принудительно JSON
    if (isEmpty || !isArrayOfObjects) {
      setSubViewMode('json');
    } else {
      setSubViewMode('table');
    }
  }, [array, isEmpty, isArrayOfObjects]);

  // Синхронизация JSON при переключении в JSON-режим
  useEffect(() => {
    if (subViewMode === 'json') {
      setJsonText(JSON.stringify(array, null, 2));
    }
  }, [subViewMode, array]);

  const handleJsonSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        onArrayChange(parsed);
      } else {
        alert('Введённые данные не являются массивом.');
      }
    } catch (e) {
      alert('Невалидный JSON: ' + e.message);
    }
  };

  return (
    <div>
      {!isEmpty && isArrayOfObjects && (
        <div className="d-flex justify-content-between align-items-center mb-2">
          <ButtonGroup size="sm">
            <Button
              variant={subViewMode === 'table' ? 'primary' : 'outline-primary'}
              onClick={() => setSubViewMode('table')}
            >
              Таблица
            </Button>
            <Button
              variant={subViewMode === 'json' ? 'primary' : 'outline-primary'}
              onClick={() => setSubViewMode('json')}
            >
              JSON
            </Button>
          </ButtonGroup>
          {subViewMode === 'json' && (
            <Button size="sm" variant="success" onClick={handleJsonSave}>
              Сохранить
            </Button>
          )}
        </div>
      )}

      {subViewMode === 'table' && isArrayOfObjects && (
        <JsonTableEditor
          data={array}
          fileName="nested"
          onUpdateItem={(idx, newItem) => {
            const newArr = [...array];
            newArr[idx] = newItem;
            onArrayChange(newArr);
          }}
          onDeleteItem={(idx) => {
            const newArr = array.filter((_, i) => i !== idx);
            onArrayChange(newArr);
          }}
          onMoveItem={(src, dst) => {
            const newArr = [...array];
            const [moved] = newArr.splice(src, 1);
            newArr.splice(dst, 0, moved);
            onArrayChange(newArr);
          }}
          onAddItem={(template) => {
            onArrayChange([...array, template]);
          }}
        />
      )}

      {subViewMode === 'json' && (
        <div>
          <textarea
            className="form-control mb-2"
            rows={10}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            style={{ fontFamily: 'monospace', resize: 'vertical' }}
          />
          {isEmpty && (
            <Button variant="primary" onClick={handleJsonSave} className="me-2">
              Сохранить массив
            </Button>
          )}
          {!isEmpty && !isArrayOfObjects && (
            <Button variant="primary" onClick={handleJsonSave}>
              Сохранить массив
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function JsonTableEditor({
  data,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  onAddItem,
  fileName,
}) {
  const isArray = Array.isArray(data);
  const firstItem = isArray && data.length > 0 ? data[0] : null;
  const isPrimitive = firstItem === null || typeof firstItem !== 'object';

  if (!isArray || data.length === 0) {
    return (
      <div className="text-muted">
        <p>Файл пуст или не является массивом.</p>
        <Button
          variant="outline-primary"
          onClick={() => onAddItem(getDefaultItem(data))}
        >
          Создать первый элемент
        </Button>
      </div>
    );
  }

  const columns = isPrimitive ? ['value'] : Object.keys(data[0] || {});

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    onMoveItem(result.source.index, result.destination.index);
  };

  const handleCellChange = (itemIndex, key, newValue) => {
    if (isPrimitive) {
      onUpdateItem(itemIndex, newValue);
    } else {
      const newItem = { ...data[itemIndex], [key]: newValue };
      onUpdateItem(itemIndex, newItem);
    }
  };

  return (
    <div className="table-responsive w-100">
      <div className="mb-2">
        <Button
          variant="success"
          size="sm"
          onClick={() => onAddItem(getDefaultItem(data))}
        >
          + Добавить строку
        </Button>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`table-${fileName}`}>
          {(provided) => (
            <Table striped bordered hover size="sm" ref={provided.innerRef}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  {columns.map((col) => (
                    <th key={col}>{isPrimitive ? 'Значение' : col}</th>
                  ))}
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody {...provided.droppableProps}>
                {data.map((item, index) => (
                  <Draggable
                    key={`${fileName}-${index}`}
                    draggableId={`${fileName}-${index}`}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <tr
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                          background: snapshot.isDragging ? '#e9ecef' : undefined,
                        }}
                      >
                        <td
                          {...provided.dragHandleProps}
                          style={{ cursor: 'grab', textAlign: 'center' }}
                        >
                          ⠿
                        </td>
                        {isPrimitive ? (
                          <td colSpan={columns.length}>
                            <EditableCell
                              value={item}
                              onChange={(newVal) => handleCellChange(index, null, newVal)}
                              multiline
                            />
                          </td>
                        ) : (
                          columns.map((col) => (
                            <td key={col}>
                              <CellWithNested
                                value={item[col]}
                                onChange={(newVal) => handleCellChange(index, col, newVal)}
                                onUpdateNestedArray={(newArr) => {
                                  const updated = { ...data[index], [col]: newArr };
                                  onUpdateItem(index, updated);
                                }}
                              />
                            </td>
                          ))
                        )}
                        <td>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => onDeleteItem(index)}
                          >
                            ✕
                          </Button>
                        </td>
                      </tr>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </tbody>
            </Table>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}