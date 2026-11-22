# French public site and project bookings

## Goal

Give visitors a complete French version of the public sudi.dev site, including the current article archive. Invite clients with any software project to book a free 30-minute introduction or write to `hello@sudi.dev`.

## Scope

- Localize Home, Work, About, Blog, article pages, Privacy, and the public navigation and controls. Translate the seven existing Work entries and all 10 published articles found on production branch `main` at `fd728ae` on November 22, 2026.
- Serve French at `/fr`, with matching paths such as `/fr/work` and `/fr/blog/<slug>`. Existing English URLs remain valid. Use the site’s existing design, content rendering, and interactive 3D scene in both languages.
- Offer a free hosted booking page for a 30-minute project call on the English and French homepages. Keep `hello@sudi.dev` visible and usable as an email option.
- Maintain French translations in version-controlled content. The admin and publishing workflow continue to operate on the English source. The scope covers the main public site at `sudi.dev`.

## Implementation direction

Use Next.js layouts that set the document language on the server, with a shared layout for fonts, theme, and analytics. Verify the routing pattern in Next.js and the vinext Workers preview before moving existing routes. Reuse public page components with locale-specific labels and content. Pair article and project translations by their existing slugs and derive public visibility from the English record.

Use the **Cal.com Individuals** plan. Its free tier supports multiple event types, calendar connections, and conflict checks. Configure English and French 30-minute event links against the same confirmed availability so a booking in either language blocks the time in both. Use a hosted link from each homepage with the existing email action available alongside it. Cal.com documents event language settings and custom availability. [Cal.com pricing](https://cal.com/pricing) · [Cal.com event setup](https://cal.com/blog/event-types-guide-calcom)

## Acceptance criteria

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC-1 | A visitor opens an English or French public URL | They use the language switch | They reach the paired page in the chosen language, with the correct document language and working desktop and mobile navigation. |
| AC-2 | A visitor opens a French public page | They use the site or the homepage scene | Page copy, controls and accessible labels are in French, and existing interactions work at desktop and phone widths. |
| AC-3 | An English article was published at the inventory checkpoint | A reader opens its French URL | The full French article renders with translated metadata and captions, with its code and technical references intact. |
| AC-4 | An English source is a draft, unpublished or missing a later French translation | A crawler or visitor requests its French counterpart | It is absent from French listings, search, sitemap and feed, and the direct French URL returns 404. |
| AC-5 | Both versions of a public page exist | A crawler requests either URL or the sitemap | Each URL is self-canonical, language alternates point to each other, and the locale-specific blog and feed use published article URLs. |
| AC-6 | A prospective client has a software project | They use the homepage contact section | They can book a free 30-minute slot on the matching language page or email `hello@sudi.dev`. If a booking link is unavailable, the primary action requests the same call by email. |
| AC-7 | The release candidate is ready | It runs on Next.js and the Cloudflare Workers preview | The same French routes and article inventory render on both, and the existing English public paths, publishing flow, and admin authentication pass the affected checks. |

## Booking inputs

Sudi confirmed that both homepages should use the email request while he sets up Cal.com. The booking links can be enabled when he supplies the public URLs.

Before making booking publicly available, confirm the host account, calendars to check, weekly availability in `Africa/Lubumbashi`, meeting location or video service, public event links, and the inbox that receives booking notices. Use an authorized test booking to check duration, time zones, confirmation, cancellation and calendar conflicts.
