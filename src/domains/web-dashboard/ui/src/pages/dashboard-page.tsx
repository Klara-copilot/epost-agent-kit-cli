import React, { useEffect, useState } from 'react';
import { fetchApi } from '../api/client';
import SourceBadge from '../components/source-badge';

interface MergedResult {
  merged: Record<string, any>;
  sources: Record<string, string>;
}

export default function DashboardPage() {
  const [data, setData] = useState<MergedResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setData(await fetchApi<MergedResult>('/api/config'));
      setError('');
    } catch (e: any) { setError(e.message); }
  }

  if (!data && !error) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  const leaves = flattenLeaves(data!.merged);

  return (
    <div>
      <h3>Merged Config ({leaves.length} keys)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e0e0e0', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Key</th>
            <th style={{ padding: 8 }}>Value</th>
            <th style={{ padding: 8 }}>Source</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map(([key, val]) => (
            <tr key={key} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: 8 }}><code>{key}</code></td>
              <td style={{ padding: 8 }}><code>{JSON.stringify(val)}</code></td>
              <td style={{ padding: 8 }}><SourceBadge source={data!.sources[key] ?? 'default'} /></td>
            </tr>
          ))}
        </tbody>
      </table>
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
