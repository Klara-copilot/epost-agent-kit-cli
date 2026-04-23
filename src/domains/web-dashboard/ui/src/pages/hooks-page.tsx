import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';

type HookStatus = Record<string, { enabled: boolean }>;

export default function HooksPage() {
  const [hooks, setHooks] = useState<HookStatus>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setHooks(await fetchApi<HookStatus>('/api/hooks'));
      setError('');
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function toggle(name: string, enabled: boolean) {
    try {
      await fetchApi(`/api/hooks/${encodeURIComponent(name)}`, {
        method: 'PUT', body: JSON.stringify({ enabled }),
      });
      await load();
    } catch (e: any) { setError(e.message); }
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h3>Hooks</h3>
      {Object.entries(hooks).length === 0 && <p style={{ color: '#999' }}>No hooks configured</p>}
      {Object.entries(hooks).map(([name, { enabled }]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => toggle(name, e.target.checked)}
            />
            <span style={{ fontWeight: 500 }}>{name}</span>
          </label>
          <span style={{ fontSize: 12, color: enabled ? '#4caf50' : '#999' }}>
            {enabled ? 'active' : 'disabled'}
          </span>
        </div>
      ))}
    </div>
  );
}
