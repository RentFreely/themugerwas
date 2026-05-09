(function () {
  const cfg = window.WEDDING_CONFIG || {};
  const err = document.getElementById("dash-error");
  const loginSection = document.getElementById("loginSection");
  const dashSection = document.getElementById("dashSection");
  const rowsEl = document.getElementById("rsvpRows");
  const expected = Number(cfg.expectedGuestTotal || 200);

  const showError = (msg) => {
    err.textContent = msg;
    err.classList.remove("hidden");
  };
  const clearError = () => err.classList.add("hidden");

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    showError("Supabase config missing in config.js.");
    return;
  }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  let allRows = [];
  let refreshTimer = 0;

  const attendanceKey = (r) => {
    const a = r.attending;
    if (a === true || a === "yes") return "yes";
    if (a === "maybe") return "maybe";
    return "no";
  };

  const statusLabel = (r) => {
    const k = attendanceKey(r);
    if (k === "yes") return { cls: "ok", label: "Accept" };
    if (k === "maybe") return { cls: "maybe", label: "Maybe" };
    return { cls: "no", label: "Declined" };
  };

  const compute = (rows) => {
    const yes = rows.filter((r) => attendanceKey(r) === "yes").length;
    const maybe = rows.filter((r) => attendanceKey(r) === "maybe").length;
    const no = rows.filter((r) => attendanceKey(r) === "no").length;
    const seats = rows
      .filter((r) => {
        const k = attendanceKey(r);
        return k === "yes" || k === "maybe";
      })
      .reduce((a, r) => a + Number(r.guest_count || 0), 0);
    document.getElementById("kTotal").textContent = rows.length;
    document.getElementById("kYes").textContent = yes;
    document.getElementById("kMaybe").textContent = maybe;
    document.getElementById("kNo").textContent = no;
    document.getElementById("kSeats").textContent = seats;
    document.title = `Dashboard (${rows.length}/${expected}) — The Mugerwas`;
  };

  const render = (rows) => {
    rowsEl.innerHTML = rows
      .map(
        (r) => {
          const st = statusLabel(r);
          return `<tr data-id="${r.id}">
          <td>${r.full_name || ""}</td>
          <td>${r.email || ""}</td>
          <td>${r.phone || "—"}</td>
          <td><span class="badge ${st.cls}">${st.label}</span></td>
          <td>${r.guest_count || 0}</td>
          <td>${r.meal || "—"}</td>
          <td>
            <button class="btn btn-inline" data-edit="${r.id}">Edit</button>
            <button class="btn btn-inline" data-delete="${r.id}">Delete</button>
          </td>
        </tr>`;
        },
      )
      .join("");
  };

  const load = async () => {
    clearError();
    const { data, error } = await sb.from("rsvps").select("*").order("submitted_at", { ascending: false });
    if (error) {
      showError(error.message);
      return;
    }
    allRows = data || [];
    compute(allRows);
    filter();
  };

  const filter = () => {
    const q = (document.getElementById("searchInput").value || "").trim().toLowerCase();
    const filtered = allRows.filter((r) =>
      !q ||
      (r.full_name || "").toLowerCase().includes(q) ||
      (r.email || "").toLowerCase().includes(q) ||
      String(r.phone || "")
        .toLowerCase()
        .includes(q),
    );
    render(filtered);
  };

  const requireSession = async () => {
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      loginSection.classList.remove("hidden");
      dashSection.classList.add("hidden");
      window.clearInterval(refreshTimer);
      return false;
    }
    loginSection.classList.add("hidden");
    dashSection.classList.remove("hidden");
    await load();
    window.clearInterval(refreshTimer);
    refreshTimer = window.setInterval(load, 30000);
    return true;
  };

  document.getElementById("loginBtn").addEventListener("click", async () => {
    clearError();
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPass").value;
    if (!email || !password) return showError("Enter email and password.");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return showError(error.message);
    await requireSession();
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    await requireSession();
  });
  document.getElementById("refreshBtn").addEventListener("click", () => load());
  document.getElementById("searchInput").addEventListener("input", filter);
  document.getElementById("csvBtn").addEventListener("click", () => {
    const headers = ["full_name", "email", "phone", "attending", "guest_count", "meal", "dietary", "song", "message", "submitted_at"];
    const csv = [
      headers.join(","),
      ...allRows.map((r) =>
        headers
          .map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "the_mugerwas_rsvps.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  rowsEl.addEventListener("click", async (e) => {
    const editId = e.target.getAttribute("data-edit");
    const delId = e.target.getAttribute("data-delete");
    if (editId) {
      const row = allRows.find((r) => r.id === editId);
      if (!row) return;
      const meal = prompt("Update meal", row.meal || "");
      if (meal === null) return;
      const { error } = await sb.from("rsvps").update({ meal }).eq("id", editId);
      if (error) showError(error.message);
      await load();
    }
    if (delId) {
      if (!confirm("Delete this RSVP?")) return;
      const { error } = await sb.from("rsvps").delete().eq("id", delId);
      if (error) showError(error.message);
      await load();
    }
  });

  requireSession();
})();
