import React, { useEffect, useState, useRef } from 'react'

const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

const ViewerPane = ({
  jobFiles,
  pasteColor,
  selectedSide,
  onSideChange,
  layers,
  onLayersDiscovered,
  selectedLayer,
}) => {
  const [topSvg, setTopSvg] = useState('')
  const [bottomSvg, setBottomSvg] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [zoom, setZoom] = useState(1)

  const containerRef = useRef(null)
  const panRef = useRef({
    isPanning: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  })

  const hasBoard = !!jobFiles && jobFiles.length > 0

  // Fetch SVGs from the backend whenever files, pasteColor, or layer-enable state changes
  useEffect(() => {
    if (!jobFiles || jobFiles.length === 0) {
      setTopSvg('')
      setBottomSvg('')
      setError('')
      setLoading(false)
      setZoom(1)
      return
    }

    const renderBoard = async () => {
      try {
        setLoading(true)
        setError('')
        setTopSvg('')
        setBottomSvg('')
        setZoom(1)

        const formData = new FormData()

        // For now, just send a simple config with layer names + enabled flags
        const configPayload = {
          layers: Array.isArray(layers)
            ? layers.map((l) => ({
                name: l.name,
                enabled: l.enabled !== false,
                layerType: l.type || null,
              }))
            : [],
          pasteColor,
        }

        formData.append('config', JSON.stringify(configPayload))

        jobFiles.forEach((entry) => {
          if (entry.file) {
            formData.append('files', entry.file, entry.name)
          }
        })

        const res = await fetch('http://localhost:4000/api/render', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const msg = await res.text()
          throw new Error(msg || 'Render request failed')
        }

        const data = await res.json()
        if (!data.topSvg && !data.bottomSvg) {
          console.warn('No SVG returned from render server')
        }

        setTopSvg(data.topSvg || '')
        setBottomSvg(data.bottomSvg || '')

        if (Array.isArray(data.layersInfo) && onLayersDiscovered) {
          onLayersDiscovered(data.layersInfo)
        }
      } catch (err) {
        console.error('Render error:', err)
        setError(err.message || 'Render failed')
      } finally {
        setLoading(false)
      }
    }

    renderBoard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobFiles, pasteColor, JSON.stringify(layers)])

  // Zoom with mouse wheel
  const handleWheel = (e) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((z) => clamp(z * zoomFactor, 0.1, 24)) // allow very deep zoom
  }

  // Zoom slider (10% – 2400%)
  const handleZoomSlider = (e) => {
    const val = Number(e.target.value) || 100
    setZoom(clamp(val / 100, 0.1, 24))
  }

  const zoomPercent = Math.round(zoom * 100)

  // Pan helpers
  const startPan = (e) => {
    if (!containerRef.current) return
    e.preventDefault()

    panRef.current.isPanning = true
    panRef.current.startX = e.clientX
    panRef.current.startY = e.clientY
    panRef.current.scrollLeft = containerRef.current.scrollLeft
    panRef.current.scrollTop = containerRef.current.scrollTop
  }

  const movePan = (e) => {
    if (!panRef.current.isPanning || !containerRef.current) return

    e.preventDefault()
    const dx = e.clientX - panRef.current.startX
    const dy = e.clientY - panRef.current.startY

    containerRef.current.scrollLeft = panRef.current.scrollLeft - dx
    containerRef.current.scrollTop = panRef.current.scrollTop - dy
  }

  const endPan = () => {
    panRef.current.isPanning = false
  }

  const preventContextMenu = (e) => {
    e.preventDefault()
  }

  const currentSvg =
    selectedSide === 'top'
      ? topSvg
      : selectedSide === 'bottom'
      ? bottomSvg
      : ''

  const titleText = selectedLayer
    ? selectedLayer.name
    : jobFiles && jobFiles[0]
    ? jobFiles[0].name
    : 'Board preview'

  return (
    <div className="viewer-pane">
      {!hasBoard ? (
        <div className="viewer-empty viewer-empty--full">
          <h2>StenTech Gerber Viewer</h2>
          <p>
            Upload your Gerber job (.zip or individual layers) on the
            left to view your board. Internal layers will be listed and
            can be muted just like the tracespace viewer.
          </p>
        </div>
      ) : (
        <div className="viewer-full">
          {/* Toolbar similar to tracespace’s layout */}
          <header className="viewer-toolbar">
            <div className="viewer-toolbar-left">
              <div className="viewer-file-title">
                {titleText}
              </div>
              <div className="viewer-side-toggle">
                <button
                  type="button"
                  className={
                    'side-button ' +
                    (selectedSide === 'top' ? 'side-button--active' : '')
                  }
                  onClick={() => onSideChange('top')}
                >
                  Top
                </button>
                <button
                  type="button"
                  className={
                    'side-button ' +
                    (selectedSide === 'bottom' ? 'side-button--active' : '')
                  }
                  onClick={() => onSideChange('bottom')}
                >
                  Bottom
                </button>
              </div>
            </div>

            <div className="viewer-toolbar-right">
              <div className="zoom-control">
                <span className="zoom-label">Zoom</span>
                <input
                  type="range"
                  min="10"
                  max="2400"
                  value={zoomPercent}
                  onChange={handleZoomSlider}
                />
                <span className="zoom-value">{zoomPercent}%</span>
                <button
                  type="button"
                  className="zoom-reset"
                  onClick={() => setZoom(1)}
                >
                  Reset
                </button>
              </div>
            </div>
          </header>

          {error && (
            <p className="viewer-placeholder viewer-placeholder--inline">
              {error}
            </p>
          )}

          {!error && (
            <div
              ref={containerRef}
              className={
                'viewer-svg-container-wide' +
                (panRef.current.isPanning
                  ? ' viewer-svg-container-wide--panning'
                  : '')
              }
              onWheel={handleWheel}
              onMouseDown={startPan}
              onMouseMove={movePan}
              onMouseUp={endPan}
              onMouseLeave={endPan}
              onContextMenu={preventContextMenu}
            >
              {currentSvg ? (
                <div
                  className="viewer-svg-inner-wide"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: '0 0',
                  }}
                  dangerouslySetInnerHTML={{ __html: currentSvg }}
                />
              ) : !loading ? (
                <p className="viewer-placeholder viewer-placeholder--inline">
                  No {selectedSide} SVG returned for this job.
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ViewerPane
