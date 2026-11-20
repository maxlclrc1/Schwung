# Legal review checklist

The documents in this folder are **drafts**. They haven't been reviewed or approved by a lawyer and must not be
published or relied on until the items below are settled.

## Founder details (fill every `TODO`)

- [ ] Operator: full legal name of the individual, or the company's name, registration number and country.
- [ ] Postal address for legal notices (some laws require one in the privacy policy).
- [ ] Privacy contact email and support email (they may be the same). Then set `supportEmail` in
      `release.config.json`.
- [ ] Where the privacy policy and support page will be hosted (stable public URLs). Then set `privacyPolicyUrl`
      and `supportUrl` in `release.config.json`; the in-app links stay hidden in production builds while they're
      placeholders.
- [ ] Effective dates and version numbers.
- [ ] Email provider used for support, and where it stores messages; retention period for support emails.
- [ ] Whether you'll read Apple's crash/diagnostic reports in App Store Connect.
- [ ] Rights in all artwork (including any AI-assisted images) and the open-source licences to credit.
- [ ] Final app name, bundle identifier and tip product IDs (`release.config.json`).

## Factual checks against the build

- [ ] The release build makes no network requests except to Apple and RevenueCat when someone opens Support, or at
      launch while a tip is unfinished (privacy policy §2, §4, §6a); confirm with a proxy on a signed build.
- [ ] App Store "App Privacy" answers: **Purchases → Purchase History** collected (by RevenueCat), not linked to the
      user, not used for tracking, purpose App Functionality; nothing else (see TESTFLIGHT_CHECKLIST.md §2).
- [ ] Data list in policy §3 still matches `EXPORT_CONTAINS` (`src/core/dataExport.ts`) and Settings → Privacy & Data.
- [ ] In-app texts in `src/core/legal.ts` match `WELLNESS_DISCLAIMER.md` and `TERMS_OF_USE.md`.
- [ ] Once the Terms are final, set `LEGAL_READY.terms = true` (`src/core/legal.ts`) so production builds show them.

## Needs qualified legal review

- [ ] **Worldwide distribution:** which countries to list the app in; whether an EU and/or UK representative
      (GDPR Art. 27) is needed; US state privacy laws; consumer-law rules on warranty and liability limits.
- [ ] **Health-related data:** precautions (heart condition, pregnancy, etc.) are special-category data under GDPR
      Art. 9 and sensitive data under KVKK Art. 6. Confirm the controller role and legal basis when processing
      happens only on the user's device, and whether explicit consent or extra notices are needed.
- [ ] **KVKK (Türkiye):** whether an aydınlatma metni (information notice) in Turkish and VERBİS registration are
      required; the cross-border transfer position for support emails.
- [ ] **Age eligibility (18+):** that 18 is right in every target country (the age of majority is higher in a few),
      that a self-declared age band is enough (no verification, no date of birth), and the handling of Life Resets
      started at 16–17 before the minimum was raised (paused, kept, exportable and deletable).
- [ ] **Wellness claims:** that the app, its descriptions and the App Store listing stay outside medical-device
      rules (EU MDR, FDA general-wellness policy) and make no guaranteed-outcome claims.
- [ ] **Terms of Use:** v1.0 uses **Apple's standard EULA** (owner decision); our own Terms stay hidden until a
      lawyer approves them: governing law and courts; liability cap; Apple's minimum terms.
- [ ] **Tips (RevenueCat):** the privacy policy's tips section (§6a). RevenueCat, Inc. (US) processes an anonymous
      ID, tip purchase records and request metadata (IP address, app/iOS version, locale, storefront) for us:
      accept RevenueCat's DPA, confirm the processor role, the GDPR/KVKK transfer basis to the US, retention, and
      whether the KVKK notice must name it. Note that Delete my data can't clear the RevenueCat SDK's local cache
      (anonymous ID, recent purchases), present only after Support was opened.
- [ ] **Consumer law:** whether any information is needed for voluntary tips that Apple sells as merchant of record
      (Türkiye, EU).
- [ ] **Languages:** whether translated versions are needed (for example Turkish, German).
