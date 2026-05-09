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

  attendChoices.forEach((choice) => {
    choice.addEventListener("click", () => {
      attendChoices.forEach((item) => item.classList.remove("active"));
      choice.classList.add("active");
      attendingInput.value = choice.dataset.attend;
      attendingFields.classList.toggle("hidden", choice.dataset.attend === "no");
      softClick();
      pulsePortal();
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

    const { data: inserted, error: insertErr } = await sb
      .from("rsvps")
      .insert(payload)
      .select("id")
      .single();

    if (insertErr || !inserted) {
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
  });

  updateStep();
})();
