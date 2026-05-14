import { ListGroup, Button } from 'react-bootstrap';

export default function FileList({ files, selected, onSelect, onDeleteFile }) {
  const sortedFiles = Array.from(files.keys()).sort((a, b) => a.localeCompare(b));

  return (
    <ListGroup variant="flush" className="small">
      {sortedFiles.map((name) => (
        <ListGroup.Item
          key={name}
          action
          active={name === selected}
          onClick={() => onSelect(name)}
          className="d-flex justify-content-between align-items-center text-truncate"
        >
          <span className="text-truncate">{name}</span>
          <Button
            variant="outline-danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFile(name);
            }}
            className="ms-2 flex-shrink-0"
          >
            🗑
          </Button>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
}