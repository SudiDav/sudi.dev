# French public site and project bookings checklist

**Status** Verified in local previews. The production release is authorized.
**Requirements** [PRD](./prd.md)

## Implementation

- [x] **1. Record the baseline and write the acceptance tests first.** Verify the published inventory against `origin/main`, check translated coverage against that list, and capture the smallest relevant existing checks before editing runtime code. Start from freshly fetched `origin/develop` in a clean worktree and carry forward the verified homepage project-inquiry change.
  **Done means** Tests cover localized routes, content visibility, both contact states and English compatibility. New behavior fails for the expected reason before implementation.
  **Maps to** AC-1 through AC-7. **Touches** Targeted app, content and rendered-route tests.

- [x] **2. Establish bilingual routing and verify both runtimes.** Define shared locale and path helpers for English and French. Give each document the correct `lang` from its server-rendered layout. Prove `/` and `/fr` render through the shared shell before extending the structure to the other pages. Preserve direct English URLs and the admin auth boundary.
  **Done means** A direct request to either homepage returns HTTP 200, the expected `lang`, and the correct route on Next.js and the vinext Workers preview.
  **Maps to** AC-1, AC-7. **Depends on** 1. **Touches** App Router layouts, shared shell and locale helpers.

- [x] **3. Localize the public shell and core pages.** Add the English and Français links to desktop and mobile navigation. Translate the homepage, Work, About and Privacy, including project summaries, filters, availability text, contact copy, alt text and accessible labels. Keep the existing layout, art, typography and theme support. Translate the 3D labels, motion controls, instructions, reflections and still-image fallback.
  **Done means** Both language links reach the matching page, the seven Work entries appear in French with stable project anchors, and the interactive scene and fallback work at desktop and phone widths.
  **Maps to** AC-1, AC-2. **Depends on** 2. **Touches** Public page views, navigation, footer, Work cards, shared controls and world strings.

- [x] **4. Add the French content pipeline.** Pair translated MDX with the original by slug. Extend the current server-side content reader and Workers bundling so French content uses the same validation and publication rules. Derive visibility from the original English source.
  **Done means** Both runtimes load a published French fixture. A draft, a missing source, and a published English article without a French translation each return a French 404 and stay out of French listings.
  **Maps to** AC-3, AC-4, AC-7. **Depends on** 2. **Touches** `lib/content.ts`, `lib/bundled-content.ts`, `build-plugins/content.ts` and their tests.

- [x] **5. Translate and review the published article set.** Translate titles, subtitles, excerpts, body text, headings, captions, image descriptions and public frontmatter used in lists and sharing. Preserve dates, attribution, quotations, references and the technical meaning of code examples. Check translated internal links and heading anchors.
  **Done means** All 10 baseline articles have a complete French edition and a bilingual editorial review. Each of the paired URLs renders with the expected content, images, links and code blocks.
  **Maps to** AC-3. **Depends on** 4. **Touches** French article MDX and coverage tests.

- [x] **6. Localize the blog experience.** Translate the index, categories, filters, search, empty states, newsletter form feedback, reading controls, related links and author bio. Use French dates and reading-time labels. Preserve access to existing article discussions where configured and verify the French comments controls.
  **Done means** A reader can find and open French articles from the French homepage or blog. French search and filters stay in French, related links resolve, and the English article’s discussion remains accessible.
  **Maps to** AC-1, AC-2, AC-3, AC-4. **Depends on** 3, 4, 5. **Touches** Blog and article views, search, filters, date formatting, comments and newsletter UI.

- [x] **7. Connect the 30-minute call invitation.** The general project section uses a localized email request as its primary action in both languages while Sudi sets up Cal.com. Keep `hello@sudi.dev` visible as a direct email link.
  **Done means** Each homepage opens an email to `hello@sudi.dev`. Tests also exercise the localized booking button with a configured Cal.com link.
  **Maps to** AC-6. **Depends on** 2. **Touches** Homepage contact section, public booking-link settings and contact tests.

- [x] **8. Localize discovery and sharing.** Add self-canonical and reciprocal language metadata for each public pair, French Open Graph copy, bilingual sitemap entries, and a French RSS feed at `/fr/rss.xml`. Keep the existing English feed and direct links.
  **Done means** Both runtimes send crawler-readable canonical and language alternate links. The sitemap and both feeds name the intended public URLs. French entries in the sitemap and feed represent published translations.
  **Maps to** AC-4, AC-5. **Depends on** 3, 4, 5, 6. **Touches** Page metadata, `app/sitemap.ts`, RSS routes and SEO tests.

- [ ] **9. Verify the integrated release.** Rerun affected unit and rendered-route tests, type checking and changed-file lint. Build both Next.js and the Workers preview. In browsers, test both languages at desktop and phone widths, keyboard navigation, article pairing, contact actions, scene controls and the WebGL-disabled fallback. Inspect the scoped diff in one independent review.
  **Done means** The acceptance checks pass in both runtimes, the release diff is reviewed, and the existing unrelated production content is preserved when preparing the release against `main`. After a separately authorized release, repeat the public smoke checks on sudi.dev.
  **Maps to** AC-1 through AC-7. **Depends on** 1–8. **Touches** Existing CI checks plus targeted browser and rendered-route verification.

## Verification

- The 39-test English baseline passed. Four new route checks failed for the expected reason before French routes were added. The integrated candidate passed 107 targeted tests on Next.js and eight rendered-route tests on the Workers preview. Both production builds, type checking, changed-file lint and the diff whitespace check passed.
- Chrome verified the localized 3D controls and still-image fallback, Work filters, keyboard access to the contact section, and the email link at desktop and phone sizes. French blog search, navigation between article languages and the newsletter dialog passed on both runtimes.
- All 10 article pairs and seven Work entries were checked against the published inventory. The French versions preserve all 27 fenced code blocks. Both runtimes serve the bilingual sitemap and the English and French feeds.
- The original Workers candidate streamed canonical links into the document body. In the authorized follow-up attempt, the Worker renders metadata in the head before caching the response. The regression test failed on the original candidate and passed after the fix across all English and French page pairs, including the 10 article pairs.
- After the fix, both production builds passed. The Worker HTTP suite passed 10 tests and the targeted Next.js suite passed 18. Chrome verified article language switching with the corrected canonical link in place. Production smoke checks are tracked in step 9.

## Cal.com activation

- [ ] After Sudi supplies the public event links, set `bookingUrls.en` and `bookingUrls.fr` in `content/site.json`. Confirm that a signed-out visitor can reach the calendar and that an authorized 30-minute test booking arrives on the intended calendar and blocks the slot in both languages.

## Published article inventory

Snapshot from `origin/main` at `fd728ae` on November 22, 2026. Entries are selected using the current content loader’s published-status rule. Recheck the inventory before implementation and review any drift before release.

| English article | Slug to preserve |
| --- | --- |
| Adding Entity Framework Core and SQLite | `adding-entity-framework-core-and-sqlite` |
| After Amen, Move | `after-amen-move` |
| Attention Is All You Need | `attention-is-all-you-need` |
| Code Smart, Not Fast: Avoiding Premature Optimization | `code-smart-not-fast-avoiding-premature-optimization` |
| Getting started with ASP.NET Core 7 Minimal APIs | `getting-started-with-aspnet-core-7-minimal-apis` |
| How to send an email with ASP.NET Core Minimal API and MailKit | `how-to-send-an-email-with-aspnet-core-minimal-api-and-mailkit` |
| Maybe Love Is the Now | `maybe-love-is-the-now` |
| Observability 101: Stop Debugging in the Dark | `observability-101-stop-debugging-in-the-dark` |
| The Outbox and Inbox Pattern in .NET 10 with EF Core and PostgreSQL | `outbox-and-inbox-pattern-dotnet-ef-core-postgres` |
| The Crucial Role of English Proficiency in Software Development | `the-crucial-role-of-english-proficiency-in-software-development` |

## Approval

- [x] Approved for implementation
- Approved by: Sudi
- Date: 2026-11-22
