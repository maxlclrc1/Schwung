# Legal review checklist

The documents in this folder are **drafts**. They haven't been reviewed or approved by a lawyer and must not be
published or relied on until the items below are settled.

## Founder details (fill every `TODO`)

- [ ] Operator: full legal name of the individual, or the company's name, registration number and country.
- [ ] Postal address for legal notices (some laws require one in the privacy policy).
- [ ] Privacy contact email and support email (they may be the same). Then set `CONTACT_EMAIL` in
      `src/lib/constants.ts`.
- [ ] Where the privacy policy will be hosted (a stable public URL). Then set `PRIVACY_URL` in
      `src/lib/constants.ts`; the in-app link stays hidden in production builds while it's a placeholder.
- [ ] Effective dates and version numbers.
- [ ] Email provider used for support, and where it stores messages; retention period for support emails.
- [ ] Whether you'll read Apple's crash/diagnostic reports in App Store Connect.
- [ ] Rights in all artwork (including any AI-assisted images) and the open-source licences to credit.
- [ ] Final bundle identifier (Phase 2C, H2).

## Factual checks against the build

- [ ] The release build makes no network requests (privacy policy §2, §4); confirm with a proxy on a signed build.
- [ ] App Store "App Privacy" answers: **Data Not Collected**, matching the privacy manifest.
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
- [ ] **Age eligibility (16+):** whether 16 is right in every target country (digital-consent ages vary from 13 to
      16 in the EU; COPPA in the US applies under 13), and whether 16–17-year-olds need parental involvement.
- [ ] **Wellness claims:** that the app, its descriptions and the App Store listing stay outside medical-device
      rules (EU MDR, FDA general-wellness policy) and make no guaranteed-outcome claims.
- [ ] **Terms of Use:** governing law and courts; liability cap; Apple's minimum terms (or use Apple's standard
      EULA instead).
- [ ] **Languages:** whether translated versions are needed (for example Turkish, German).
