import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function JsonEditor({ value, onChange, isDark, height = '100%' }) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      // отложенный вызов layout, чтобы избежать петли уведомлений
      requestAnimationFrame(() => {
        editorRef.current?.layout();
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ height: '100%', width: '100%' }}>
      <Editor
        height={height}
        defaultLanguage="json"
        value={value}
        onChange={(val) => onChange(val ?? '')}
        theme={isDark ? 'vs-dark' : 'vs'}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: false, // отключаем встроенный, будет наш
        }}
      />
    </div>
  );
}