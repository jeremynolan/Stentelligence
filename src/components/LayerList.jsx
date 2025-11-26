import React from 'react'

const LayerList = ({
  files,
  selectedId,
  onSelect,
  onRemove,
  onToggleEnabled,
}) => {
  return (
    <section className="panel">
      <h2>Layers</h2>
      <p className="panel-subtitle">
        These are the internal Gerber layers discovered from your
        upload (including ZIP contents). Toggle to mute/unmute or
        remove from the stackup.
      </p>

      {(!files || files.length === 0) && (
        <p className="hint">No layers detected yet.</p>
      )}

      {files && files.length > 0 && (
        <div className="layer-list">
          {files.map((layer) => (
            <div
              key={layer.id}
              className={
                'layer-item' +
                (selectedId === layer.id
                  ? ' layer-item--selected'
                  : '')
              }
              onClick={() => onSelect && onSelect(layer.id)}
            >
              <div className="layer-item-main">
                <div className="layer-item-name">
                  {layer.name}
                </div>
                <div className="layer-item-meta">
                  {layer.type || 'other'}
                </div>
              </div>
              <div
                className="layer-item-actions"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  className="layer-toggle"
                  checked={layer.enabled !== false}
                  onChange={() =>
                    onToggleEnabled && onToggleEnabled(layer.id)
                  }
                />
                <button
                  type="button"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: '#6b7280',
                  }}
                  onClick={() => onRemove && onRemove(layer.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default LayerList
