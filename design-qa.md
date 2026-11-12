# Work page design QA and audit

The five company logos work as a closing section below the projects. The layout follows the reference's centered heading and single desktop logo row. The broader Work page has three issues worth addressing around its filters and project cards.

**Work page findings**

1. **P2 · Category filters lack radio keyboard navigation.** On the Work page, Right Arrow on the selected **All** option left both focus and selection in place. All four options were in the Tab order. Space on **Fintech** selected the filter, updated the URL, and narrowed the list from six projects to Chequepoint. Use native radios styled as pills, or give the selected option one Tab stop and support arrow keys for focus and selection. Preserve the shareable category URL. [Filter component](/Users/sudi/.codex/worktrees/company-showcase/sudi.dev/components/filter-bar.tsx:46) · [W3C radio group keyboard pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)
2. **P2 · Small text falls below minimum contrast in dark mode.** The stat captions measure **2.97:1** using `#5C5C66` over `#0B0B11`. White text on the selected filter measures **4.03:1** over `#607EBC`. Both are below the **4.5:1** threshold for normal-sized text. Use the secondary text token for the stat captions and give the selected pill a foreground and background pair that meets 4.5:1 in both themes. [Work stats](/Users/sudi/.codex/worktrees/company-showcase/sudi.dev/app/work/page.tsx:88) · [Filter styles](/Users/sudi/.codex/worktrees/company-showcase/sudi.dev/components/filter-bar.tsx:58) · [WCAG 2.2 minimum contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
3. **P2 · Project titles look clickable.** The top-right arrow beside each title suggests that the card opens a destination. The title and arrow are static, and the School Management Platform card has no action. Remove the title arrows from static cards and reserve the icon for working links. Where a link exists, make its label identify the destination, such as “Visit Almafrica”. [Project cards](/Users/sudi/.codex/worktrees/company-showcase/sudi.dev/components/work-project-card.tsx:35)

**Observed flow**

1. **Open Work · Clear entry, faint stat labels.** The intro identifies the portfolio and the default **All** filter shows six projects. The card titles make the projects easy to scan.

   ![Work page entry showing stats, filters, and the first two project cards](/Users/sudi/.codex/visualizations/2026/11/12/01a1cec3-725d-7051-aec4-7727d4672df4/work-design-audit/01-work-entry.jpg)

2. **Filter projects · Works with Space, incomplete arrow-key support.** The **Fintech** pill visibly takes focus and the result is Chequepoint. The selected category is represented in the URL.

   ![Fintech selected with the Chequepoint project visible](/Users/sudi/.codex/visualizations/2026/11/12/01a1cec3-725d-7051-aec4-7727d4672df4/work-design-audit/02-work-fintech.jpg)

3. **Reach the company section · Clear placement.** After the final project row, the company band has its own heading and divider before the footer.

   ![Company logos between the last project cards and footer](/Users/sudi/.codex/visualizations/2026/11/12/01a1cec3-725d-7051-aec4-7727d4672df4/work-design-audit/03-companies-desktop.jpg)

4. **Read the company section on mobile · Fits.** At a 390 CSS px viewport the marks wrap into two pairs and a centered final mark. The two-line heading and all five names fit without clipping or horizontal scrolling.

   ![Mobile view of the company logos and footer](/Users/sudi/.codex/visualizations/2026/11/12/01a1cec3-725d-7051-aec4-7727d4672df4/work-design-audit/04-companies-mobile.jpg)

**Comparison with the supplied reference**

![Reference and rendered company sections at the same comparison width](/Users/sudi/.codex/visualizations/2026/11/12/01a1cec3-725d-7051-aec4-7727d4672df4/work-design-audit/comparison.png)

The full section comparison and the [focused logo comparison](/Users/sudi/.codex/visualizations/2026/11/12/01a1cec3-725d-7051-aec4-7727d4672df4/work-design-audit/comparison-logos.png) show the same title-above-logos hierarchy. The reference contains seven example companies. The implementation shows the five companies selected for this portfolio and uses the Work page theme and spacing.

| Surface | Observed result |
| --- | --- |
| Fonts and typography | The reference uses a larger sans-serif title and wordmarks that vary by brand. The implementation uses Geist at 30 px, weight 600, with a 36 px line height. The labels use Inter at 14 px, weight 500, with a 20 px line height. The heading wraps on phones, and the longest names fit or wrap without truncation. The raster reference does not establish a specific font family. |
| Spacing and layout | The reference has a 341 px-tall section. The current desktop section is 241 CSS px tall, with a 32 px gap between the heading and logo row. Its tighter spacing fits the transition from projects to footer. At 768 CSS px the logos form rows of three and two. At 320 and 390 CSS px they form rows of two, two, and one. The measured page width did not exceed the content viewport. |
| Colors and tokens | The reference has a medium-gray background, approximately `#636363` in sRGB. The Work band uses `#13131B` with `#EDEDF0` text. The company labels measure **15.81:1**. IST and Waves use light marks on the dark surface, and the green, yellow, and blue marks retain their distinguishing colors. |
| Image quality and asset fidelity | All five company assets loaded in the browser. The 80 × 44 CSS px logo boxes preserve aspect ratios. The focus crop shows no clipping or opaque image backgrounds. The 200 × 200 Fintech raster has sufficient resolution for its displayed size, although its thin blue mark has less visual weight than IST and Waves. |
| Copy and content | The heading matches the reference. The current company names appear as readable text beneath decorative marks, so the accessibility tree exposes the heading and five names without reading duplicate image descriptions. The marks are informational. |

**Capture details**

- Source visual truth was the [attached reference](/Users/sudi/.codex/visualizations/2026/11/12/01a1cec3-725d-7051-aec4-7727d4672df4/work-design-audit/reference.png), an 1185 × 341 px PNG. It only shows the logo section, so it provides no reference for project cards, filters, footer placement, or mobile reflow.
- The [rendered desktop view](/Users/sudi/.codex/visualizations/2026/11/12/01a1cec3-725d-7051-aec4-7727d4672df4/work-design-audit/03-companies-desktop.jpg) used the local `/work` route with **All** selected, dark theme, viewport 1185 × 850 CSS px, and device pixel ratio 1. The browser exported a 1170 × 839 px JPEG. The panel was cropped from the screenshot and normalized to its measured 1170 × 241 CSS px content size. The source was converted from its embedded color profile to sRGB and scaled uniformly to 1170 × 337 px. The comparison preserves the difference in panel height.
- The [mobile view](/Users/sudi/.codex/visualizations/2026/11/12/01a1cec3-725d-7051-aec4-7727d4672df4/work-design-audit/04-companies-mobile.jpg) used a 390 × 844 CSS px viewport at device pixel ratio 1 and exported a 375 × 812 px JPEG. The tablet and narrow-phone checks used live layout measurements.
- The audit exercised the keyboard and pointer category controls and checked the resulting URL, project list, and selected state. The browser reported no captured console errors. This pass covers the local dark-theme Work page and does not establish full accessibility compliance or verify external link destinations.

**Implementation checklist**

1. Fix keyboard navigation in the category control and verify focus, selection, and results together.
2. Raise the contrast of stat captions and selected filter labels, then measure the final colors in both themes.
3. Remove the misleading project title arrows and use destination-specific labels on real links.

**Follow-up polish**

- **P3 · Logo prominence.** The current marks are visually smaller and more uniform than those in the reference. If the row should carry more weight, try a 52–56 px desktop mark height first and judge the Fintech mark against the others at the same viewport. Keep the current mobile sizing.

The company section was compared once in its final placement. The only actionable fidelity refinement is P3. The three P2 findings belong to the surrounding Work page audit.

final result: passed
