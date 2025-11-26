import React from 'react'

const AIPanel = ({ pasteColor, onPasteColorChange, editMode, onEditModeChange }) => {
  return (
    <section className="panel">
      <h2>AI &amp; Display</h2>
      <p className="panel-subtitle">
        This viewer will connect to StenTech&apos;s AI stencil engine. For now,
        tune how paste layers are visualized and toggle edit mode.
      </p>

      {/* Edit mode toggle */}
      <div className="display-block">
        <p className="ai-example-label">Mode</p>
        <div className="display-row">
          <button
            type="button"
            className={
              'mode-button ' + (editMode === 'view' ? 'mode-button--active' : '')
            }
            onClick={() => onEditModeChange('view')}
          >
            View
          </button>
          <button
            type="button"
            className={
              'mode-button ' +
              (editMode === 'edit-paste' ? 'mode-button--active' : '')
            }
            onClick={() => onEditModeChange('edit-paste')}
          >
            Edit paste
          </button>
        </div>
        <p className="hint">
          In <strong>Edit paste</strong> mode, drag a box over the top view to
          define a pad region, then enter a % change.
        </p>
      </div>

      {/* Example prompt text (for future AI) */}
      <div className="ai-example">
        <p className="ai-example-label">Example AI prompt (future)</p>
        <p className="ai-example-body">
          “Reduce paste by 15% on all 0201 pads and open thermal pads by 5 mil.”
        </p>
      </div>

      {/* Paste color picker */}
      <div className="display-block">
        <p className="ai-example-label">Paste pad color</p>
        <div className="display-row">
          <input
            type="color"
            value={pasteColor}
            onChange={(e) => onPasteColorChange(e.target.value)}
          />
          <span className="display-color-code">{pasteColor}</span>
        </div>
        <p className="hint">
          Applies to pads on paste layers in the rendered top/bottom views.
        </p>
      </div>
    </section>
  )
}

export default AIPanel
