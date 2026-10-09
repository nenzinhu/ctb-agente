# Institutional Presentation and GSAP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Explain that CTB Agente supports agents in the field, credit Cabo Jeferson globally, and add a restrained GSAP entrance on the home page without slowing consultation.

**Architecture:** Keep the copy and footer server-rendered. Isolate GSAP in one home-only client boundary that animates pre-rendered elements by data attribute, respects reduced motion, and cleans itself up on unmount.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, GSAP 3, Jest/Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-09-qualidade-documental-e-apresentacao-design.md`

## Global Constraints

- All visible copy is Brazilian Portuguese.
- Home copy must match the approved wording in spec section 7.
- Global credit is exactly `CTB Agente — desenvolvido pelo Cabo Jeferson`.
- The animation runs once, uses about 12 px of vertical movement, and never blocks interaction.
- No parallax, continuous glow, or result-page animation.
- `prefers-reduced-motion: reduce` shows the final state immediately.
- Server-rendered content remains visible when JavaScript fails.
- No GSAP code ships on routes that do not render `HomeReveal`.

## Review Focus

- JavaScript disabled: all institutional copy, form controls, and footer remain visible — pinned by Task 1 component tests and Task 2 server-render test.
- Reduced motion enabled: GSAP does not apply entrance movement — pinned by Task 2 reduced-motion test.
- React Strict Mode remount: the GSAP context is reverted without duplicate persistent styles — pinned by Task 2 cleanup test.
- Small phone viewport: footer and long institutional copy wrap without horizontal overflow — pinned by Task 3 Playwright test.
- Non-home route: GSAP animation component is absent while the global footer remains — pinned by Task 3 Playwright test.

---

### Task 1: Institutional Copy and Global Footer

**Files:**
- Create: `components/Footer.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Create: `tests/components/footer.test.tsx`
- Create: `tests/components/home-institutional-copy.test.tsx`

**Interfaces:**
- Consumes: existing `RootLayout` and home-page server component conventions.
- Produces: `Footer(): JSX.Element`; approved copy rendered as ordinary HTML before hydration.

- [ ] **Step 1: Write the failing footer test**

Create `tests/components/footer.test.tsx` and assert that `Footer` renders the exact credit, the support-tool warning, and a semantic `<footer>` landmark.

```tsx
render(<Footer />);
expect(screen.getByRole('contentinfo')).toHaveTextContent('CTB Agente — desenvolvido pelo Cabo Jeferson');
expect(screen.getByRole('contentinfo')).toHaveTextContent(/apoio à consulta/i);
```

- [ ] **Step 2: Write the failing home-copy test**

Create `tests/components/home-institutional-copy.test.tsx`, render `Home`, and assert the exact eyebrow, description, and official-source warning from spec section 7.

- [ ] **Step 3: Run the focused tests and verify failure**

Run: `npm test -- --runInBand tests/components/footer.test.tsx tests/components/home-institutional-copy.test.tsx`

Expected: FAIL because `Footer` and the approved copy do not exist.

- [ ] **Step 4: Implement the server-rendered footer**

Create `components/Footer.tsx` exporting `default function Footer(): JSX.Element`. Use existing design tokens, a compact layout, and no client directive.

- [ ] **Step 5: Add the footer to every page**

Modify `app/layout.tsx` to render `<Footer />` after `#conteudo`, without moving `Header` or the skip link.

- [ ] **Step 6: Replace the home introduction with the approved wording**

Modify `app/page.tsx` to render the exact copy in spec section 7. Preserve the consultation form as the primary action and keep the operational warning close to the introduction.

- [ ] **Step 7: Run the focused tests**

Run: `npm test -- --runInBand tests/components/footer.test.tsx tests/components/home-institutional-copy.test.tsx`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/layout.tsx app/page.tsx components/Footer.tsx tests/components/footer.test.tsx tests/components/home-institutional-copy.test.tsx
git commit -m "feat: add institutional field-agent presentation"
```

---

### Task 2: Home-Only GSAP Reveal

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `components/HomeReveal.tsx`
- Modify: `app/page.tsx`
- Create: `tests/components/home-reveal.test.tsx`

**Interfaces:**
- Consumes: children containing elements marked with `data-home-reveal` and optional numeric `data-home-reveal-group`.
- Produces: `HomeReveal({ children }: { children: React.ReactNode }): JSX.Element`; a home-only client animation boundary.

- [ ] **Step 1: Write the failing animation contract tests**

Mock `gsap` in `tests/components/home-reveal.test.tsx`. Assert:

- `gsap.context` scopes work to the component root;
- `gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', callback)` gates the motion;
- the animation targets `[data-home-reveal]`, starts at `autoAlpha: 0` and `y: 12`, and uses a short stagger;
- unmount calls both context and media-query cleanup;
- children are visible in the rendered HTML before any mock animation runs.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --runInBand tests/components/home-reveal.test.tsx`

Expected: FAIL because `HomeReveal` does not exist.

- [ ] **Step 3: Install GSAP as a production dependency**

Run: `npm install gsap@^3.13.0`

Expected: `package.json` and `package-lock.json` record one new production dependency without unrelated upgrades.

- [ ] **Step 4: Implement `HomeReveal`**

Create a client component with a root `ref`. Inside `useLayoutEffect`, use `gsap.context()` and `gsap.matchMedia()`. Animate only under `prefers-reduced-motion: no-preference`, use approximately `0.45s`, `y: 12`, `autoAlpha`, and a small stagger. Revert both resources in cleanup.

- [ ] **Step 5: Mark and wrap home-page groups**

Modify `app/page.tsx` to wrap the existing content once in `HomeReveal` and mark the introduction, consultation workspace, guide, and daily tools with `data-home-reveal`. Do not mark inputs or buttons individually.

- [ ] **Step 6: Run animation and copy tests**

Run: `npm test -- --runInBand tests/components/home-reveal.test.tsx tests/components/home-institutional-copy.test.tsx`

Expected: PASS.

- [ ] **Step 7: Run type checking**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json components/HomeReveal.tsx app/page.tsx tests/components/home-reveal.test.tsx
git commit -m "feat: animate the home experience with GSAP"
```

---

### Task 3: Presentation Regression and Bundle Verification

**Files:**
- Modify: `tests/e2e/full-flow.test.ts`
- Modify: `app/globals.css` only if the viewport test exposes wrapping or spacing defects.

**Interfaces:**
- Consumes: `Footer`, approved home copy, and `HomeReveal` from Tasks 1–2.
- Produces: browser-level evidence that the presentation works on home and non-home routes without overflow.

- [ ] **Step 1: Add failing Playwright checks**

Add tests that:

- open `/` at a 360 × 800 viewport and assert the approved description and developer credit are visible;
- assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth`;
- emulate reduced motion, reload `/`, and assert the query field remains visible and usable;
- open `/apostila`, assert the global credit is visible, and assert no `[data-home-reveal]` exists.

- [ ] **Step 2: Run the presentation E2E subset**

Run: `npx playwright test tests/e2e/full-flow.test.ts --grep "institucional|movimento reduzido|rodapé"`

Expected: PASS, or FAIL only for a concrete layout defect to fix in the next step.

- [ ] **Step 3: Fix only demonstrated responsive defects**

If Step 2 exposes overflow or spacing defects, modify `app/globals.css` using existing design tokens. Do not add visual effects outside the approved design.

- [ ] **Step 4: Run all presentation checks**

Run: `npm test -- --runInBand tests/components/footer.test.tsx tests/components/home-institutional-copy.test.tsx tests/components/home-reveal.test.tsx`

Run: `npx playwright test tests/e2e/full-flow.test.ts --grep "institucional|movimento reduzido|rodapé"`

Run: `npm run typecheck`

Expected: all commands pass.

- [ ] **Step 5: Build and compare the home bundle**

Run: `NEXT_TELEMETRY_DISABLED=1 npm run build`

Expected: production build succeeds; record the `/` route size in the handoff and confirm GSAP is not imported by unrelated route source bundles.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/full-flow.test.ts app/globals.css
git commit -m "test: cover institutional presentation and motion"
```
