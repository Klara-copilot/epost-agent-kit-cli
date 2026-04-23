import React, { useState } from 'react';
import DashboardPage from './pages/dashboard-page';
import SettingsPage from './pages/settings-page';
import HooksPage from './pages/hooks-page';
import IgnorePage from './pages/ignore-page';

const tabs = ['Dashboard', 'Settings', 'Hooks', 'Ignore'] as const;
type Tab = (typeof tabs)[number];

export default function App() {
  const [active, setActive] = useState<Tab>('Dashboard');

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <div style={{ borderBottom: '1px solid #e0e0e0', marginBottom: 20, paddingBottom: 10 }}>
        <h2 style={{ margin: 0 }}>epost-kit Config</h2>
      </div>
      <div style={{ display: 'flex', gap: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            style={{
              padding: '8px 16px', cursor: 'pointer', border: 'none', background: 'none',
              borderBottom: active === tab ? '2px solid #0066cc' : '2px solid transparent',
              fontWeight: active === tab ? 600 : 400,
              color: active === tab ? '#0066cc' : '#666',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        {active === 'Dashboard' && <DashboardPage />}
        {active === 'Settings' && <SettingsPage />}
        {active === 'Hooks' && <HooksPage />}
        {active === 'Ignore' && <IgnorePage />}
      </div>
    </div>
  );
}
