# Final legal and privacy readiness

Pre-launch compliance pass, 2026-11-20, from `53602ce`. Scope: an 18+ wellness app published worldwide by a solo
developer in Türkiye. This is an engineering review of the code and documents against the rules, **not legal or tax
advice**. Nothing here is "Resolved" unless the code or a source I could read proves it.

**Status key:** **Resolved** (fixed or verified in this repository) · **Owner action** (needs your details or an
App Store Connect step) · **Professional** (needs a lawyer or accountant) · **N/A** (doesn't apply, with the reason).
**Basis:** *Law* (binding legislation) · *Apple* (App Store policy, binding for distribution) · *Rec.* (good practice).

## Sources

- **Read in this pass:**
  - Apple App Review Guidelines (last updated 16 October 2026): 1.4.1, 2.3, 2.3.6, 3.1.1, 5.1.1, 5.1.3.
  - Apple's age-ratings reference and DSA trader help pages, and Apple Developer news (partly read).
  - RevenueCat's iOS SDK privacy manifest (`purchases-ios` 5.101.0 on GitHub).
  - The C2PA provenance data embedded in the artwork sources.
- **Not reachable from this environment** (its network blocks the hosts): kvkk.gov.tr, mevzuat.gov.tr, gib.gov.tr,
  resmigazete.gov.tr, eur-lex, revenuecat.com, dataprivacyframework.gov, openai.com, copyright.gov and fda.gov.
  - **Anything below that depends on those sources is not verified by me.** It's marked *(not re-verified)* and has
    to be confirmed by your lawyer or accountant against the current text.

## Submission blockers (genuine)

1. **`release.config.json` is still placeholders.** It needs the bundle ID, support email, privacy-policy URL,
   support URL and tip product IDs. `npm run release:check` refuses the build until they're real. Owner action.
2. **A published privacy policy with the operator's identity.** Apple 5.1.1(i) requires a policy link in App Store
   Connect and in the app. `docs/legal/PRIVACY_POLICY.md` still has TODOs: operator, address, contact, effective
   date, email provider and retention. Owner action. The legal-basis TODOs need a lawyer, but they don't stop you
   publishing an accurate policy.
3. **App Store Connect declarations:**
   - **App Privacy:** Purchase History, not linked, no tracking, App Functionality.
   - **Age-rating questionnaire:** answer it honestly (Apple 2.3.6).
   - **Content rights.**
   - **EU DSA trader status:** required to distribute in the EU.

   Owner action.
4. **Tips only:** an active Paid Apps Agreement, and RevenueCat set up. Without them the Support screen stays hidden
   on its own, so 1.0 can ship without tips. Owner action.

Nothing else below blocks submission.

## Findings

### Privacy (KVKK, GDPR and UK GDPR)

| # | Issue | Basis | Status |
| --- | --- | --- | --- |
| P1 | **Data minimisation.** Age is asked as a band, never a date of birth. The health question is optional ("Rather not say" = unknown). The only permission is add-only Photos access. Nothing is uploaded; `noNetwork.test.ts` enforces it. | Law (GDPR Art. 5(1)(c); KVKK Art. 4) | Resolved |
| P2 | **The health question overpromised.** Its hint said "We'll keep every habit safe for you", and the New Ascent hint said "keep your targets safe". Both now state the real, limited purpose ("…gentler where needed"). Updated in all 20 languages, machine-made and marked for review. | Law (purpose transparency, GDPR Art. 13; unfair commercial practices); Apple 1.4.1 | Resolved |
| P3 | **Who controls health answers that never leave the phone.** Whether you count as controller for processing only on the device, and whether explicit consent (GDPR Art. 9(2)(a); KVKK Art. 6 as amended by Law 7499) is needed beyond today's optional, purpose-stated question. If a lawyer requires explicit consent, adding a consent line to that step is a small, separate design task. | Law | Professional |
| P4 | **Deletion and user rights.** Export, Restore, Delete my data (including recovery copies and reminders), End Life Reset; documented in policy §7–8. Gap: the RevenueCat SDK's local cache can't be cleared by Delete my data, only by deleting the app. Already disclosed in policy §6a. | Law (GDPR Art. 15–17, 20; KVKK Art. 11) | Resolved |
| P5 | **The policy described the privacy manifest wrongly.** It said "declares no tracking and no collected data", but the RevenueCat SDK's own manifest (verified) declares Purchase History. Corrected in §4. | Apple 5.1.1(i); Law (accuracy) | Resolved |
| P6 | **Policy completed from verified facts (draft 2):**<ul><li>Health answers are optional, and how to change or delete them.</li><li>No iCloud storage. The app has no iCloud entitlement.</li><li>The legal bases for tips, marked "proposed".</li><li>A KVKK Art. 10 information notice (§9a) listing the Art. 11 rights.</li></ul>The KVKK article wording and the 30-day reply period come from the law as I know it *(not re-verified)*. | Law | Resolved (draft); wording: Professional |
| P7 | **Missing owner details:**<ul><li>operator name or company;</li><li>address;</li><li>privacy contact;</li><li>effective date;</li><li>email provider and its storage location;</li><li>email retention;</li><li>whether you'll read Apple's crash reports.</li></ul>Nothing was invented. | Law (GDPR Art. 13(1)(a); KVKK Art. 10) | Owner action |
| P8 | **RevenueCat (United States) as processor:**<ul><li>accept its DPA;</li><li>the transfer mechanism (EU–US Data Privacy Framework certification, or standard contractual clauses) *(not re-verified)*;</li><li>its retention period;</li><li>links to its privacy policy and DPA (§6a TODO).</li></ul> | Law (GDPR Art. 28, 44+) | Owner action + Professional |
| P9 | **KVKK transfer abroad (RevenueCat).** Since Law 7499 (2024), Art. 9 relies on adequacy or appropriate safeguards such as standard contracts notified to the Authority, with narrow exceptions for occasional transfers *(not re-verified)*. Which one applies to a tip purchase is a legal question. | Law | Professional |
| P10 | **VERBİS registration.** The Board's exemption for small controllers excludes those whose main activity is processing special-category data *(threshold figures not re-verified)*. You never receive health data, but confirm. | Law | Professional |
| P11 | **Turkish-language notice.** Whether the policy and the KVKK notice must be published in Turkish. | Law | Professional |
| P12 | **EU and UK representative (GDPR Art. 27).** The likely position is the "occasional, low-risk" exemption, since you receive only anonymous purchase records and emails people send you. To confirm. | Law | Professional |
| P13 | **Apple 5.1.3(ii), "may not store personal health information in iCloud".** The app uses no CloudKit or iCloud Drive. Its sandbox is in the user's own device backup, as for any app. An exported file reaches iCloud only if the user picks it in the share sheet. I read the rule as aimed at app-initiated iCloud storage. | Apple | Resolved (interpretation; recheck if App Review asks) |
| P14 | **Apple 5.1.1(ii), consent before collection.** RevenueCat starts only when the user opens Support (or to finish their own unfinished tip), and Support and Privacy & Data disclose it. Health data is never shared with third parties (5.1.3(i)). | Apple | Resolved |

### Purchases, consumers, DSA and tax

| # | Issue | Basis | Status |
| --- | --- | --- | --- |
| C1 | **Tips use In-App Purchase.** They're consumables that unlock nothing. Apple 3.1.1 allows using IAP to "tip the developer" (verified). There's no restore button, which is correct for consumables. | Apple | Resolved |
| C2 | **The Terms said "no in-app purchases".** They now have a Tips section (one-time, sold by Apple, unlock nothing, refunds through Apple, statutory rights kept) and an open-source clause. Updated in both `TERMS_OF_USE.md` and the in-app copy (`core/legal.ts`). The Terms stay hidden in production builds; 1.0 uses Apple's standard EULA. | Law (accuracy) | Resolved |
| C3 | **Consumer information and the right of withdrawal for tips.** Apple sells as merchant (it shows the price, charges and handles refunds). Confirm whether you have any duty of your own under Turkish Law 6502 or EU consumer law. | Law | Professional (low risk) |
| C4 | **EU DSA trader status.** Tips are income, so you're probably a trader. If so, your address, phone and email are shown publicly on the EU product page; a P.O. box is allowed with proof. The declaration is in App Store Connect → Business → Compliance. | Law (DSA Art. 30) / Apple | Owner action (status: Professional) |
| C5 | **Tax: GVK Art. 20/B and the US tax form.** Questions for your mali müşavir are below. I made no tax determinations. | Law | Professional |

### Health, wellness claims, age and accessibility

| # | Issue | Basis | Status |
| --- | --- | --- | --- |
| H1 | **Not a medical device.** The Wellness note says the app doesn't diagnose, treat or prevent; to see a doctor before changing activity; to stop on warning signs; and that it isn't for emergencies. Habits carry clinician notes for people with precautions. There are no measurement or accuracy claims. This fits Apple 1.4.1's "remind users to check with a doctor". Classification under EU MDR and FDA general wellness *(not re-verified)* is consistent with a lifestyle intended purpose. | Apple; Law | Resolved; classification: Professional (low risk) |
| H2 | **The Wellness note is English in all 20 languages.** In-language safety notes do exist where they matter (on the habits themselves). Translating the note through the i18n workflow is recommended, not proven mandatory. | Rec. | Owner decision |
| H3 | **Marketing claims.** "66 days to build better habits" describes the program's length. The Wellness note says the timing varies and finishing guarantees nothing. No claims of "proven", "clinically" or "cure". The App Store description isn't written yet: keep it to the same standard (no guaranteed outcomes, no medical claims). | Law (unfair practices); Apple 2.3 | Resolved (in-app); listing: Owner action |
| H4 | **18+ eligibility.** A self-declared age band. Under-18s are stopped at set-up; an older program begun at 16–17 is paused but can be exported or deleted. Whether self-declaration is enough everywhere you sell is a legal question. | Law | Resolved (code); Professional |
| H5 | **App Store age rating vs the app's 18+.** The questionnaire will likely produce a low rating ("Health or Wellness Topics" counts toward 9+). A partly read Apple news item (July 2025) says a higher rating can be set if your policy requires it. **Recommend choosing 18+** so parental controls match the app. State age-assurance laws (Texas, Utah, Louisiana; the Declared Age Range API): Texas was paused by an injunction in Dec 2025, but later Apple news conflicts *(not re-verified)*. With an 18+ rating and the in-app gate, risk is low; confirm before selling in the US. | Apple; Law | Owner action + Professional |
| H6 | **Accessibility.** VoiceOver labels, Dynamic Type, Reduce Motion and RTL are in place; device checks are in `TESTFLIGHT_CHECKLIST.md` §4. EU Accessibility Act: a habit app isn't a listed service, and services by microenterprises are exempt (Art. 4(5)) *(not re-verified)*. Apple's Accessibility Nutrition Labels are optional; declare them after the device checks. | Law; Rec. | N/A (EAA); device checks: Owner action |

### Copyright, artwork and open source

| # | Issue | Basis | Status |
| --- | --- | --- | --- |
| A1 | **Origin of the artwork, verified.** The C2PA manifests in `design/artwork-candidates/` record "ChatGPT / gpt-image", signed by OpenAI and marked as trainedAlgorithmicMedia. `THIRD_PARTY_NOTICES.md` already says so; the Terms now do too. | (fact) | Resolved |
| A2 | **Commercial use of AI output.** OpenAI's terms assign output rights to the user and allow commercial use *(not re-verified; openai.com blocked)*. Confirm three things before the Content Rights declaration:<ul><li>the terms of the account used;</li><li>that no third-party images were uploaded as references;</li><li>that no painting imitates a protected work or trademark.</li></ul> | Contract | Owner action |
| A3 | **Copyright protection of AI-made art.** It may be thin or absent for purely AI-generated images (the US Copyright Office position, 2025; FSEK requires a human author) *(not re-verified)*. This limits how far you can stop copying. It doesn't affect your right to use the art. | Law | Professional |
| A4 | **EU AI Act Art. 50 (disclosing AI-generated content).** It targets deep fakes of real people, places and events; fictional painted landscapes are artistic work. The origin is disclosed voluntarily anyway. | Law | N/A *(not re-verified)* |
| A5 | **Open-source obligations.** 94 components: MIT, ISC, BSD, Apache-2.0, BSL-1.0 and the Pictogrammers licence, with no copyleft. Full texts, and Apache NOTICE files where present, are shown offline in the app and in `THIRD_PARTY_NOTICES.md`. `release:check` verifies them against the production build. | Law (licence terms) | Resolved |

## Tax questions for your accountant (mali müşavir)

1. **GVK 20/B:**
   - Do tips (consumable In-App Purchases paid out by Apple) count as income from "applications developed and sold
     through electronic app stores"?
   - Which conditions apply: a dedicated bank account, bank withholding, the annual limit and its current amount, and
     any notice to the tax office?
2. If the limit is exceeded, or other income is mixed in, what is the switch to a sole proprietorship (şahıs şirketi)
   or a company, and when must it happen?
3. Does using 20/B, or being a "trader" under the EU DSA, affect your SGK (Bağ-Kur) position?
4. US tax form W-8BEN: TCKN as the foreign tax ID, and whether to claim the US–Türkiye treaty rate.
5. How Apple's collection of VAT/KDV and Türkiye's digital service tax shows in your proceeds, and whether you have
   any VAT duty of your own on EU or Turkish tips.
6. What records to keep (Apple's financial reports, bank statements), and for how long.

## Changed in this pass

- **Onboarding and New Ascent:** the health hints no longer overpromise safety. They now say "…gentler where needed"
  in all 20 languages, machine-made and marked for review.
- **Terms of Use** (`docs/legal/TERMS_OF_USE.md` and the in-app `src/core/legal.ts`): the wrong "no in-app
  purchases" claim is removed. Added a Tips section, the open-source clause and the artwork's origin.
- **Privacy policy, draft 2:**
  - the manifest statement corrected;
  - health answers optional, how to change them, and no iCloud;
  - legal bases for tips;
  - a KVKK Art. 10 information notice.
- **Legal review checklist:** synced with these findings.
