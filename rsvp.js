(function () {
  const cfg = window.WEDDING_CONFIG || {};
  const supabaseUrl = cfg.supabaseUrl || "";
  const supabaseKey = cfg.supabaseAnonKey || "";
  const form = document.getElementById("rsvp-form");
  if (!form) return;

  /** Open RSVP — no per-guest codes for now */
  const OPEN_INVITE_CODE = "WEB";

  const inlineMsg = document.getElementById("rsvp-inline-msg");
  const confirmScreen = document.getElementById("confirm-screen");
  const stepsBar = document.querySelector(".steps");
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const submitBtn = document.getElementById("submitBtn");
  const sections = [...form.querySelectorAll(".rsvp-step")];
  const dots = [...document.querySelectorAll(".step-dot")];
  const attendChoices = [...document.querySelectorAll(".choice[data-attend]")];
  const attendingInput = document.getElementById("attending");
  const attendingFields = document.getElementById("attending-fields");
  const downloadInvitationBtn = document.getElementById("downloadInvitationBtn");
  const confirmPdfNote = document.getElementById("confirm-pdf-note");

  /** Last successful RSVP payload — used to regenerate the PDF on demand */
  let lastInvitationPayload = null;

  const pulsePortal = () => {
    document.body.classList.add("portal-in");
    window.setTimeout(() => document.body.classList.remove("portal-in"), 520);
  };

  let step = 1;

  const showInline = (msg, isInfo) => {
    if (!inlineMsg) return;
    inlineMsg.textContent = msg;
    inlineMsg.classList.remove("hidden");
    inlineMsg.classList.toggle("is-info", Boolean(isInfo));
  };

  const clearInline = () => {
    if (!inlineMsg) return;
    inlineMsg.textContent = "";
    inlineMsg.classList.add("hidden");
    inlineMsg.classList.remove("is-info");
  };

  const updateStep = () => {
    sections.forEach((sec, i) => sec.classList.toggle("active", i === step - 1));
    dots.forEach((dot, i) => dot.classList.toggle("active", i === step - 1));
    backBtn.classList.toggle("hidden", step === 1);
    nextBtn.classList.toggle("hidden", step === 3);
    /* Submit lives inside step 3 only — no toggle needed */
  };

  const deadline = new Date(cfg.rsvpDeadlineIso || "2026-08-01T23:59:59+03:00");
  if (Date.now() > deadline.getTime()) {
    showInline("RSVP period has ended. Thank you for your interest.", true);
    form.querySelectorAll("input,select,textarea,button").forEach((el) => {
      el.disabled = true;
    });
    return;
  }

  if (!supabaseUrl || !supabaseKey) {
    showInline("RSVP is temporarily unavailable. Please try again later.");
    form.querySelectorAll("button").forEach((b) => {
      b.disabled = true;
    });
    return;
  }

  const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

  const softClick = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = 440;
    g.gain.value = 0.00001;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.08);
    o.stop(ctx.currentTime + 0.08);
    setTimeout(() => ctx.close(), 160);
  };

  const wantsSeatsAndMeal = (v) => v === "yes" || v === "maybe";

  const defaultInvitationPdf = () => ({
    cardImageUrl: "./public/themugerwas3.jpeg",
    honorLine: "The honour of your presence is requested",
    coupleNames: "Tim & Rebecca",
    dateFormalLine: "Saturday, the twenty-ninth of August",
    yearFormalLine: "two thousand twenty-six",
    venueLine: "Speke Resort Munyonyo · Kampala",
    attireLine: "Black Tie · Evening reception",
  });

  /**
   * Fills the off-screen invitation card and renders a 5×7 in PDF (luxury print style).
   * @returns {Promise<boolean>}
   */
  const generateInvitationPdf = async (payload) => {
    if (typeof html2canvas !== "function" || (!window.jspdf?.jsPDF && !window.jsPDF)) {
      return false;
    }

    const ic = { ...defaultInvitationPdf(), ...(cfg.invitationPdf || {}) };
    const photo = document.getElementById("pdf-card-photo");
    const honorEl = document.getElementById("pdf-honor-line");
    const namesEl = document.getElementById("pdf-couple-names");
    const dateEl = document.getElementById("pdf-date-block");
    const guestEl = document.getElementById("pdf-guest-name");
    const rsvpHeadEl = document.getElementById("pdf-rsvp-headline");
    const rsvpDetailEl = document.getElementById("pdf-rsvp-detail");
    const partyEl = document.getElementById("pdf-party-line");
    const mealEl = document.getElementById("pdf-meal-line");
    const venueEl = document.getElementById("pdf-venue-block");
    const card = document.getElementById("pdf-invitation-card");

    if (!photo || !guestEl || !card || !venueEl || !honorEl || !namesEl || !dateEl || !rsvpHeadEl || !partyEl || !mealEl || !rsvpDetailEl) {
      return false;
    }

    honorEl.textContent = ic.honorLine;
    namesEl.textContent = ic.coupleNames;
    dateEl.textContent = "";
    const d1 = document.createElement("span");
    d1.style.display = "block";
    d1.textContent = ic.dateFormalLine;
    const d2 = document.createElement("span");
    d2.style.display = "block";
    d2.textContent = ic.yearFormalLine;
    dateEl.appendChild(d1);
    dateEl.appendChild(d2);
    guestEl.textContent = payload.full_name || "Guest";

    const att = payload.attending;
    let headline = "";
    let detail = "";
    if (att === "yes") {
      headline = "Joyfully accepts";
    } else if (att === "maybe") {
      headline = "Response noted";
      detail = "Tentative — plans may change";
    } else {
      headline = "With regrets";
      detail = "Unable to attend";
    }
    rsvpHeadEl.textContent = headline;
    if (detail && att !== "yes") {
      rsvpDetailEl.textContent = detail;
      rsvpDetailEl.classList.remove("hidden");
    } else {
      rsvpDetailEl.textContent = "";
      rsvpDetailEl.classList.add("hidden");
    }

    const showParty = wantsSeatsAndMeal(att);
    const n = Number(payload.guest_count || 0);
    if (showParty && n >= 1) {
      partyEl.textContent = n === 1 ? "Party of one" : `Party of ${n}`;
      partyEl.classList.remove("hidden");
    } else {
      partyEl.textContent = "";
      partyEl.classList.add("hidden");
    }

    if (showParty && payload.meal) {
      mealEl.textContent = `Dinner · ${payload.meal}`;
      mealEl.classList.remove("hidden");
    } else {
      mealEl.textContent = "";
      mealEl.classList.add("hidden");
    }

    venueEl.innerHTML = "";
    const v1 = document.createElement("span");
    v1.textContent = ic.venueLine;
    const v2 = document.createElement("span");
    v2.textContent = ic.attireLine;
    venueEl.appendChild(v1);
    venueEl.appendChild(v2);

    const resolvedImg = new URL(ic.cardImageUrl || defaultInvitationPdf().cardImageUrl, window.location.href).href;
    photo.crossOrigin = "anonymous";
    if (photo.src !== resolvedImg) {
      photo.src = resolvedImg;
    }
    await new Promise((resolve) => {
      const done = () => {
        photo.removeEventListener("load", done);
        photo.removeEventListener("error", done);
        resolve();
      };
      if (photo.complete && photo.naturalWidth > 0) {
        queueMicrotask(done);
        return;
      }
      photo.addEventListener("load", done, { once: true });
      photo.addEventListener("error", done, { once: true });
    });

    if (photo.decode) {
      try {
        await photo.decode();
      } catch {
        /* ignore */
      }
    }

    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = await html2canvas(card, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#050506",
      logging: false,
    });

    const PdfCtor = window.jspdf?.jsPDF || window.jsPDF;
    if (!PdfCtor) return false;
    const pdf = new PdfCtor({ orientation: "portrait", unit: "in", format: [5, 7] });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
    pdf.save("The-Mugerwas-Invitation.pdf");
    return true;
  };

  attendChoices.forEach((choice) => {
    choice.addEventListener("click", () => {
      attendChoices.forEach((item) => item.classList.remove("active"));
      choice.classList.add("active");
      attendingInput.value = choice.dataset.attend;
      attendingFields.classList.toggle("hidden", choice.dataset.attend === "no");
      if (choice.dataset.attend === "no") {
        mealCards.forEach((c) => c.classList.remove("active"));
        if (mealInput) mealInput.value = "";
      }
      softClick();
      pulsePortal();
    });
  });

  /** Seats (including yourself) — stepper updates hidden `guestCount` */
  const guestCountInput = document.getElementById("guestCount");
  const seatVal = document.getElementById("seat-val");
  const seatUp = document.getElementById("seat-up");
  const seatDown = document.getElementById("seat-down");
  const MIN_GUESTS = 1;
  const MAX_GUESTS = 40;

  const syncSeatButtons = () => {
    const n = Number(guestCountInput?.value || 1);
    if (seatDown) seatDown.disabled = n <= MIN_GUESTS;
    if (seatUp) seatUp.disabled = n >= MAX_GUESTS;
  };

  const setGuestCount = (raw) => {
    if (!guestCountInput || !seatVal) return;
    const v = Math.max(MIN_GUESTS, Math.min(MAX_GUESTS, Math.round(Number(raw))));
    guestCountInput.value = String(v);
    seatVal.textContent = String(v);
    syncSeatButtons();
  };

  if (guestCountInput && seatVal) {
    setGuestCount(guestCountInput.value || 1);
    seatUp?.addEventListener("click", () => setGuestCount(Number(guestCountInput.value || 1) + 1));
    seatDown?.addEventListener("click", () => setGuestCount(Number(guestCountInput.value || 1) - 1));
  }

  /** Meal preference cards → hidden `#meal` */
  const mealCards = [...document.querySelectorAll(".meal-card[data-meal]")];
  const mealInput = document.getElementById("meal");
  mealCards.forEach((card) => {
    card.addEventListener("click", () => {
      mealCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      mealInput.value = card.dataset.meal || "";
      softClick();
      pulsePortal();
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  /** Full name + email required on every submit */
  const validateIdentity = () => {
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    if (!fullName) {
      showInline("Please enter your full name.");
      return false;
    }
    if (!email) {
      showInline("Please enter your email address.");
      return false;
    }
    if (!isValidEmail(email)) {
      showInline("Please enter a valid email address.");
      return false;
    }
    return true;
  };

  const validateStep1 = async () => validateIdentity();

  const validateCurrentStep = async () => {
    clearInline();
    if (step === 1) return validateStep1();
    if (step === 2 && !attendingInput.value) {
      showInline("Please choose whether you will attend.");
      return false;
    }
    return true;
  };

  nextBtn.addEventListener("click", async () => {
    const ok = await validateCurrentStep();
    if (!ok) return;
    step += 1;
    updateStep();
    pulsePortal();
  });

  backBtn.addEventListener("click", () => {
    clearInline();
    step = Math.max(1, step - 1);
    updateStep();
    pulsePortal();
  });

  const defaultSubmitLabel = submitBtn.textContent.trim();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearInline();
    if (!validateIdentity()) return;
    if (!attendingInput.value) {
      showInline("Please choose whether you will attend.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const attending = attendingInput.value;
    const includePartyDetails = wantsSeatsAndMeal(attending);
    const phoneRaw = document.getElementById("phone").value.trim();
    const payload = {
      invite_id: null,
      invite_code: OPEN_INVITE_CODE,
      full_name: document.getElementById("fullName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: phoneRaw || null,
      attending,
      guest_count: includePartyDetails ? Number(document.getElementById("guestCount").value || 1) : 0,
      meal: includePartyDetails ? document.getElementById("meal").value || null : null,
      dietary: includePartyDetails ? document.getElementById("dietary").value.trim() || null : null,
      song: document.getElementById("song").value.trim() || null,
      message: document.getElementById("message").value.trim() || null,
      submitted_at: new Date().toISOString(),
    };

    const { error: insertErr } = await sb.from("rsvps").insert(payload);

    if (insertErr) {
      showInline(insertErr?.message || "Something went wrong. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = defaultSubmitLabel;
      return;
    }

    if (cfg.confirmationEmailEndpoint) {
      fetch(cfg.confirmationEmailEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    clearInline();
    if (stepsBar) stepsBar.hidden = true;
    form.hidden = true;
    lastInvitationPayload = payload;

    if (confirmScreen) {
      const msgEl = document.getElementById("confirm-msg");
      if (msgEl) {
        const lines = {
          yes: "We can’t wait to celebrate with you.",
          maybe:
            "We’ve noted that you’re not sure yet — we hope to see you, and you can always reach out if plans change.",
          no: "Thank you for letting us know. You’ll be missed.",
        };
        msgEl.textContent = lines[attending] || lines.no;
      }
      confirmScreen.classList.add("show");
    }

    submitBtn.disabled = false;
    submitBtn.textContent = defaultSubmitLabel;

    if (confirmPdfNote) confirmPdfNote.classList.add("hidden");
    if (downloadInvitationBtn) downloadInvitationBtn.classList.add("hidden");

    queueMicrotask(async () => {
      try {
        const ok = await generateInvitationPdf(payload);
        if (ok && confirmPdfNote) confirmPdfNote.classList.remove("hidden");
      } catch {
        /* PDF is optional */
      }
      if (downloadInvitationBtn) downloadInvitationBtn.classList.remove("hidden");
    });
  });

  if (downloadInvitationBtn) {
    downloadInvitationBtn.addEventListener("click", async () => {
      if (!lastInvitationPayload) return;
      downloadInvitationBtn.disabled = true;
      try {
        await generateInvitationPdf(lastInvitationPayload);
      } finally {
        downloadInvitationBtn.disabled = false;
      }
    });
  }

  updateStep();
})();
