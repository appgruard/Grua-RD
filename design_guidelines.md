# Design Guidelines: GruaRD - Tow Truck Service PWA

## Design Approach: Functional Utility with Ride-Hailing Patterns

**Selected Approach:** Design System (Material Design) with references to Uber's interaction patterns

**Justification:** This is an emergency utility service where speed, clarity, and reliability are paramount. Users need immediate access to core functions (request service, track location, contact driver) without visual distraction. The 3-factor analysis (utility-focused purpose, information-dense content, function-differentiated market) directs us toward established patterns that users already understand from ride-hailing apps.

**Key Design Principles:**
- Emergency-ready: Large touch targets, high contrast, instant comprehension
- Mobile-first: Optimized for one-handed use during stressful situations
- Context-aware: Interface adapts to user role (Client/Driver/Admin)
- Caribbean-appropriate: Works well in bright sunlight conditions

---

## Brand Colors

**Primary Brand Colors:**
- **Navy Blue (Primary)**: `hsl(210, 65%, 17%)` - Dark navy blue from GruaRD logo, used for primary buttons, headers, and key UI elements
- **Orange Accent**: `hsl(38, 91%, 55%)` - Vibrant orange from logo arc, used for accents, highlights, and call-to-action elements

**Supporting Colors:**
- Secondary Gray: Neutral gray tones for backgrounds and less prominent UI elements
- Muted Tones: Subtle grays for secondary information
- Charts: Combination of navy blue and orange with supporting greens

**Application:**
- Logo: Full-color GruaRD logo (navy blue + orange) displayed in login screens, admin sidebar, and key branding touchpoints
- Primary Actions: Navy blue for main buttons and navigation
- Highlights & CTAs: Orange for important actions and status indicators
- Backgrounds: Subtle grays and whites for optimal readability

---

## Typography

**Font Family:** Inter (via Google Fonts) for all interfaces
- Primary: Inter (400, 500, 600, 700)
- Monospace: Inter for pricing/distances

**Hierarchy:**
- Hero/Headers: text-3xl to text-4xl, font-bold
- Section Titles: text-xl to text-2xl, font-semibold
- Body Text: text-base, font-normal
- Captions/Meta: text-sm, font-medium
- Large Data (prices, distances): text-2xl to text-3xl, font-bold

---

## Layout System

**Tailwind Spacing Primitives:** 2, 3, 4, 6, 8, 12, 16
- Micro spacing (between related items): p-2, gap-2, space-y-2
- Component padding: p-4, p-6
- Section spacing: py-8, py-12, py-16
- Major separations: mb-12, mt-16

**Container Strategy:**
- Mobile: px-4 throughout
- Desktop Admin Panel: max-w-7xl mx-auto px-6

---

## Interface-Specific Layouts

### Client App (Mobile PWA)
**Structure:**
- Fixed bottom navigation (h-16) with 4 tabs: Home, History, Profile, Support
- Full-screen map view on Home with floating action cards
- Request flow uses bottom sheets that slide up over map (h-auto max-h-[80vh])
- Spacing: Floating cards use mb-20 to clear bottom nav, p-4 internal padding

### Driver App (Mobile PWA)
**Structure:**
- Toggle bar at top (h-14): Available/Offline status with large switch
- Split view: Map occupies 60% viewport, incoming requests card 40%
- Active job view: Full-screen map with collapsible info drawer (h-24 collapsed, h-64 expanded)
- Quick actions always accessible: Call Client, Navigation, Complete Service

### Admin Panel (Desktop Web)
**Structure:**
- Left sidebar navigation (w-64, fixed)
- Top header bar (h-16) with breadcrumbs and user menu
- Main content area with consistent py-8 px-6
- Dashboard: 4-column grid (grid-cols-4 gap-6) for stat cards
- Tables: Full-width with sticky headers, alternating row backgrounds

---

## Component Library

### Core Navigation
- **Bottom Tab Bar (Mobile):** Fixed position, icon + label, active state with indicator line (h-1, positioned absolute)
- **Sidebar (Admin):** Collapsible on tablet, icon-only when collapsed (w-16), full with labels (w-64)
- **Top Bar:** App logo/title left, user avatar/actions right, h-14 to h-16

### Map Components
- **Full-Screen Map:** Position relative container, Google Maps fills 100%
- **Location Pin:** Centered absolutely, animated drop effect on placement
- **Floating Action Button:** Absolute positioned, bottom-24 right-4, rounded-full, w-14 h-14
- **Info Cards Over Map:** Absolute bottom-20, w-full px-4, rounded-2xl, shadow-2xl, backdrop-blur-md backgrounds

### Forms & Inputs
- **Text Inputs:** h-12, rounded-lg, px-4, border-2, focus ring with offset
- **Large Action Buttons:** h-14, w-full, rounded-xl, font-semibold text-lg
- **Icon Buttons:** w-12 h-12, rounded-full, centered icon
- **Toggle Switch:** w-14 h-8, rounded-full track, animated slider

### Data Display
- **Stat Cards (Admin):** p-6, rounded-xl, shadow-md, icon top-left, value text-3xl, label text-sm
- **Service History Cards:** p-4, rounded-lg, border-l-4 (status color), grid layout for data points
- **Driver Cards:** Horizontal layout, avatar left (w-16 h-16), info center, status badge right
- **Pricing Display:** Large centered numbers (text-4xl), breakdown list below (text-sm), total in bordered section

### Interactive Elements
- **Request Service Button:** Pulsing animation, fixed bottom position, h-16, full-width minus px-4 margins
- **Accept/Reject Actions:** Side-by-side, equal width, h-14, contrasting treatments
- **Rating Stars:** touch-friendly sizing (w-12 h-12 each star), spaced gap-2
- **Status Badges:** inline-flex, px-3 py-1, rounded-full, text-xs font-semibold

### Overlays
- **Bottom Sheets (Mobile):** Slide up animation, rounded-t-3xl, drag handle, max-h-[90vh], overflow-y-auto
- **Modals (Admin):** max-w-2xl, rounded-2xl, p-8, centered with backdrop
- **Loading States:** Skeleton screens with pulse animation, maintain layout dimensions
- **Notifications/Toasts:** Fixed top-4 right-4, rounded-lg, p-4, auto-dismiss, slide-in animation

---

## Mobile-First Specifics

**Touch Targets:** Minimum 44px (h-11) for all interactive elements
**Thumb Zones:** Primary actions in bottom third of screen, secondary in middle
**One-Handed Use:** Navigation always accessible at bottom, critical actions within easy reach
**Offline Indicators:** Persistent banner when connectivity lost (h-8, fixed top-0)
**Safe Areas:** Account for notches with env(safe-area-inset-*)

---

## Admin Dashboard Specific

**Data Tables:**
- Sticky header row (position: sticky, top-0)
- Pagination controls: bottom-right, gap-2 button group
- Row actions: Right-aligned icon buttons (w-8 h-8)
- Responsive: Horizontal scroll on mobile, full table on desktop

**Charts & Graphs:**
- Height: h-64 to h-80 for primary charts
- Legend: bottom placement, horizontal layout, gap-4
- Hover tooltips with white backgrounds, shadow-lg

---

## Images

**Client App:**
- Empty state illustrations: Place when no service history (w-48 h-48 centered)
- Driver profile photos: Circular avatars throughout (w-12 h-12 to w-16 h-16)

**Admin Panel:**
- No hero image (utility dashboard)
- Vehicle photos in driver management: Square thumbnails (w-20 h-20, rounded-lg)
- Document previews: Portrait orientation placeholders when pending upload

**General:**
- All user avatars: Circular crop, fallback to initials with background
- Vehicle images: 16:9 aspect ratio, rounded corners
- Map markers: Custom PNG icons, high contrast for visibility

---

## Animations

Use sparingly and purposefully:
- Map pin drop on location selection (0.3s ease-out)
- Bottom sheet slide transitions (0.25s ease-in-out)
- Button press feedback (scale transform, 0.1s)
- Status changes (fade transition, 0.2s)
- No animations for: data updates, table sorting, tab switches