# StenTech AI Gerber Viewer (UI Shell)


## Getting started

```bash
npm install
npm run dev
```

Then open the printed URL in your browser (typically http://localhost:5173).

## Architecture

- **Vite + React 18** front-end
- No backend required yet — everything runs locally in the browser

## Where to plug in the real rendering

In `src/components/ViewerPane.jsx`:

- Today: it reads small files with `FileReader` and shows the first 4k of text.
- Later: replace the `useEffect` block with a call to your backend, e.g.

```js
// pseudo
useEffect(() => {
  if (!selected) return

  async function fetchRender() {
    const form = new FormData()
    form.append('file', selected.file)
    const res = await fetch('/api/render', { method: 'POST', body: form })
    const { svg } = await res.json()
    setSvgMarkup(svg)
  }

  fetchRender()
}, [selected])
```
