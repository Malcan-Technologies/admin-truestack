# Truestack Admin Portal Branding Guide

**Domain:** admin.truestack.com.my  
**Product:** Internal Administration Portal  
**Version:** 1.0

---

## Brand Overview

Truestack Admin Portal is the internal administration interface for managing Truestack's services, clients, and platform operations. The visual identity emphasizes a professional, dark-themed aesthetic with a blueish indigo color scheme that conveys authority, trust, and technical sophistication for internal teams.

---

## Color Palette

### Primary Colors

| Color | Name | OKLCH | HEX | Usage |
|-------|------|-------|-----|-------|
| ![#6366f1](https://via.placeholder.com/20/6366f1/6366f1) | Indigo 500 | `oklch(0.585 0.233 277.117)` | `#6366f1` | Primary brand, buttons, active states |
| ![#4f46e5](https://via.placeholder.com/20/4f46e5/4f46e5) | Indigo 600 | `oklch(0.511 0.262 276.966)` | `#4f46e5` | Primary hover states |
| ![#818cf8](https://via.placeholder.com/20/818cf8/818cf8) | Indigo 400 | `oklch(0.673 0.182 276.935)` | `#818cf8` | Text accents, links |

### Secondary Colors

| Color | Name | OKLCH | HEX | Usage |
|-------|------|-------|-----|-------|
| ![#8b5cf6](https://via.placeholder.com/20/8b5cf6/8b5cf6) | Violet 500 | `oklch(0.606 0.25 292.717)` | `#8b5cf6` | Accent color, gradients |
| ![#a78bfa](https://via.placeholder.com/20/a78bfa/a78bfa) | Violet 400 | `oklch(0.702 0.183 293.541)` | `#a78bfa` | Gradient text endpoints |
| ![#c084fc](https://via.placeholder.com/20/c084fc/c084fc) | Purple 400 | `oklch(0.714 0.203 305.504)` | `#c084fc` | Gradient text highlights |

### Gradient Definitions

```css
/* Primary Gradient - Buttons, CTAs */
background: linear-gradient(to right, #6366f1, #8b5cf6);

/* Hover Gradient */
background: linear-gradient(to right, #4f46e5, #7c3aed);

/* Heading Gradient - Major headings (H1, H2) */
background: linear-gradient(to right, #818cf8, #a78bfa, #c084fc);
-webkit-background-clip: text;
background-clip: text;
color: transparent;

/* Subtle Heading Gradient - Section headers */
background: linear-gradient(to right, #6366f1, #818cf8);
-webkit-background-clip: text;
background-clip: text;
color: transparent;
```

### Background Colors (Dark Theme)

| Color | Name | OKLCH | HEX | Usage |
|-------|------|-------|-----|-------|
| ![#020617](https://via.placeholder.com/20/020617/020617) | Slate 950 | `oklch(0.129 0.042 264.695)` | `#020617` | Main background |
| ![#0f172a](https://via.placeholder.com/20/0f172a/0f172a) | Slate 900 | `oklch(0.178 0.037 264.376)` | `#0f172a` | Cards, elevated surfaces |
| ![#1e293b](https://via.placeholder.com/20/1e293b/1e293b) | Slate 800 | `oklch(0.227 0.034 264.665)` | `#1e293b` | Borders, secondary backgrounds |
| ![#334155](https://via.placeholder.com/20/334155/334155) | Slate 700 | `oklch(0.297 0.029 264.531)` | `#334155` | Dividers, disabled states |

### Text Colors

| Color | Name | OKLCH | HEX | Usage |
|-------|------|-------|-----|-------|
| ![#f8fafc](https://via.placeholder.com/20/f8fafc/f8fafc) | Slate 50 | `oklch(0.985 0.002 247.839)` | `#f8fafc` | Headings, primary text |
| ![#e2e8f0](https://via.placeholder.com/20/e2e8f0/e2e8f0) | Slate 200 | `oklch(0.929 0.013 264.531)` | `#e2e8f0` | Important labels |
| ![#94a3b8](https://via.placeholder.com/20/94a3b8/94a3b8) | Slate 400 | `oklch(0.704 0.022 261.325)` | `#94a3b8` | Body text, descriptions |
| ![#64748b](https://via.placeholder.com/20/64748b/64748b) | Slate 500 | `oklch(0.554 0.027 257.417)` | `#64748b` | Secondary text, captions |

### Status Colors

| Color | Name | HEX | Usage |
|-------|------|-----|-------|
| ![#22c55e](https://via.placeholder.com/20/22c55e/22c55e) | Green 500 | `#22c55e` | Success states, active |
| ![#eab308](https://via.placeholder.com/20/eab308/eab308) | Yellow 500 | `#eab308` | Warning states, pending |
| ![#ef4444](https://via.placeholder.com/20/ef4444/ef4444) | Red 500 | `#ef4444` | Error states, destructive |
| ![#3b82f6](https://via.placeholder.com/20/3b82f6/3b82f6) | Blue 500 | `#3b82f6` | Info states, links |

### Accent States

| Color | Name | Usage |
|-------|------|-------|
| `indigo-400` | `#818cf8` | Text accents, links |
| `violet-400` | `#a78bfa` | Gradient text |
| `indigo-500/10` | `rgba(99, 102, 241, 0.1)` | Icon backgrounds |
| `indigo-500/20` | `rgba(99, 102, 241, 0.2)` | Hover states, table row highlights |
| `indigo-500/30` | `rgba(99, 102, 241, 0.3)` | Border accents |
| `indigo-500/50` | `rgba(99, 102, 241, 0.5)` | Focus rings |

---

## Typography

### Font Families

| Font | Variable | Usage |
|------|----------|-------|
| **Rethink Sans** | `--font-rethink-sans` / `font-display` | Headings, display text, page titles |
| **Inter** | `--font-inter` / `font-sans` | Body text, UI elements, buttons, forms |
| **Geist Mono** | `--font-geist-mono` / `font-mono` | Code, IDs, API keys, technical data |

### Gradient Heading Styles

Major headings use gradient text for visual impact:

```css
/* Page Title (H1) - Gradient */
.page-title {
  font-family: var(--font-rethink-sans);
  font-size: clamp(2rem, 4vw, 2.5rem); /* text-3xl md:text-4xl */
  font-weight: 600;
  letter-spacing: -0.025em;
  background: linear-gradient(to right, #818cf8, #a78bfa, #c084fc);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Section Header (H2) - Gradient */
.section-header {
  font-family: var(--font-rethink-sans);
  font-size: clamp(1.5rem, 3vw, 1.875rem); /* text-2xl md:text-3xl */
  font-weight: 600;
  letter-spacing: -0.025em;
  background: linear-gradient(to right, #6366f1, #818cf8);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

### Tailwind Implementation

```tsx
{/* Page Title - Major Heading */}
<h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
  <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
    Dashboard Overview
  </span>
</h1>

{/* Section Header */}
<h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
  <span className="bg-gradient-to-r from-indigo-500 to-indigo-400 bg-clip-text text-transparent">
    Client Management
  </span>
</h2>

{/* Card Title (H3) - No gradient, solid white */}
<h3 className="text-lg font-semibold text-white">
  Recent Activity
</h3>

{/* Subsection (H4) - No gradient, solid white */}
<h4 className="text-base font-medium text-white">
  User Details
</h4>
```

### Heading Scale

| Level | Size | Weight | Style |
|-------|------|--------|-------|
| H1 (Page Title) | `text-3xl md:text-4xl` | 600 | **Gradient** (indigo → violet → purple) |
| H2 (Section) | `text-2xl md:text-3xl` | 600 | **Gradient** (indigo → indigo-light) |
| H3 (Card Title) | `text-lg` | 600 | Solid white |
| H4 (Subsection) | `text-base` | 500 | Solid white |
| H5 (Label) | `text-sm` | 600 | Solid slate-200 |

### Body Scale

```css
/* Lead text / Descriptions */
.body-lg {
  font-size: 1rem; /* text-base */
  color: #94a3b8; /* slate-400 */
  line-height: 1.625;
}

/* Default body */
.body {
  font-size: 0.875rem; /* text-sm */
  color: #94a3b8;
  line-height: 1.5;
}

/* Helper text / Captions */
.body-sm {
  font-size: 0.75rem; /* text-xs */
  color: #64748b; /* slate-500 */
  line-height: 1.5;
}
```

---

## Spacing & Layout

### Container

```css
/* Admin uses full-width layout with sidebar */
.main-content {
  padding: 1.5rem; /* p-6 */
  margin-left: 16rem; /* Sidebar width: 256px */
}

@media (max-width: 1024px) {
  .main-content {
    margin-left: 0;
    padding: 1rem;
  }
}
```

### Section Spacing

```css
.section {
  margin-bottom: 2rem; /* mb-8 */
}

.card-spacing {
  padding: 1.5rem; /* p-6 */
}

.form-field-spacing {
  margin-bottom: 1rem; /* mb-4 */
}
```

### Grid Layouts

```css
/* Dashboard stats grid */
.stats-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(1, 1fr);
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | `0.125rem` | Small badges |
| `rounded-md` | `0.375rem` | Buttons, inputs, table cells |
| `rounded-lg` | `0.5rem` | Cards, dialogs, dropdowns |
| `rounded-xl` | `0.75rem` | Main panels, sidebar |
| `rounded-full` | `9999px` | Avatars, status indicators |

---

## Components

### Page Header

```tsx
<div className="mb-8">
  <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
    <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
      Dashboard
    </span>
  </h1>
  <p className="mt-2 text-slate-400">
    Overview of your platform metrics and recent activity.
  </p>
</div>
```

### Section Header

```tsx
<div className="mb-6">
  <h2 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
    <span className="bg-gradient-to-r from-indigo-500 to-indigo-400 bg-clip-text text-transparent">
      Client Management
    </span>
  </h2>
</div>
```

### Buttons

#### Primary Button
```tsx
<button className="rounded-md bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-medium text-white transition-all hover:from-indigo-600 hover:to-violet-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
  Save Changes
</button>
```

#### Secondary Button
```tsx
<button className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700">
  Cancel
</button>
```

#### Ghost Button
```tsx
<button className="rounded-md px-4 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
  View Details
</button>
```

#### Destructive Button
```tsx
<button className="rounded-md bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20">
  Delete
</button>
```

### Cards

#### Standard Card
```tsx
<div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
  <h3 className="text-lg font-semibold text-white">Card Title</h3>
  <p className="mt-2 text-sm text-slate-400">Card description goes here.</p>
</div>
```

#### Stat Card
```tsx
<div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
  <div className="flex items-center justify-between">
    <span className="text-sm text-slate-400">Total Clients</span>
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
      <Users className="h-4 w-4 text-indigo-400" />
    </div>
  </div>
  <div className="mt-2">
    <span className="text-2xl font-semibold text-white">1,234</span>
    <span className="ml-2 text-sm text-green-400">+12.5%</span>
  </div>
</div>
```

#### Hover Card
```tsx
<div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-indigo-500/50 hover:bg-slate-900">
  {/* Card content */}
</div>
```

### Sidebar

```tsx
<aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-800 bg-slate-950">
  {/* Logo */}
  <div className="flex h-16 items-center border-b border-slate-800 px-6">
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
        <span className="text-sm font-bold text-white">T</span>
      </div>
      <span className="font-display text-lg font-semibold text-white">
        Admin
      </span>
    </div>
  </div>
  
  {/* Navigation */}
  <nav className="space-y-1 p-4">
    {/* Active item */}
    <a className="flex items-center gap-3 rounded-lg bg-indigo-500/10 px-3 py-2 text-indigo-400">
      <Home className="h-5 w-5" />
      <span className="text-sm font-medium">Dashboard</span>
    </a>
    
    {/* Inactive item */}
    <a className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
      <Users className="h-5 w-5" />
      <span className="text-sm font-medium">Clients</span>
    </a>
  </nav>
</aside>
```

### Tables

```tsx
<div className="overflow-hidden rounded-lg border border-slate-800">
  <table className="w-full">
    <thead className="bg-slate-900">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
          Name
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
          Status
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
      <tr className="transition-colors hover:bg-indigo-500/5">
        <td className="px-4 py-3 text-sm text-white">John Doe</td>
        <td className="px-4 py-3">
          <span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
            Active
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Form Inputs

```tsx
{/* Text Input */}
<div>
  <label className="mb-1.5 block text-sm font-medium text-slate-200">
    Email Address
  </label>
  <input
    type="email"
    className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    placeholder="admin@truestack.com.my"
  />
</div>

{/* Select */}
<select className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
  <option>Select option</option>
</select>
```

### Badges / Status Pills

```tsx
{/* Success */}
<span className="inline-flex rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
  Active
</span>

{/* Warning */}
<span className="inline-flex rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-400">
  Pending
</span>

{/* Error */}
<span className="inline-flex rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
  Failed
</span>

{/* Neutral */}
<span className="inline-flex rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-400">
  Draft
</span>

{/* Indigo (Brand) */}
<span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400">
  New
</span>
```

### Icon Container

```tsx
<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
  <Icon className="h-5 w-5 text-indigo-400" />
</div>
```

---

## Visual Effects

### Grid Pattern Background (Optional for landing sections)

```tsx
<svg className="absolute inset-0 h-full w-full opacity-[0.02]">
  <defs>
    <pattern id="admin-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#admin-grid)" />
</svg>
```

### Gradient Orb (For dashboard headers)

```tsx
<div className="absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/2 translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500/10 to-violet-500/10 blur-3xl" />
```

### Center Glow

```css
.center-glow {
  background: radial-gradient(ellipse at center top, rgba(99, 102, 241, 0.2) 0%, transparent 60%);
  opacity: 0.1;
}
```

---

## Animation Guidelines

### Framer Motion Defaults

```tsx
// Fade in
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ duration: 0.3 }}

// Fade in from bottom (for cards/sections)
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.3 }}

// Staggered children
transition={{ duration: 0.3, delay: index * 0.05 }}
```

### Hover Transitions

```css
.interactive {
  transition: all 150ms ease;
}

.card:hover {
  border-color: rgba(99, 102, 241, 0.5);
  background-color: #0f172a;
}

.table-row:hover {
  background-color: rgba(99, 102, 241, 0.05);
}

.sidebar-item:hover {
  background-color: #1e293b;
  color: white;
}
```

---

## Logo Usage

### Admin Logo

```tsx
<div className="flex items-center gap-2">
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500">
    <span className="text-sm font-bold text-white">T</span>
  </div>
  <span className="font-display text-lg font-semibold text-white">
    Admin
  </span>
</div>
```

### Favicon

Use the existing `truestack-favicon.png` from the main assets.

---

## Accessibility

- Maintain minimum contrast ratio of 4.5:1 for body text
- All interactive elements must have visible focus states
- Use `focus:outline-none focus:ring-2 focus:ring-indigo-500/50` for focus rings
- Provide alt text for all images and icons
- Ensure keyboard navigation works for all interactive elements
- Use semantic HTML elements (button, nav, main, etc.)
- Support screen readers with proper ARIA labels

---

## Relationship to Other Brands

| Aspect | Truestack (Main) | Truestack Platform (App) | Truestack Admin |
|--------|------------------|--------------------------|-----------------|
| **Theme** | Light | Dark | Dark |
| **Primary Color** | Blue 600 (`#2563eb`) | Indigo 500 (`#6366f1`) | Indigo 500 (`#6366f1`) |
| **Accent** | Teal 600 (`#0d9488`) | Violet 500 (`#8b5cf6`) | Violet 500 (`#8b5cf6`) |
| **Target Audience** | Business decision-makers | Developers, technical teams | Internal staff, administrators |
| **Tone** | Professional, trustworthy | Technical, innovative | Functional, efficient |
| **Heading Style** | Solid colors | Gradient text | Gradient text (major headings) |

---

## File Structure

```
admin-truestack/
├── app/
│   ├── globals.css          # Theme variables and base styles
│   ├── layout.tsx           # Root layout with sidebar
│   ├── page.tsx             # Dashboard
│   ├── clients/             # Client management
│   ├── services/            # Service management
│   ├── users/               # User management
│   └── settings/            # Admin settings
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── layout/              # Sidebar, header, navigation
│   ├── dashboard/           # Dashboard-specific components
│   └── tables/              # Data table components
├── lib/
│   └── utils.ts             # Utility functions (cn)
├── public/
│   └── [assets]             # Images, icons, favicon
└── BRANDING.md              # This file
```

---

## Quick Reference: Gradient Classes

```tsx
{/* Major Page Title (H1) */}
className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent"

{/* Section Header (H2) */}
className="bg-gradient-to-r from-indigo-500 to-indigo-400 bg-clip-text text-transparent"

{/* Primary Button */}
className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"

{/* Logo Background */}
className="bg-gradient-to-br from-indigo-500 to-violet-500"
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial branding guide for Admin Portal |
