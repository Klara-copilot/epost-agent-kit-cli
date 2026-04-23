import React from 'react';

const colors: Record<string, { bg: string; text: string }> = {
  default: { bg: '#e0e0e0', text: '#666' },
  global: { bg: '#f3e5f5', text: '#9c27b0' },
  project: { bg: '#e3f2fd', text: '#1565c0' },
};

export default function SourceBadge({ source }: { source: string }) {
  const c = colors[source] ?? colors.default;
  return (
    <span style={{
      fontSize: 11, padding: '2px 6px', borderRadius: 4,
      background: c.bg, color: c.text, fontWeight: 600,
    }}>
      {source}
    </span>
  );
}
