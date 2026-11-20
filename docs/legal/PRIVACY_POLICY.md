# Schwung Privacy Policy

> **DRAFT, not legally reviewed and not published.** Items marked `TODO` need the founder's details or a
> decision. See `LEGAL_REVIEW_CHECKLIST.md` before publishing.

**Effective date:** TODO
**Version:** draft 2 (facts checked against the app's code; see `../FINAL_LEGAL_READINESS.md`)

## 1. Who we are

Schwung is a free iPhone app for building everyday habits through a 66-day "Life Reset". It is made and operated by:

- **Operator:** TODO (founder's full legal name, or the legal entity's name and registration number)
- **Address:** TODO (postal address)
- **Contact:** TODO (privacy contact email)
- **EU / UK representative:** TODO (only if required; see the checklist)

In this policy, "we" means the operator above and "you" means the person using Schwung.

## 2. The short version

- Schwung works on your iPhone. **There is no account, no sign-in and no Schwung server** that receives your habits,
  answers or progress.
- Everything you enter is **stored on your device**. We (the developer) can't see it, and we don't receive a copy.
- Schwung has **no advertising, no analytics, no tracking and no third-party data sharing**; the only outside
  service is RevenueCat, for optional tips (section 6a).
- You can **export** everything Schwung keeps and **delete** it at any time in **Settings → Privacy & Data**.
- Data reaches us only if **you choose** to send it to us, for example by emailing us.
- **Tips are optional**, paid through Apple and handled with **RevenueCat**, a purchase service. It receives an
  anonymous ID and your tip purchases, never your name or payment details, and only when you open Support or a tip is
  unfinished (section 6a).

## 3. Data stored on your device

Schwung keeps the following on your iPhone, inside the app's private storage, to run your Life Reset:

| What                | Examples                                                                                                                                              | Why                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Set-up answers      | Your **age band** (not your exact age), minutes a day you have, phone-use estimate, usual wake time, active days, the skill you want to practise      | To size each habit to you                                                  |
| Health precautions  | Optional answers such as joint problems, difficulty walking, a heart condition, pregnancy, a fluid limit or a sleep condition; or "prefer not to say" | To keep suggested targets gentle and safe; never used for anything else    |
| Habits              | The habits you chose, habits you created yourself (their names and schedules) and their targets                                                       | To show and adjust your plan                                               |
| Progress            | Which days and habits you completed, streaks, statistics, milestones                                                                                  | To show your progress, the trail and Insights                              |
| Reflections         | Your answers to weekly reflection questions                                                                                                           | To show them back to you and suggest adjustments only when you accept them |
| Screen Time entries | Numbers you type in from iOS Screen Time (Schwung can't read Screen Time itself)                                                                      | To show your trend for the Less Scrolling habit                            |
| XP and collectibles | Points earned and objects unlocked                                                                                                                    | The game layer of the app                                                  |
| Preferences         | Light or dark appearance, reminder times, whether reminders may name a habit, whether "welcome back" messages are on                                  | To respect your choices                                                    |
| Recovery copies     | If a save can't be read (for example after an interrupted update), the unreadable copy is kept instead of being deleted                               | So your data is never silently lost                                        |

Some of this, especially the health precautions, can be **health-related information**. Answering is optional: you
can choose "Rather not say", which the app treats as unknown, never as "no limitations". The answers stay on your
device and are used only to make suggested targets gentler where needed. They're never used for advertising,
marketing or anything else, and never sent to RevenueCat or anyone else. You can change them when you start a new
Life Reset or a New Ascent, and remove them at any time with **Delete my data**.

**Data transmitted to us:** none of the above. Schwung has no feature that uploads it.

## 4. How processing works, and third-party software

All of Schwung's processing (planning targets, counting streaks, charts) happens on your iPhone. The only exception
is tips (section 6a).

Schwung is built with open-source software components, including Expo and React Native modules (for example for
storage, notifications, file sharing and saving images). These run **inside the app on your device**. In Schwung
they are not configured to send your data to anyone, and Schwung contains no advertising or analytics SDKs. Schwung's
own Apple privacy manifest declares no tracking and no collected data; the RevenueCat SDK's manifest declares one
type, purchase history, not linked to you and not used for tracking, for app functionality (section 6a). Schwung
doesn't use iCloud storage (CloudKit or iCloud Drive) for your data.

**Apple.** Downloading the app from the App Store, iCloud and device backups, and crash or usage reports you choose to
share with app developers in iOS settings are handled by Apple under Apple's own privacy policy. If you opt in to
sharing such reports, Apple may make anonymised crash and diagnostic information available to us through App Store
Connect. TODO (founder): confirm whether you will review these reports.

## 5. Notifications

Reminders are optional and **off until you turn them on**. iOS asks for your permission first.

- Reminders are **scheduled on your device** by iOS. They're not sent through a server and Schwung doesn't use push
  notifications.
- By default, reminders don't name your habits. If you turn on naming habits, a habit's name can appear **on your
  lock screen**, where other people may see it.
- You can change or turn off reminders in Schwung's Settings, or turn off notifications in iOS Settings.

## 6. Photos, exports, sharing and the 66-Day Story

- **66-Day Story:** Schwung can make an image summarising your Life Reset. It's created on your device.
- **Saving to Photos:** only when you tap save. iOS asks for permission to **add** images to your library. Schwung
  doesn't ask to read or browse your photos.
- **Sharing and exporting:** when you share a story image or export your data, iOS's share sheet opens and **you
  choose** where it goes (for example Messages, Mail or Files). The recipient or service you choose handles it under
  its own terms. Schwung doesn't send it anywhere by itself.
- **Data export:** a JSON file containing everything listed in section 3. It may include health-related answers, so
  please keep it safe.
- Temporary files made for sharing are deleted shortly after the share sheet closes, or the next time the app opens.

## 6a. Tips (In-App Purchase, Apple and RevenueCat)

Schwung is free. You can leave an optional tip in **Settings → Support**. A tip doesn't unlock anything or change how
the app works.

- **Apple** sells and processes tips through the App Store's In-App Purchase, under Apple's terms and privacy policy.
  Apple handles your payment method, billing address and receipts. We never receive your payment details.
- **RevenueCat** (RevenueCat, Inc., United States) is the service the app uses to show tip prices, complete tips and
  confirm them with Apple. It acts for us as a processor. When the app talks to RevenueCat it sends:
  - a random, anonymous ID that RevenueCat creates for this installation (not your name, email or Apple ID);
  - your tip purchases (which tip, transaction details from Apple such as the transaction ID, date, price and
    currency, and your App Store country);
  - technical information that comes with any request, such as the app version, iOS version, device language and
    your IP address.

  The app doesn't send RevenueCat any of your habits, answers, health precautions or progress, doesn't set
  attribution or device identifiers, and turns RevenueCat's diagnostics off. RevenueCat handles this data under its
  own privacy policy and our agreement with it. TODO (founder): link RevenueCat's privacy policy and data processing
  agreement once accepted, and state the retention period RevenueCat applies.
- **When the app contacts RevenueCat:** only when you open Support, and at launch while a tip is unfinished (waiting
  for approval, or interrupted) so it can be completed. Once Support has been opened, RevenueCat also refreshes
  while the app stays open that time. If you never open Support, nothing is sent.
- **On your device:** while a tip is unfinished, the app keeps a small note that one is in progress and since when,
  so it can finish it; the note is removed once the tip is settled, after 7 days at most, or by Delete my data. Apart
  from that, the app keeps no record of tips. Tips aren't in your data export. The RevenueCat SDK may keep its own
  cache (the anonymous ID and recent purchase information) in the app's storage on your device, but only if you
  have opened Support. Delete my data can't clear that cache (the SDK offers no way to); deleting the app removes it.
- **What we see:** in RevenueCat's and Apple's dashboards we can see anonymous purchase records and sales reports
  (for example the number of tips, their prices and countries). We can't link them to you unless you contact us.
- **Refunds** are handled by Apple (reportaproblem.apple.com), under Apple's terms and your statutory rights.
- **International transfer:** RevenueCat processes data in the United States. TODO (legal review): the transfer basis
  under GDPR and KVKK.

## 7. Storage, backups and retention

- Your data is kept in Schwung's private storage on your device **until you delete it**.
- **Device backups:** if iCloud Backup or computer backups are on, iOS may include Schwung's data in them, as it does
  for most apps. Those backups are managed by Apple or by your computer, not by us.
- **Ending a Life Reset** (Settings) deletes that program's days and progress. Your preferences remain.
- **Delete my data** (Settings → Privacy & Data) deletes everything Schwung keeps on your device, including recovery
  copies, reminders and temporary files. It can't be undone. Images you saved to Photos stay in Photos.
- **Deleting the app** removes its data from your device. Copies in existing backups follow your backup settings.
- **Emails you send us** are kept only as long as needed to answer and follow up. TODO (founder): set a retention
  period (for example 12 months).

## 8. Your choices and rights

Because your data is on your device, you control it directly:

- **Access and portability:** Settings → Privacy & Data → Export my data. To move to a new phone, choose that
  file with Restore from backup; it's read on the phone and never uploaded.
- **Correction:** edit your habits and settings in the app. Set-up and health answers can be changed when you start a
  new Life Reset or a New Ascent.
- **Deletion:** Settings → Privacy & Data → Delete my data, or delete the app.
- **Withdraw permissions:** turn off notifications or Photos access in iOS Settings at any time.

Depending on where you live, you may have further rights over personal data we hold about you (for example
messages you sent us). These can include the right to access, correct, delete, restrict or object to processing,
to data portability, and to complain to a data protection authority.

- **EU / EEA:** the supervisory authority in your country.
- **United Kingdom:** the Information Commissioner's Office (ICO).
- **Türkiye:** the Personal Data Protection Authority (KVKK Kurumu), under Law No. 6698 on the Protection of
  Personal Data (KVKK).

To make a request, contact us at TODO (privacy contact email). We may need to confirm the request comes from you.
We can't access or delete data that exists only on your device; you can do that yourself as described above.

## 9. Legal bases (EU / UK GDPR and KVKK)

- **Data on your device:** Schwung processes it on your device to provide the app you asked to use. We don't
  receive it. TODO (legal review): confirm how the controller role and legal basis apply to on-device-only
  processing, including health-related answers.
- **Tips:** the data RevenueCat processes for us (section 6a) is used to complete the purchase you ask for and to
  confirm it with Apple (proposed bases, for legal review: GDPR Art. 6(1)(b), performance of a contract; KVKK
  Art. 5(2)(c)), and to keep sales records we may be legally required to keep (GDPR Art. 6(1)(c); KVKK Art. 5(2)(ç)).
- **Messages you send us:** we use them to answer you, based on our legitimate interest in responding to enquiries
  (KVKK: Article 5(2)(f)), or to take steps you request.
- We don't sell personal data, use it for advertising, or make automated decisions with legal or similarly
  significant effects. Schwung's habit suggestions are guidance you can change.
- **International transfers:** we don't transfer your app data, because we don't receive it. If you email us, your
  message is handled by our email provider: TODO (provider and where it stores data).

## 9a. Information notice under KVKK Article 10 (Türkiye)

- **Data controller:** the operator in section 1.
- **Purposes:** providing the app on your device (sections 3–6); completing optional tips (section 6a); answering
  messages you send us (section 9).
- **Recipients:** RevenueCat, Inc. (United States) as our processor for tips; Apple for App Store purchases; our email
  provider for messages. No one else.
- **Method and legal basis of collection:** by electronic means, through the app (tips) and through email you choose
  to send; the bases are in section 9. Data you enter in the app is processed only on your device.
- **Transfers abroad:** tip data to RevenueCat in the United States. TODO (legal review): the safeguard used under
  KVKK Article 9 as amended by Law No. 7499 (for example standard contracts notified to the Authority).
- **Your rights under KVKK Article 11:** to learn whether personal data about you is processed and request
  information about it; to learn the purpose and whether it's used accordingly; to know the recipients in Türkiye
  and abroad; to ask for correction, deletion or destruction and for recipients to be told; to object to an outcome
  against you that arises only from automated analysis; and to claim compensation for damage from unlawful
  processing. Send requests to the contact in section 1; we answer within 30 days, free of charge as a rule.

TODO (legal review): whether this notice must also be published in Turkish.

## 10. Age

Schwung is intended for people **18 and older**. During set-up the app asks for an age band (never a date of birth)
and doesn't let someone under 18 continue. A Life Reset started under 18 before the minimum age was raised stays on
the phone but is paused: it can be exported or deleted at any time. If you believe a person under 18 has sent us
personal data, contact us and we'll delete it.

## 11. Security

Your data stays inside the app's private storage, protected by iOS's app sandbox and device encryption when your
iPhone is locked with a passcode. Please use a device passcode and keep any exported files safe.

## 12. Changes

If this policy changes, we'll update the effective date and, for important changes, tell you in the app or on the
App Store listing.

## 13. Contact

TODO (operator name), TODO (address), TODO (privacy contact email).
