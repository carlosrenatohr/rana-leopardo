# Rana Leopardo — Identidad visual y PWA

Favicon, iconos y configuración PWA basados en `frog.svg` (Nati, la rana leopardo).

## Archivos

- `assets/icons/favicon.svg` — favicon vectorial principal.
- `assets/icons/favicon.ico` — compatibilidad clásica (IE / legacy).
- `assets/icons/favicon-32.png`, `favicon-16.png` — navegador.
- `assets/icons/apple-touch-icon.png` — iOS/iPadOS (pantalla de inicio).
- `assets/icons/icon-192.png` — Android/PWA.
- `assets/icons/icon-512.png` — Android/PWA (any + maskable).
- `site.webmanifest` — manifest PWA (instalación, theme color, shortcuts).
- `sw.js` — service worker: precache de la app shell + offline.
- `js/pwa.js` — registro del service worker (solo https).
- `head-snippet.html` — referencia original del kit (ya integrado en `index.html`).

## Integración (ya aplicada en el proyecto)

El `index.html` incluye:

- favicons (SVG + ICO + PNG) y `apple-touch-icon`;
- metadatos iOS (`apple-mobile-web-app-capable`, `status-bar-style`);
- `<link rel="manifest">`, `theme-color` y `background-color` consistentes (`#DDF6EA`);
- metadatos Open Graph + Twitter para compartir el juego;
- pantalla de carga (`#splash`) que desaparece al arrancar el motor;
- `<script src="js/pwa.js">` que registra `sw.js` bajo https.

## PWA

- **Navegador/desktop**: `site.webmanifest` habilita el icono y la instalación.
- **Android**: iconos `any` + `maskable`; instalación desde Chrome.
- **iOS**: `apple-touch-icon` + metadatos; "Añadir a pantalla de inicio".
- **Offline**: `sw.js` precachea HTML, CSS, JS, iconos, manifest y niveles.
- **Shortcut**: `/?start=levelN` (botón "Jugar" del manifest) lanza el nivel directo.

> El service worker requiere HTTPS (lo da Cloudflare Pages en producción).
> En `file://` el juego funciona igual; solo se omiten PWA/offline.
