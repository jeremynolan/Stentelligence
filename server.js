require("dotenv").config({ path: __dirname + "/.env" });
require("dotenv").config();
const express = require('express')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const pcbStackup = require('pcb-stackup')
const { Readable } = require('stream')
const AdmZip = require('adm-zip')
const app = express()
const PORT = 4000
const chatRouter = require('./chat');



app.use(
  cors({
    origin: 'http://localhost:5173',
  })
)

app.use(express.json());
app.use('/api/chat', chatRouter);


const uploadDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

const upload = multer({ dest: uploadDir })

// --- Helper: ensure Gerber has an FS (format) statement ---
// Some files (especially X2-style or odd exports) may omit %FS...%.
// gerber-parser will throw "cannot parse coordinate with format undefined"
// if FS is missing. We inject a safe default format at the top.
function ensureFSFormat(gerberData) {
  if (!gerberData) return gerberData

  // If the file already declares a format, leave it alone
  if (/%FS/i.test(gerberData)) return gerberData

  // Safe default: leading-zero omitted, absolute coords, 2.4 format for X/Y
  const defaultFS = '%FSLAX24Y24*%\n'
  return defaultFS + gerberData
}

// Simple type inference for layers (just enough for UI labeling)
function inferLayerType(name) {
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

// Inject a <style> that targets the solder-paste layer class
// according to pcb.js / pcb-stackup convention:
// id = "stentech-board" => paste layer class = "stentech-board_sp"
function recolorPaste(svg, color) {
  if (!svg || !color) return svg

  const styleTag = `
<style>
  /* Recolor solder paste layer pads only */
  .stentech-board_sp {
    color: ${color} !important;  /* pcb-stackup uses currentColor */
  }
</style>`

  const idx = svg.indexOf('>')
  if (idx === -1) return svg
  return svg.slice(0, idx + 1) + styleTag + svg.slice(idx + 1)
}

// Allowed file extensions for Gerber/Excellon
const allowedExts = new Set([
  '.gtl',
  '.gbl',
  '.gts',
  '.gbs',
  '.gto',
  '.gbo',
  '.gtp',
  '.gbp',
  '.gml',
  '.gko',
  '.gm1',
  '.gbr',
  '.drl',
  '.txt',
  '.xln',
  '.gbr'
])

// Collect Gerber layers from uploaded files (including ZIP contents).
// Also return a layersInfo[] list for the frontend to show.
// layersConfig is an array like [{ name, enabled, layerType }, ...] from the frontend.
function collectGerberLayers(files, layersConfig) {
  const layers = []
  const layersInfo = []

  // record internal layer for UI
  function recordLayerInfo(name) {
    if (!name) return
    if (!layersInfo.some((l) => l.name === name)) {
      layersInfo.push({
        name,
        type: inferLayerType(name),
      })
    }
  }

  // check if a given internal name is enabled in config
  function isEnabled(name) {
    if (!layersConfig || !Array.isArray(layersConfig) || layersConfig.length === 0) {
      return true
    }
    const meta = layersConfig.find((m) => m.name === name)
    if (!meta) return true
    return meta.enabled !== false
  }

  for (const file of files) {
    const ext = path.extname(file.originalname).toLowerCase()

    if (ext === '.zip') {
      // Unzip and pull Gerber-like files from inside
      try {
        const zip = new AdmZip(file.path)
        const entries = zip.getEntries()

        for (const entry of entries) {
          if (entry.isDirectory) continue

          const innerExt = path.extname(entry.entryName).toLowerCase()
          if (!allowedExts.has(innerExt)) continue

          const displayName = path.basename(entry.entryName)
          recordLayerInfo(displayName)
          if (!isEnabled(displayName)) continue

          const raw = entry.getData().toString('utf8')
          const safe = ensureFSFormat(raw)
          const stream = Readable.from([safe])

          layers.push({
            gerber: stream,
            filename: displayName,
          })
        }
      } catch (err) {
        console.error('Failed to unzip:', file.originalname, err)
      }
    } else {
      // Individual Gerber / drill file
      if (!allowedExts.has(ext)) continue

      const displayName = file.originalname
      recordLayerInfo(displayName)
      if (!isEnabled(displayName)) continue

      let raw = ''
      try {
        raw = fs.readFileSync(file.path, 'utf8')
      } catch (err) {
        console.error('Failed to read file:', file.path, err)
        continue
      }

      const safe = ensureFSFormat(raw)
      const stream = Readable.from([safe])

      layers.push({
        gerber: stream,
        filename: displayName,
      })
    }
  }

  return { layers, layersInfo }
}

app.post('/api/render', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' })
  }

  let config = {}
  try {
    if (req.body.config) {
      config = JSON.parse(req.body.config)
    }
  } catch (e) {
    console.warn('Failed to parse config JSON:', e)
  }

  const layersConfig = Array.isArray(config.layers) ? config.layers : []
  const pasteColor = config.pasteColor || null

  // We no longer use layersConfig to enable/disable whole uploaded files.
  // All uploaded files are considered; filtering happens per internal layer.
  const allFiles = req.files

  // Build combined Gerber layer set from all files (including ZIP contents)
  const { layers: gerberLayers, layersInfo } = collectGerberLayers(
    allFiles,
    layersConfig
  )

  if (gerberLayers.length === 0) {
    req.files.forEach((file) => fs.unlink(file.path, () => {}))
    return res.status(400).json({
      error:
        'No recognized Gerber/Excellon files found in the upload. ' +
        'If you used a ZIP, ensure it contains .gtp/.gbr/.gtl/etc. files.',
      layersInfo,
    })
  }

  // IMPORTANT: set a known id so we know the CSS class prefix for layers
  const options = {
    id: 'stentech-board',
    // you can add more pcb-stackup options later (e.g. maskColor, copperColor, etc.)
  }

  pcbStackup(gerberLayers, options, (error, stackup) => {
    // Clean up temp files on disk
    req.files.forEach((file) => fs.unlink(file.path, () => {}))

    if (error) {
      console.error('pcb-stackup error:', error)
      return res
        .status(500)
        .json({ error: 'Render failed', details: String(error), layersInfo })
    }

    let topSvg = stackup.top && stackup.top.svg
    let bottomSvg = stackup.bottom && stackup.bottom.svg

    // Apply paste color via CSS 'color' on the solder-paste layer class
    if (pasteColor) {
      topSvg = recolorPaste(topSvg, pasteColor)
      bottomSvg = recolorPaste(bottomSvg, pasteColor)
    }

    res.json({
      topSvg,
      bottomSvg,
      layersInfo,
    })
  })
})

app.listen(PORT, () => {
  console.log(`Render server listening on http://localhost:${PORT}`)
})
