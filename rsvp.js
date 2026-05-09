(function () {
  const cfg = window.WEDDING_CONFIG || {};
  const supabaseUrl = cfg.supabaseUrl || "";
  const supabaseKey = cfg.supabaseAnonKey || "";
  const form = document.getElementById("rsvp-form");
  if (!form) return;

  const alertBox = document.getElementById("rsvp-alert");
  const errBox = document.getElementById("rsvp-error");
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const submitBtn = document.getElementById("submitBtn");
  const sections = [...form.querySelectorAll("section[data-step]")];
  const dots = [...document.querySelectorAll(".step-dot")];
  const attendChoices = [...document.querySelectorAll(".choice[data-attend]")];
  const attendingInput = document.getElementById("attending");
  const attendingFields = document.getElementById("attending-fields");
  const pulsePortal = () => {
    document.body.classList.add("portal-in");
    window.setTimeout(() => document.body.classList.remove("portal-in"), 520);
  };

  let step = 1;
  let inviteMeta = null;

  const showError = (msg) => {
    errBox.textContent = msg;
    errBox.classList.remove("hidden");
  };
  const clearError = () => errBox.classList.add("hidden");
  const showInfo = (msg) => {
    alertBox.textContent = msg;
    alertBox.classList.remove("hidden");
  };

  const updateStep = () => {
    sections.forEach((sec, i) => sec.classList.toggle("hidden", i !== step - 1));
    dots.forEach((dot, i) => dot.classList.toggle("active", i === step - 1));
    backBtn.classList.toggle("hidden", step === 1);
    nextBtn.classList.toggle("hidden", step === 3);
    submitBtn.classList.toggle("hidden", step !== 3);
  };

  const queryCode = new URLSearchParams(window.location.search).get("guest");
  if (queryCode) {
    document.getElementById("inviteCode").value = queryCode;
  }

  const deadline = new Date(cfg.rsvpDeadlineIso || "2026-08-01T23:59:59+03:00");
  if (Date.now() > deadline.getTime()) {
    showInfo("RSVP period has ended. Thank you for your interest.");
    form.querySelectorAll("input,select,textarea,button").forEach((el) => (el.disabled = true));
    return;
  }

  if (!supabaseUrl || !supabaseKey) {
    showError("Supabase is not configured. Add keys in config.js before collecting real RSVPs.");
    form.querySelectorAll("button").forEach((b) => (b.disabled = true));
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

  attendChoices.forEach((choice) => {
    choice.addEventListener("click", () => {
      attendChoices.forEach((item) => item.classList.remove("active"));
      choice.classList.add("active");
      attendingInput.value = choice.dataset.attend;
      attendingFields.classList.toggle("hidden", choice.dataset.attend !== "yes");
      softClick();
      pulsePortal();
    });
  });

  const validateStep1 = async () => {
    const inviteCode = document.getElementById("inviteCode").value.trim();
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    if (!inviteCode || !fullName || !email) {
      showError("Invitation code, full name, and email are required.");
      return false;
    }

    const { data, error } = await sb
      .from("guest_invites")
      .select("id, code, guest_name, is_used, rsvp_id")
      .eq("code", inviteCode)
      .single();

    if (error || !data) {
      showError("That invitation code was not found.");
      return false;
    }

    if (data.is_used) {
      showError("This invitation code has already been used.");
      return false;
    }

    inviteMeta = data;
    if (data.guest_name && !fullName) {
      document.getElementById("fullName").value = data.guest_name;
    }
    return true;
  };

  const validateCurrentStep = async () => {
    clearError();
    if (step === 1) return validateStep1();
    if (step === 2 && !attendingInput.value) {
      showError("Please choose whether you will attend.");
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
    clearError();
    step = Math.max(1, step - 1);
    updateStep();
    pulsePortal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    const ok = await validateCurrentStep();
    if (!ok || !inviteMeta) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    const attending = attendingInput.value === "yes";
    const payload = {
      invite_id: inviteMeta.id,
      invite_code: inviteMeta.code,
      full_name: document.getElementById("fullName").value.trim(),
      email: document.getElementById("email").value.trim(),
      attending,
      guest_count: attending ? Number(document.getElementById("guestCount").value || 1) : 0,
      meal: attending ? (document.getElementById("meal").value || null) : null,
      dietary: attending ? (document.getElementById("dietary").value.trim() || null) : null,
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
      showError(insertErr?.message || "Failed to submit RSVP.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit RSVP";
      return;
    }

    await sb
      .from("guest_invites")
      .update({ is_used: true, rsvp_id: inserted.id })
      .eq("id", inviteMeta.id);

    if (cfg.confirmationEmailEndpoint) {
      fetch(cfg.confirmationEmailEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }

    alertBox.classList.remove("hidden");
    alertBox.textContent = "Thank you! Your RSVP was submitted successfully.";
    form.reset();
    attendChoices.forEach((item) => item.classList.remove("active"));
    attendingFields.classList.remove("hidden");
    step = 1;
    updateStep();
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit RSVP";
  });

  updateStep();
})();
