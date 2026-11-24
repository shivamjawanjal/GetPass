export const NAV_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'For every role', href: '#roles' },
  { label: 'Gate checks', href: '#gate-checks' },
];

export const HERO_COPY = {
  eyebrow: 'SXIET campus portal',
  headline: 'Request a gate pass. Get approval. Leave campus with a verified QR.',
  description:
    'Students submit leave details, hostel clerks review them, and security guards scan the pass at the gate. Every step is recorded in one place.',
  primaryCta: { label: 'Sign in to your portal', to: '/login' },
  secondaryCta: { label: 'See how it works', href: '#how-it-works' },
  note:
    'Use your college credentials. Student, clerk, guard and admin accounts are issued by the campus admin.',
};

export const REQUEST_PREVIEW = {
  title: 'Out-pass request',
  status: 'Pending review',
  reference: 'GP-2026-0418',
  fields: [
    { label: 'Student', value: 'Rahul Sharma' },
    { label: 'Roll number', value: 'CS2023045' },
    { label: 'Reason', value: 'Medical appointment' },
    { label: 'Expected return', value: 'Today, 6:30 PM' },
  ],
  timeline: [
    { title: 'Request submitted', detail: 'Student portal, 2:14 PM', state: 'done' },
    { title: 'Awaiting clerk review', detail: 'Hostel office queue', state: 'current' },
    { title: 'Gate verification', detail: 'Opens after approval', state: 'upcoming' },
  ],
};

export const GATE_PREVIEW = {
  title: 'Gate verification',
  result: 'Pass valid',
  reference: 'GP-2026-0418',
  rows: [
    { label: 'Student', value: 'Rahul Sharma' },
    { label: 'Approved by', value: 'Sunita Kulkarni, Clerk' },
    { label: 'Valid until', value: 'Today, 6:30 PM' },
  ],
  footer: 'Exit recorded at 2:41 PM',
};

export const GATE_CHECKS = {
  eyebrow: 'At the gate',
  title: 'A clear answer before the gate opens',
  description:
    'The guard scan shows who the pass belongs to, who approved it and when it expires. The exit is written to the audit log at the same moment.',
  points: [
    'Expired and reused passes are flagged at verification.',
    'Rejection reasons stay with the request for later review.',
    'Admins can export the full request and scan history.',
  ],
};

export const AUDIT_ROWS = [
  { time: '2:41 PM', student: 'Rahul Sharma', action: 'Exit verified', status: 'Valid' },
  { time: '2:05 PM', student: 'Amit Patil', action: 'Pass approved', status: 'Approved' },
  { time: '1:52 PM', student: 'Rahul Sharma', action: 'Request submitted', status: 'Pending' },
];

export const ROLE_CARDS = [
  {
    icon: 'GraduationCap',
    title: 'Students',
    description: 'Submit leave details, attach a reason and expected return time, then track the request status.',
    ui: { label: 'New out-pass request', detail: 'Reason, destination, return time' },
  },
  {
    icon: 'ClipboardCheck',
    title: 'Hostel clerks',
    description: 'Read each pending request, approve it or record a rejection reason in the review queue.',
    ui: { label: 'Pending approvals', detail: 'Requests waiting for a decision' },
  },
  {
    icon: 'ScanLine',
    title: 'Security guards',
    description: 'Scan the QR code at the gate and see whether the pass is valid before allowing exit.',
    ui: { label: 'Scan result', detail: 'Valid pass with student details' },
  },
  {
    icon: 'ShieldCheck',
    title: 'Campus admins',
    description: 'Manage users, review gate records and export reports from a single admin view.',
    ui: { label: 'Audit log', detail: 'Requests, approvals and gate scans' },
  },
];

export const WORKFLOW_STEPS = [
  {
    number: '01',
    title: 'Submit the request',
    description: 'The student enters the leave reason, destination and expected return time. The request is saved with a reference number.',
    ui: 'Request form',
  },
  {
    number: '02',
    title: 'Review and decide',
    description: 'A hostel clerk sees the request in the pending queue and records an approval or a rejection reason.',
    ui: 'Review queue',
  },
  {
    number: '03',
    title: 'Scan at the gate',
    description: 'After approval, the student shows the QR pass. The guard scans it and the exit is logged immediately.',
    ui: 'Verification screen',
  },
];

export const FOOTER_LINKS = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms & Conditions', to: '/terms' },
];

export const LEGAL_PAGES = {
  privacy: {
    title: 'Privacy Policy',
    intro:
      'This policy explains what the SXIET Digital Gate Pass portal records about you and why the college needs it.',
    sections: [
      {
        heading: 'Information we record',
        body:
          'The portal stores your name, roll number, department, leave reason, destination, expected return time, request status and the timestamps for approvals and gate scans.',
      },
      {
        heading: 'How we use it',
        body:
          'This information is used to review out-pass requests, generate QR passes, verify exits at the gate and keep an audit trail for campus security.',
      },
      {
        heading: 'Who can see it',
        body:
          'Access is limited to the account types the college assigns: students see their own requests, clerks see requests assigned for review, guards see verification results, and admins manage records and reports.',
      },
      {
        heading: 'Retention and questions',
        body:
          'Records are kept according to college policy. To ask about your records or request a correction, contact the portal administrator using the email address in the footer.',
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro:
      'These terms cover the use of the SXIET Digital Gate Pass portal by students, staff and security personnel.',
    sections: [
      {
        heading: 'Authorised use',
        body:
          'Sign in with the credentials issued to you by the college. Do not share your account or use another person’s account to submit, approve or verify a pass.',
      },
      {
        heading: 'Accurate requests',
        body:
          'Provide correct leave details and return times. A pass is valid only for the student, date and time window shown on the verified record.',
      },
      {
        heading: 'QR passes',
        body:
          'The QR code is the gate credential. Copying, altering or reusing a pass outside its approved window is not permitted and may be reviewed by the college.',
      },
      {
        heading: 'Availability',
        body:
          'The portal may be unavailable during maintenance. If the gate verification screen cannot be reached, follow the campus manual fallback procedure.',
      },
    ],
  },
};
