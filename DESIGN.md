# Night Garage — sistema de diseño de VetCar

Estética de tablero de instrumentos en un taller de noche: negro OLED profundo,
vidrio con hairlines, un único acento ámbar (luz de tablero) y verde de "todo OK".
La app es **siempre oscura** — los tokens viven en `:root` (`app/globals.css`),
no hay toggle de tema.

## Color

| Token | Valor | Uso |
| --- | --- | --- |
| `--background` | `#060607` | Fondo base (asfalto) |
| `--foreground` | `#f4f2ec` | Texto principal (blanco cálido) |
| `--card` | `#0d0d10` | Superficies (núcleo del bezel) |
| `--popover` | `#131317` | Menús flotantes / dialogs |
| `--primary` | `#f2b350` | **Ámbar señal** — CTAs, foco, seleccionado, estados "atención" |
| `--ok` | `#3ecf8e` | Verde de tablero — "al día", disponible, guardado |
| `--destructive` | `#e5484d` | Errores |
| `--muted-foreground` | `#a39e94` | Texto secundario (gris cálido) |
| `--accent` | `rgba(242,179,80,0.12)` | Hover/focus tint en listas |
| bordes | `rgba(255,255,255,0.06–0.14)` | Solo hairlines blancos translúcidos — nunca gris sólido |

Reglas:

- Un solo acento (ámbar) por pantalla como jerarquía.
- El verde `ok` es exclusivo de estados positivos.
- Nada de sombras negras duras — profundidad con
  `0 24px 60px -24px rgba(0,0,0,.7)` + glow ámbar solo en elementos primarios.

Atmósfera global (en `globals.css`, pseudo-elementos `fixed` del `body`):
malla radial ámbar/acero (`::before`, z -10) + grano de película
(`::after`, opacity .03, z 80). No agregar más decoración de fondo por página.

## Tipografía

| Familia | Token | Uso |
| --- | --- | --- |
| **Clash Display** (500/600, vendorizada en `app/fonts/`) | `font-display` | Titulares, nombres, números de fecha |
| **Geist Sans** | `font-sans` | UI y cuerpo |
| **Geist Mono** | `font-mono` | Datos duros: patentes, VIN, km, horarios, contadores, eyebrows |

Patrones:
- **Titular**: `font-display font-medium tracking-[-0.03em]`, tamaños 4xl–6xl, leading ~1.05.
- **Eyebrow / etiqueta de instrumento**: utilidad `eyebrow` (mono 10px, tracking 0.2em,
  uppercase, pill con hairline) — precede a los H1/H2 de sección.
- **Section label**: mono `text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/70`.
- Prohibidas: Inter, Roboto, Arial, Open Sans, Helvetica.

## Superficies — Double-Bezel (utilidades `bezel` / `bezel-core`)

Toda tarjeta importante es hardware anidado: bandeja exterior + placa interior
con radios concéntricos.

```tsx
<div className="bezel">            {/* r=1.75rem, p-1.5, bg-white/3, hairline */}
  <div className="bezel-core p-6"> {/* r=1.375rem, bg card + luz superior inset */}
    …
  </div>
</div>
```

Inputs/selects: `rounded-[0.875rem] bg-white/[0.03] border-white/[0.09]`,
foco = borde + ring ámbar. Botones: **pills** (`rounded-full`), primario ámbar
con glow, `secondary` vidrio, `outline` hairline. CTA con flecha usa
`ButtonIconIsland` (ícono en su propio círculo, flush al padding derecho).

## Iconografía

Set propio en `components/ui/icons.tsx`: grilla 24px, trazo 1.5, `currentColor`,
tamaño por `className` (default `size-4`). No usar lucide/FontAwesome directos.

## Motion (tokens en `lib/motionTokens.ts`, curvas en `--ease-*`)

- Curva de masa: `cubic-bezier(0.32,0.72,0,1)` (`ease-fluid` / `easing.fluid`) para
  entradas y layout; `smooth` para micro; nunca `linear`/`ease-in-out` en UI.
- Entradas: fade-up con blur (`y:16, blur 4–8px → 0`) ~0.6s, stagger ≤ 0.1s.
- Hover en cards: lift `y:-3/-4`; press: `scale .98`.
- Modales/menús: `AnimatePresence mode="wait"`; overlay `bg-black/65 backdrop-blur-md`.
- Todo envuelto en `MotionConfig reducedMotion="user"`; solo `transform`/`opacity`/`filter`.
- `backdrop-blur` únicamente en elementos fijos/flotantes (nav, overlays, popovers).

## Componentes clave

- **Nav**: isla flotante (pill de vidrio despegada del borde, `bg-black/60
  backdrop-blur-2xl`), item activo con LED ámbar; en mobile hamburguesa que muta a X
  y overlay de pantalla completa con reveal escalonado (`DashboardNav`).
- **Layout de páginas de app**: `pt-32 sm:pt-36`, contenedor `max-w-[1200px]`,
  hero (eyebrow + titular display + sub) y bento asimétrico `lg:grid-cols-12`
  (celda ancha 7–8 + riel 4–5). Colapsa a una columna debajo de `lg`.
- **Auth**: `AuthShell` — split editorial (tipografía enorme izquierda, tarea derecha).
- **Estados**: badges mono uppercase (`active` ámbar / `ok` verde / `idle` neutro)
  con `BadgeDot`; empty states dentro de bezel con ícono en círculo + CTA;
  loading con skeletons pulsantes; errores `role="alert"` en pill destructivo.

## Radios

`--radius: 1rem`. Escala: inputs 0.875rem · items de lista 0.625rem ·
cards (core) 1.375rem · shell 1.75rem · pills/botones full.
