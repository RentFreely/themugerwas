window.WEDDING_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY",
  rsvpDeadlineIso: "2026-08-01T23:59:59+03:00",
  expectedGuestTotal: 200,
  siteBaseUrl: "https://your-domain.com",
  confirmationEmailEndpoint: "/functions/v1/send-rsvp-confirmation",
  invitationPdf: {
    cardImageUrl: "./public/themugerwas2.jpeg",
    honorLine: "The honour of your presence is requested",
    coupleNames: "Your Names",
    dateFormalLine: "Saturday, the first of August",
    yearFormalLine: "two thousand twenty-six",
    venueLine: "Venue · City",
    attireLine: "Black Tie",
  },
};
