import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';

export default function IgnorePage() {
  const [patterns, setPatterns] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await fetchApi<{ patterns: string[] }>('/api/ignore');
      setPatterns(data.patterns);
      setError('');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function addPattern() {
    if (!newPattern.trim()) return;
    try {
      await fetchApi('/api/ignore', {
        method: 'POST', body: JSON.stringify({ pattern: newPattern.trim() }),
      });
      setNewPattern('');
      await load();
    } catch (e: any) { setError(e.message); }
  }

  async function removePattern(pattern: string) {
    try {
      await fetchApi(`/api/ignore/${encodeURIComponent(pattern)}`, { method: 'DELETE' });
      await load();
    } catch (e: any) { setError(e.message); }
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h3>Ignore Patterns</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <input
          placeholder="pattern (e.g. node_modules/**)"
          value={newPattern}
          onChange={e => setNewPattern(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addPattern()}
          style={{ flex: 1, padding: 6 }}
        />
        <button onClick={addPattern}>Add</button>
      </div>
      {patterns.length === 0 && <p style={{ color: '#999' }}>No ignore patterns</p>}
      {patterns.map(p => (
        <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <code style={{ flex: 1 }}>{p}</code>
          <button onClick={() => removePattern(p)} style={{ color: '#c00' }}>×</button>
        </div>
      ))}
    </div>
  );
}
