import { ListGroup } from 'react-bootstrap';

export default function FileList({ files, selected, onSelect }) {
  const sortedFiles = Array.from(files.keys()).sort((a, b) => a.localeCompare(b));

  return (
    <ListGroup variant="flush" className="small">
      {sortedFiles.map((name) => (
        <ListGroup.Item
          key={name}
          action
          active={name === selected}
          onClick={() => onSelect(name)}
          className="text-truncate"
          style={{ maxWidth: '100%' }}
        >
          {name}
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
}