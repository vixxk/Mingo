export function Skeleton({ width, height, borderRadius = 8, style }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--bg-tertiary)',
        backgroundImage: 'linear-gradient(90deg, var(--bg-tertiary) 0%, var(--bg-hover) 50%, var(--bg-tertiary) 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export function AdminPageSkeleton({ type = 'list' }) {
  const containerStyle = {
    padding: 16,
    flex: 1,
    backgroundColor: 'var(--bg-primary)',
  }

  if (type === 'dashboard') {
    return (
      <div style={containerStyle}>
        <Skeleton width={180} height={28} style={{ marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} width="100%" height={110} borderRadius={16} />
          ))}
        </div>
        <Skeleton width="100%" height={320} borderRadius={24} style={{ marginBottom: 20 }} />
        <Skeleton width="100%" height={260} borderRadius={24} style={{ marginBottom: 20 }} />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} width={80} height={35} borderRadius={20} />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <Skeleton key={i} width="100%" height={90} borderRadius={16} style={{ marginBottom: 15 }} />
      ))}
    </div>
  )
}
