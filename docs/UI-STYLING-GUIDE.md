# UI Styling Guide for Claude Code Agents

This guide captures the visual styling of the Court Transcriber demo for replication in other case.dev starter apps.

## Design Philosophy

- **Conservative & Professional**: Legal tech aesthetic, trustworthy
- **Paper-like Elevation**: No heavy shadows, borders for definition
- **Warm Color Palette**: Sepia/cream backgrounds with orange accents
- **Sharp Edges**: No rounded corners (`rounded-none` throughout)
- **Thin Elegant Typography**: Instrument Serif with `font-normal` for headings

---

## Header Styling

### Thin Header Bar
```tsx
<header className="border-b bg-card">
  <div className="flex h-16 items-center justify-between px-6 md:px-8">
    {/* Left: Logo + Title */}
    <div className="flex items-center gap-2">
      <Icon className="h-6 w-6 text-primary" weight="duotone" />
      <span
        className="text-xl font-normal"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        App Title
      </span>
    </div>

    {/* Right: Actions */}
    <div className="flex items-center gap-2">
      <Button variant="outline">Secondary</Button>
      <Button>Primary</Button>
    </div>
  </div>
</header>
```

**Key points:**
- Height: `h-16` (64px)
- No container max-width - content goes edge-to-edge with `px-6 md:px-8`
- Background: `bg-card` (white/near-white)
- Border: `border-b` only (bottom border)
- Title font: Instrument Serif serif with `font-normal` for thin elegant look

---

## Color Palette (globals.css)

### Light Mode
```css
:root {
  /* Warm backgrounds */
  --background: oklch(0.97 0.008 75);        /* Warm off-white */
  --card: oklch(0.995 0.002 75);             /* Clean white with warm tint */
  --muted: oklch(0.94 0.012 70);             /* Warm muted */

  /* Text colors */
  --foreground: oklch(0.22 0.02 50);         /* Warm dark brown */
  --muted-foreground: oklch(0.48 0.02 55);   /* Warm gray */

  /* Orange accent (case.dev brand) */
  --primary: oklch(0.63 0.19 45);            /* #EB5600 orange */
  --primary-foreground: oklch(0.995 0.002 75);

  /* Borders */
  --border: oklch(0.89 0.015 70);            /* Warm border */

  /* No border radius */
  --radius: 0;
}
```

### Dark Mode
```css
.dark {
  --background: oklch(0.18 0.015 50);        /* Warm dark */
  --card: oklch(0.22 0.018 50);
  --foreground: oklch(0.94 0.008 75);        /* Warm off-white */
  --primary: oklch(0.72 0.18 45);            /* Lighter orange */
  --border: oklch(1 0.01 70 / 12%);
}
```

---

## Border Radius (Sharp Edges)

| Element | Radius | Class |
|---------|--------|-------|
| All elements | 0px | `rounded-none` |

**Never use**: `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-4xl`, `rounded-full`

All UI components have been updated to use `rounded-none` for a sharp, professional, editorial aesthetic.

---

## Button Styling

```tsx
// Primary - Orange background, sharp edges
<Button>Primary Action</Button>

// Outline - Border only, sharp edges
<Button variant="outline">Secondary</Button>

// Ghost - No border, subtle hover
<Button variant="ghost">Tertiary</Button>
```

**Button interactions:**
```css
transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]
```

---

## Card/Section Pattern

```tsx
{/* Feature card with border, no shadow, sharp edges */}
<div className="border bg-card p-6 space-y-3">
  <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
    <Icon className="h-6 w-6 text-primary" weight="duotone" />
  </div>
  <h3 className="text-lg font-medium">Card Title</h3>
  <p className="text-sm text-muted-foreground">
    Description text goes here.
  </p>
</div>
```

**Key points:**
- Use `border` not `shadow`
- No rounded corners
- Icon containers: `bg-primary/10` with `text-primary` icon
- Spacing: `space-y-3` or `gap-3`

---

## Typography

### Font Stack
```tsx
// layout.tsx - Inter for body text
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

// Instrument Serif for headings (loaded via Google Fonts link)
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" />
```

### Heading Styles
```tsx
// Page title - Instrument Serif, thin elegant
<h1
  className="text-4xl md:text-5xl font-normal tracking-tight"
  style={{ fontFamily: "'Instrument Serif', serif" }}
>
  Page Title
</h1>

// Section heading - Instrument Serif, thin elegant
<h2
  className="text-3xl font-normal"
  style={{ fontFamily: "'Instrument Serif', serif" }}
>
  Section Title
</h2>

// Card title - Inter, medium weight
<h3 className="text-lg font-medium">Card Title</h3>

// Body text
<p className="text-muted-foreground">Description</p>
```

**Key insight:** Use `font-normal` (not `font-semibold` or `font-bold`) for large headings to achieve the thin elegant look characteristic of case.dev.

---

## Landing Page Structure

```tsx
<div className="flex flex-col min-h-screen">
  {/* Thin Header */}
  <header className="border-b bg-card">...</header>

  {/* Hero Section - Centered */}
  <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 md:py-24">
    <div className="max-w-3xl text-center space-y-6">
      <h1 style={{ fontFamily: "'Instrument Serif', serif" }}>...</h1>
      <p className="text-xl text-muted-foreground">...</p>
      <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
        <Button size="lg">Primary CTA</Button>
        <Button size="lg" variant="outline">Secondary CTA</Button>
      </div>
    </div>
  </section>

  {/* Features Section - Card background */}
  <section className="border-t bg-card py-16 md:py-24">
    <div className="container mx-auto px-4 md:px-6">
      <h2 className="text-3xl font-normal text-center mb-12" style={{ fontFamily: "'Instrument Serif', serif" }}>...</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Feature cards - sharp edges */}
      </div>
    </div>
  </section>

  {/* CTA Section */}
  <section className="border-t py-16 md:py-24">
    <div className="container mx-auto px-4 md:px-6 text-center">
      <h2 style={{ fontFamily: "'Instrument Serif', serif" }}>...</h2>
      <p>...</p>
      <Button size="lg">Final CTA</Button>
    </div>
  </section>
</div>
```

---

## Icon Usage

**Library**: Phosphor Icons (`@phosphor-icons/react`)

```tsx
import { IconName } from '@phosphor-icons/react';

// Default weight for UI
<Icon className="h-5 w-5" />

// Duotone for decorative/branded icons
<Icon className="h-6 w-6 text-primary" weight="duotone" />

// Size scale
// Dense: h-4 w-4
// Default: h-5 w-5
// Prominent: h-6 w-6
// Large decorative: h-8 w-8
```

---

## Form Inputs

```tsx
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
    // Sharp edges applied via component defaults
  />
  <p className="text-xs text-muted-foreground">Help text</p>
</div>
```

**Input interactions:**
```css
transition-all duration-150 focus:scale-[1.01]
```

---

## Footer

```tsx
<footer className="w-full border-t py-6 mt-auto">
  <div className="container mx-auto flex items-center justify-center gap-2 text-sm text-muted-foreground">
    <span>Powered by</span>
    <a href="https://case.dev" className="inline-flex items-center gap-1.5 font-medium text-foreground hover:underline">
      {/* case.dev logo SVG */}
      case.dev
    </a>
  </div>
</footer>
```

---

## Animation & Motion

| Type | Duration | Use |
|------|----------|-----|
| Fast | 150ms | Hover, button press |
| Base | 200ms | Standard transitions |
| Slow | 300ms | Modals, page transitions |

```css
/* Buttons */
transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]

/* Inputs */
transition-all duration-150 focus:scale-[1.01]

/* Cards on hover */
hover:border-foreground/20 transition-colors
```

---

## Quick Reference Checklist

When styling a new case.dev demo app:

- [ ] Use `rounded-none` for ALL elements (sharp edges)
- [ ] Use `border` instead of `shadow` for elevation
- [ ] Header: `h-16`, `border-b`, `bg-card`, edge-to-edge content
- [ ] Primary color: case.dev orange `oklch(0.63 0.19 45)`
- [ ] Warm background: `oklch(0.97 0.008 75)`
- [ ] Title font: Instrument Serif with `font-normal` (thin elegant)
- [ ] Body font: Inter
- [ ] Icons: Phosphor, `weight="duotone"` for branded icons
- [ ] Spacing: `gap-2` tight, `gap-4` standard, `gap-6` sections
