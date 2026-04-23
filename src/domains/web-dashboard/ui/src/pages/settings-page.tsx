import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';
import ConfigEditor from '../components/config-editor';

type Scope = 'global' | 'project';

export default function SettingsPage() {
  const [scope, setScope] = useState<Scope>('project');
  const [config, setConfig] = useState<Record<string, any>>({});
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [scope]);

  async function load() {
    try {
      setConfig(await fetchApi(`/api/config/${scope}`));
      setError('');
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <span>Scope:</span>
        <button onClick={() => setScope('global')} style={{ fontWeight: scope === 'global' ? 700 : 400 }}>
          Global
        </button>
        <button onClick={() => setScope('project')} style={{ fontWeight: scope === 'project' ? 700 : 400 }}>
          Project
        </button>
        <span style={{ color: '#999', fontSize: 12 }}>
          {scope === 'global' ? '~/.epost-kit/config.json' : '.claude/.epost-kit.json'}
        </span>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {Object.keys(config).length === 0 && !error && <p style={{ color: '#999' }}>(empty)</p>}
      <ConfigEditor scope={scope} config={config} onSaved={load} />
    </div>
  );
}
