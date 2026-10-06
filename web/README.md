# RingTask landing page

Static marketing page for [RingTask](../README.md), built with React 19, Vite, Tailwind CSS 3, and Framer Motion.
It is a single page with no backend calls; it describes the project and links to the GitHub repository.

## Scripts

```bash
npm ci
npm run dev       # http://localhost:5173/ringtask/
npm run build     # type-check (tsc -b) and build to dist/
npm run lint      # eslint
npm run preview   # serve the production build
```

## Deployment

`vite.config.ts` sets `base: '/ringtask/'` so the build works on GitHub Pages at
`https://mikecavallo.github.io/ringtask/`. Change `base` if you host it elsewhere.

## Structure

- `src/App.tsx`: page layout
- `src/sections/`: Hero, How It Works, What It Does, MCP Tools, Use Cases, Status, Footer
- `src/links.ts`: repository links used by CTAs

Keep the copy in `src/sections/Status.tsx` in sync with the Status section of the root README.
