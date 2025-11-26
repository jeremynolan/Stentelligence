import React, { useState } from 'react'
import Header from './components/Header'
import UploadPanel from './components/UploadPanel'
import LayerList from './components/LayerList'
import AIPanel from './components/AIPanel'
import ViewerPane from './components/ViewerPane'
import StentelligenceChat from "./components/StentelligenceChat";

// Same simple inference used on the frontend for display
const inferLayerType = (name) => {
  const n = (name || '').toLowerCase()

  if (n.includes('paste') || n.endsWith('.gtp') || n.endsWith('.gbp')) {
    return 'paste'
  }

  if (n.includes('top') && (n.endsWith('.gtl') || n.endsWith('.gto'))) {
    return 'top'
  }

  if (n.includes('bot') && (n.endsWith('.gbl') || n.endsWith('.gbo'))) {
    return 'bottom'
  }

  return 'other'
}

const App = () => {
  const [jobFiles, setJobFiles] = useState([]) // uploaded File objects (zip or individual gerbers)
  const [layers, setLayers] = useState([]) // internal/unzipped layers
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [pasteColor, setPasteColor] = useState('#ffcc33')
  const [selectedSide, setSelectedSide] = useState('top') // 'top' | 'bottom'

  const handleFilesSelected = (newFiles) => {
    const timestamp = Date.now()

    // wrap the File objects with ids for React, but only for upload handling
    const withIds = newFiles.map((file, idx) => ({
      id: `${timestamp}-${idx}`,
      file,
      name: file.name,
      size: file.size,
      type: file.type || 'gerber',
    }))

    setJobFiles(withIds)
    setLayers([]) // reset internal layers when a new job is uploaded
    setSelectedLayerId(null)
  }

  const handleLayerToggleEnabled = (id) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, enabled: !l.enabled } : l
      )
    )
  }

  // "Delete" = mark disabled + hidden, so:
  // - Backend will skip it (enabled: false still sent in config.layers)
  // - UI hides it (hidden: true)
  const handleLayerRemove = (id) => {
    setLayers((prev) => {
      const next = prev.map((l) =>
        l.id === id ? { ...l, enabled: false, hidden: true } : l
      )

      const visible = next.filter((l) => !l.hidden)
      if (!visible.some((l) => l.id === selectedLayerId)) {
        setSelectedLayerId(visible[0]?.id || null)
      }

      return next
    })
  }

  // Called whenever backend sends back layersInfo from /api/render
  const handleLayersDiscovered = (layersInfo) => {
    if (!Array.isArray(layersInfo) || layersInfo.length === 0) return

    setLayers((prev) => {
      if (prev.length === 0) {
        // first time: create them all, enabled & visible
        const created = layersInfo.map((info, idx) => ({
          id: `${info.name}-${idx}`,
          name: info.name,
          type: info.type || inferLayerType(info.name),
          enabled: true,
          hidden: false,
        }))
        // auto-select first visible layer
        if (created.length > 0) {
          setSelectedLayerId(created[0].id)
        }
        return created
      }

      // merge with existing (keep enabled + hidden state if same name)
      const merged = layersInfo.map((info, idx) => {
        const existing = prev.find((l) => l.name === info.name)
        if (existing) {
          // preserve enabled/hidden/type from existing
          return {
            ...existing,
            type: existing.type || info.type || inferLayerType(info.name),
          }
        }
        // new layer that didn't exist before
        return {
          id: `${info.name}-${idx}`,
          name: info.name,
          type: info.type || inferLayerType(info.name),
          enabled: true,
          hidden: false,
        }
      })

      const visible = merged.filter((l) => !l.hidden)
      if (
        visible.length > 0 &&
        !visible.some((l) => l.id === selectedLayerId)
      ) {
        setSelectedLayerId(visible[0].id)
      } else if (visible.length === 0) {
        setSelectedLayerId(null)
      }

      return merged
    })
  }

  const visibleLayers = layers.filter((l) => !l.hidden)
  const selectedLayer =
    visibleLayers.find((l) => l.id === selectedLayerId) || null

  return (
    <div className="app-root">
      <Header />
      <main className="app-main">
        {/* LEFT SIDEBAR */}
        <section className="sidebar">
          <UploadPanel onFilesSelected={handleFilesSelected} />
          <LayerList
            files={visibleLayers}
            selectedId={selectedLayerId}
            onSelect={setSelectedLayerId}
            onRemove={handleLayerRemove}
            onToggleEnabled={handleLayerToggleEnabled}
          />
          <AIPanel
            pasteColor={pasteColor}
            onPasteColorChange={setPasteColor}
          />
        </section>

        {/* FULL-PAGE VIEWER */}
        <section className="viewer-section">
          <ViewerPane
            jobFiles={jobFiles}
            pasteColor={pasteColor}
            selectedSide={selectedSide}
            onSideChange={setSelectedSide}
            layers={layers} // pass full list (including hidden) so backend can exclude them
            onLayersDiscovered={handleLayersDiscovered}
            selectedLayer={selectedLayer}
          />
        </section>

      </main>
     
      <StentelligenceChat />

    </div>
  )
}

export default App
