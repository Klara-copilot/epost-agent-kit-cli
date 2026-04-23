import React, { useState } from 'react';
import { fetchApi } from '../api/client';

interface Props {
  scope: 'global' | 'project';
  config: Record<string, any>;
  onSaved: () => void;
}

export default function ConfigEditor({ scope, config, onSaved }: Props) {
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const leaves = flattenLeaves(config);

  async function save(key: string, value: string) {
    let parsed: any;
    try { parsed = JSON.parse(value); } catch { parsed = value; }
    await fetchApi(`/api/config/${scope}/${encodeURIComponent(key)}`, {
      method: 'PUT', body: JSON.stringify({ value: parsed }),
    });
    setEditKey(null);
    onSaved();
  }

  async function remove(key: string) {
    await fetchApi(`/api/config/${scope}/${encodeURIComponent(key)}`, { method: 'DELETE' });
    onSaved();
  }

  async function addNew() {
    if (!newKey.trim()) return;
    await save(newKey.trim(), newValue);
    setNewKey('');
    setNewValue('');
  }

  return (
    <div>
      {leaves.map(([key, val]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <code style={{ flex: 1, fontSize: 13 }}>{key}</code>
          {editKey === key ? (
            <>
              <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{ flex: 1, padding: 4 }} />
              <button onClick={() => save(key, editValue)}>Save</button>
              <button onClick={() => setEditKey(null)}>Cancel</button>
            </>
          ) : (
            <>
              <code style={{ flex: 1, fontSize: 13, color: '#666' }}>{JSON.stringify(val)}</code>
              <button onClick={() => { setEditKey(key); setEditValue(JSON.stringify(val)); }}>Edit</button>
              <button onClick={() => remove(key)} style={{ color: '#c00' }}>×</button>
            </>
          )}
        </div>
      ))}
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <input placeholder="key" value={newKey} onChange={e => setNewKey(e.target.value)} style={{ flex: 1, padding: 4 }} />
        <input placeholder="value" value={newValue} onChange={e => setNewValue(e.target.value)} style={{ flex: 1, padding: 4 }} />
        <button onClick={addNew}>Add</button>
      </div>
    </div>
  );
}

function flattenLeaves(obj: Record<string, any>, prefix = ''): [string, any][] {
  const result: [string, any][] = [];
  for (const [key, val] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      result.push(...flattenLeaves(val, fullKey));
    } else {
      result.push([fullKey, val]);
    }
  }
  return result;
}
