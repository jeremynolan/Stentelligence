import React, { useCallback, useRef, useState } from 'react'

const UploadPanel = ({ onFilesSelected }) => {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleFiles = useCallback(
    (fileList) => {
      if (!fileList || fileList.length === 0) return
      const arr = Array.from(fileList)

      // You can filter here if you want, but we’ll accept:
      // - zipped board jobs
      // - individual Gerber/checkplot files (.gbr, .gtp, .gbp, etc.)
      const allowed = arr.filter((f) => {
        const name = (f.name || '').toLowerCase()
        return (
          name.endsWith('.zip') ||
          name.endsWith('.rar') ||
          name.endsWith('.7z') ||
          name.endsWith('.tar') ||
          name.endsWith('.gz') ||
          name.endsWith('.tgz') ||
          name.endsWith('.tar.gz') ||
          name.endsWith('.gbr') || // checkplot overlays
          name.endsWith('.gtl') ||
          name.endsWith('.gbl') ||
          name.endsWith('.gto') ||
          name.endsWith('.gbo') ||
          name.endsWith('.gtp') ||
          name.endsWith('.gbp') ||
          name.endsWith('.gml') ||
          name.endsWith('.gko') ||
          name.endsWith('.gm1')
        )
      })

      if (allowed.length > 0) {
        onFilesSelected(allowed)
      }
    },
    [onFilesSelected]
  )

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const files = e.dataTransfer?.files
    handleFiles(files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!dragActive) setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only reset when leaving the drop zone, not on every child
    if (e.currentTarget.contains(e.relatedTarget)) return
    setDragActive(false)
  }

  const handleFileInputChange = (e) => {
    handleFiles(e.target.files)
    // reset so selecting the same file again still triggers change
    e.target.value = ''
  }

  const handleClickBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <section className="panel">
      <h2>Upload Job Files</h2>
      <p className="panel-subtitle">
        Drop a zipped Gerber job or individual Gerber files. You can also add
        <strong> .gbr</strong> checkplot overlays and toggle them on/off.
      </p>

      <div
        className={
          'drop-zone' + (dragActive ? ' drop-zone--active' : '')
        }
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClickBrowse}
      >
        <div className="drop-zone-inner">
          <div className="drop-icon">📁</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            Drop files here or click to browse
          </div>
          <div className="hint">
            Supports .zip jobs and individual Gerber files (.gbr, .gtl, .gtp,
            .gbp, etc.).
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        // key part: explicitly allow .gbr
        accept=".zip,.rar,.7z,.tar,.gz,.tgz,.tar.gz,.gbr,.gtl,.gbl,.gto,.gbo,.gtp,.gbp,.gml,.gko,.gm1"
      />
    </section>
  )
}

export default UploadPanel
