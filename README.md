# SELJI Workflow Engine – ASIN & AAID Extractor

This is a minimal, production-grade React + TypeScript + MUI application that implements
the first module of the **SELJI workflow engine**: an ASIN & AAID extractor tailored to the
HTML produced by your SELJI product editor.

## Tech stack

- Node.js (latest LTS recommended)
- React 18
- TypeScript
- Vite
- Material UI (`@mui/material`, `@mui/icons-material`)
- Emotion (`@emotion/react`, `@emotion/styled`)

## Features

- Paste raw HTML from your editor (including the `button.input.tocopy` nodes).
- Extract `ASIN` and `ID` pairs based on:
  - `data-prefix="ASIN"` and `data-prefix="ID"` buttons
  - Primary strategy: per product tile container (`.product_tile_editorbar`, `.product_tile`, etc.)
  - Fallback strategy: global index-based pairing of ASIN and ID buttons
- Outputs:
  - `aaid.txt` format: `ASIN=AAID` (one per line)
  - `asin.txt` format: comma-separated ASIN list
- Copy-to-clipboard and download buttons for both outputs
- MUI-based tab layout to host multiple workflow modules over time

## Getting started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Then open the printed local URL in your browser (default is `http://localhost:5173`).

## Project structure

- `src/main.tsx` – App bootstrap and MUI theme wiring.
- `src/App.tsx` – Global layout, app bar, and workflow tabs.
- `src/components/AsinAaidExtractor.tsx` – Core extraction module.

## Extending the workflow engine

To add more workflow steps/tabs:

1. Create a new component under `src/components`, e.g. `MyNewModule.tsx`.
2. Import it into `App.tsx`.
3. Add a new `<Tab />` and corresponding `<TabPanel>` entry.

The ASIN & AAID extractor is intentionally self-contained and can be lifted as a reusable
module in a larger SELJI orchestration context (desktop app, Electron shell, etc.).