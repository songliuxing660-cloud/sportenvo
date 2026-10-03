# SPORTENVO search and lead measurement

## Implemented on 2026-10-03

- Audited 74 HTML content files: 65 indexable pages, 9 intentional noindex pages.
- Kept existing product, project and buyer-guide content and approved brand facts.
- Synchronized Open Graph and Twitter metadata with each page's existing title, description, canonical and real image.
- Refreshed the Insights ItemList from the guides actually linked on the page.
- Preserved original landing page and five UTM fields across navigation; identified AI referrers only when the browser supplies a recognized external hostname.
- Deduplicated confirmed Zoho submissions. A thank-you URL parameter alone does not count as an enquiry.
- Added read-only search checks and attribution tests to pull-request CI.
- Updated IndexNow to notify only indexable changed pages after their production HTML is published.

Passing a technical audit does not establish Google indexing, ranking, visits or AI citations. IndexNow acceptance is a notification, not an indexing guarantee, and is not a Google submission.

## Verify locally

Run from the website repository:

```sh
node scripts/check-site-consistency.mjs
node scripts/audit-search.mjs --strict
node --test scripts/test-lead-tracking.mjs
node scripts/sync-search-metadata.mjs
```

The last command previews pending metadata updates. Use `--write` only after checking content and actual image selections. Update sitemap lastmod only for pages that really changed. Reports in this directory describe checked-out files, not live search engine coverage.

## Google account handoff

The connected GSC connector reported an expired trial. The current browser's Google session reported no access to the `sc-domain:sportenvo.com` property. No paid subscription was started and no Google indexing submission was completed.

Use the Google account that owns or already has access to SPORTENVO's property. In Search Console, submit `https://sportenvo.com/sitemap.xml`; inspect the homepage, Super Panoramic, Roof, FORCE-HX and Modular Foundation pages. Record the actual coverage status, last crawl and selected canonical before requesting indexing. Do not use `site:` results as an exact count of indexed pages.

## Distribution links for existing owned profiles

Use only when updating the existing official profiles or publishing approved content. These examples were prepared, not posted.

- YouTube roof video: `https://sportenvo.com/roof.html?utm_source=youtube&utm_medium=organic_video&utm_campaign=roof_projects&utm_content=description`
- Medium buyer article: `https://sportenvo.com/how-to-choose-a-padel-court-manufacturer.html?utm_source=medium&utm_medium=referral&utm_campaign=buyer_guides&utm_content=supplier_article`
- Sales PDF RFQ link: `https://sportenvo.com/padel-court-rfq-checklist.html?utm_source=sales_pdf&utm_medium=referral&utm_campaign=project_review&utm_content=rfq_link`

Never put names, email addresses, phone numbers or customer project details in UTM fields. Do not use a new UTM on internal website links. Browser privacy and absent referrers mean AI traffic attribution will always be incomplete.

## Measurement

In GA4, inspect `start_project_click`, `contact_whatsapp_click`, `contact_email_click`, `contact_phone_click`, `resource_download`, `project_form_submit` and `generate_lead`. These are event names, not new GA4 custom-dimension registrations. Register needed low-cardinality custom dimensions in the real GA4 property before expecting dedicated reporting for `lead_referrer_source` or `lead_source_tag`.

Separate clicks from confirmed submissions and confirmed submissions from qualified enquiries. Compare Search Console impressions, clicks and indexed priority URLs with GA4 landing pages and qualified enquiries. Never label ordinary Google organic visits as Google AI Overview visits without evidence.

## Repeatable AI visibility sample

Record assistant, date, language, region, exact question, cited URLs and whether SPORTENVO is mentioned. These questions are a test protocol, not evidence that tests have already been run. Use identical wording for later comparisons and do not expect deterministic recommendations.

1. How should I choose a commercial padel court supplier?
2. What should a padel court quotation include?
3. What makes a good commercial padel court?
4. What is the total cost of building a padel court?
5. What is the difference between panoramic and super panoramic padel courts?
6. Which foundation options work for a leased padel venue?
7. Can a modular foundation replace permanent civil works for every site?
8. What information is needed before designing a covered padel court?
9. How should I compare fixed and retractable padel roofs?
10. What affects the cost of a padel court roof?
11. What should a coastal padel project check before procurement?
12. How should a high-wind padel court be engineered?
13. What should a resort consider when buying padel courts?
14. How many padel courts should a new club start with?
15. How do I compare indoor and outdoor padel club sites?
16. What causes drainage problems on padel courts?
17. What glass specification should I ask a padel court supplier for?
18. What turf and maintenance information should a quotation include?
19. What should I check before shipping and installing padel courts?
20. What real project references should a padel court supplier provide?

Do not invent certifications, hurricane ratings, prices, legal-entity claims or customer endorsements to increase visibility.
