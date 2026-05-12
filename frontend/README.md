# Cloistr Frontend

React + TypeScript + Vite frontend for Cloistr.

## Quick start

```bash
npm install
npm run dev
```

## Dependencies

### Production

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.5 | UI library |
| react-dom | ^19.2.5 | DOM renderer |
| @mantine/core | ^9.1.1 | Component library |
| @mantine/hooks | ^9.1.1 | Hooks (disclosure, etc.) |
| @mantine/notifications | ^9.1.1 | Toast notifications |
| @tabler/icons-react | ^3.41.1 | Icons |
| @tanstack/react-query | ^5.100.9 | Server state management |
| react-hook-form | ^7.75.0 | Form state |
| @hookform/resolvers | ^5.2.2 | Zod resolver for forms |
| zod | ^4.4.3 | Schema validation |
| react-router-dom | ^7.14.2 | Routing |
| i18next | ^26.0.8 | Internationalization engine |
| i18next-browser-languagedetector | ^8.2.1 | Language auto-detect |
| react-i18next | ^17.0.6 | React bindings for i18next |
| maplibre-gl | ^5.24.0 | Interactive map renderer |
| supercluster | ^8.0.1 | Map marker clustering |

### Dev

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ~6.0.3 | Type checker |
| vite | ^8.0.10 | Build tool & dev server |
| @vitejs/plugin-react | ^6.0.1 | Vite React plugin |
| rollup-plugin-visualizer | — | Bundle size analyzer |
| @biomejs/biome | ^2.4.14 | Linter + formatter |
| vitest | ^4.1.5 | Test runner |
| @vitest/coverage-v8 | ^4.1.5 | Coverage reporter |
| jsdom | ^29.1.1 | DOM environment for tests |
| @testing-library/dom | ^10.4.1 | DOM testing utilities |
| @testing-library/jest-dom | ^6.9.1 | Custom jest matchers |
| @testing-library/react | ^16.3.2 | React testing utilities |
| @testing-library/user-event | ^14.6.1 | User event simulation |
| @types/node | ^25.6.0 | Node.js type definitions |
| @types/react | ^19.2.14 | React type definitions |
| @types/react-dom | ^19.2.3 | React DOM type definitions |
| impeccable | ^2.1.8 | Design review agent |

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start dev server |
| `build` | `tsc -b && vite build` | Type check + production build |
| `preview` | `vite preview` | Preview production build |
| `check` | `biome check src` | Lint |
| `lint:fix` | `biome lint --write src` | Auto-fix lint |
| `format` | `biome format src` | Check formatting |
| `format:fix` | `biome format --write src` | Auto-format |
| `test` | `vitest run` | Run tests |
| `test:watch` | `vitest` | Watch mode |
| `test:coverage` | `vitest run --coverage` | Coverage report |
| `typecheck` | `tsc -b` | TypeScript check |
| `analyze` | `vite build && vite-bundle-visualizer` | Bundle analysis |
| `impeccable:teach` | `impeccable teach` | Design review (teach mode) |
| `impeccable:polish` | `impeccable polish` | Design review (polish mode) |

## Quality

```bash
npm run check        # Biome lint
npm run format:fix   # Auto-format
npm run typecheck    # tsc
npm run test         # Vitest (7 tests)
npm run build        # Production build
npm run analyze      # Bundle visualizer → dist/stats.html
```

## Design review

```bash
npm run impeccable:teach
npm run impeccable:polish
```

## Project structure

```
src/
├── api/           # API client modules (one per domain)
├── components/    # Reusable UI components (map, layout, common)
├── context/       # AuthContext, LanguageContext
├── hooks/         # React Query hooks + useDelayedRedirect
├── i18n/          # Translations (EN, IT)
├── lib/           # Config, query client
├── pages/         # Route pages (10 total)
├── schemas/       # Zod validation schemas
├── types/         # TypeScript type definitions
└── utils/         # Normalizers, CSRF, validation helpers
```

Shared normalizers (`src/utils/normalizers.ts`) provide `readString`, `readNumber`, `readBoolean`, `readIdentifier` — used across all API modules to eliminate duplication.
