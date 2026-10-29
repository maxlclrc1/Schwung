/*
 * The in-app legal texts (Settings → About), as sections of plain paragraphs. They mirror docs/legal/: change both
 * together. The wellness note is final wording; the Terms are a draft with TODOs, so they're shown only in
 * development and internal builds until LEGAL_READY.terms is set (docs/legal/LEGAL_REVIEW_CHECKLIST.md).
 */

export type LegalSection = { heading?: string; body: string[] };
export type LegalDoc = { title: string; sections: LegalSection[] };

/** Set each to true only once its text is final and reviewed (no TODOs left). */
export const LEGAL_READY = { terms: false } as const;

export const WELLNESS: LegalDoc = {
  title: 'Wellness note',
  sections: [
    {
      body: [
        'Schwung is here to help you build everyday habits and look after your general wellbeing. It isn’t a medical device, and it doesn’t diagnose, treat or prevent any condition.',
      ],
    },
    {
      heading: 'General guidance, not medical advice',
      body: [
        'Suggestions about movement, strength training, sleep, screen time and other habits are general guidance. They aren’t tailored medical, fitness or mental-health advice, even when Schwung adjusts them to your answers.',
        'If you have a health condition, an injury, are pregnant, take medication, or aren’t sure an activity is right for you, talk to a doctor or another qualified professional before starting or changing it, and follow their advice over Schwung’s.',
      ],
    },
    {
      heading: 'Listen to your body',
      body: [
        'Stop and seek help if you feel pain, dizziness, chest discomfort, shortness of breath or anything that worries you. Rest days and easier days are part of the program, never a failure.',
      ],
    },
    {
      heading: 'About the 66 days',
      body: [
        'The 66 days give the Life Reset its shape. Research suggests habits can take very different amounts of time to settle, from a few weeks to many months, so the timing will be your own. Finishing the program doesn’t guarantee a habit is formed, and taking longer is normal.',
      ],
    },
    {
      heading: 'If you need support',
      body: [
        'Schwung can’t help in an emergency. If you’re in crisis or think you may be in danger, contact your local emergency number or a crisis service near you.',
        'Schwung is for people 16 and older.',
      ],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: 'Terms of Use',
  sections: [
    {
      body: [
        'DRAFT: not final. Shown in test builds only.',
        'These terms apply to your use of Schwung, a free iPhone app made by TODO (operator). By using Schwung you agree to them.',
      ],
    },
    {
      heading: 'Eligibility',
      body: ['Schwung is for people 16 and older.'],
    },
    {
      heading: 'What Schwung is',
      body: [
        'A free habit-building app with no account, subscription, advertising or in-app purchases. It supports general wellness and isn’t a medical service: see the Wellness note.',
      ],
    },
    {
      heading: 'Your licence',
      body: [
        'A personal, non-exclusive, non-transferable, revocable licence to use Schwung on your own Apple devices for non-commercial use. Please don’t copy, resell or reverse engineer the app except as the law allows, or use it to harm others.',
      ],
    },
    {
      heading: 'Our content and artwork',
      body: [
        'The design, text, illustrations, collectibles, programs and software belong to us or our licensors. Story images you make are for your personal use and sharing.',
      ],
    },
    {
      heading: 'Your content',
      body: [
        'Habits you create, reflections and other entries are yours and stay on your device. We don’t receive them and can’t recover them; export your data to keep a copy.',
      ],
    },
    {
      heading: 'Availability, warranty and liability',
      body: [
        'We may change or stop offering Schwung. It’s provided as is, without promising any particular result. To the extent the law allows, we aren’t liable for indirect loss or loss of data on your device. Nothing limits liability that can’t be limited by law or affects your consumer rights.',
      ],
    },
    {
      heading: 'Apple',
      body: [
        'These terms are between you and us, not Apple. Apple has no responsibility for the app or its support, and Apple and its subsidiaries may enforce these terms as third-party beneficiaries.',
      ],
    },
    {
      heading: 'Applicable law',
      body: ['TODO (legal review). You keep the protection of the mandatory consumer laws where you live.'],
    },
    {
      heading: 'Contact',
      body: ['TODO (operator name, address, support email).'],
    },
  ],
};
