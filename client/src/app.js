const state = {
  authMode: "login",
  token: localStorage.getItem("dosewise_token"),
  user: null,
  medicines: [],
  appointments: [],
  notes: []
};

const els = {
  authScreen: document.querySelector("#authScreen"),
  appShell: document.querySelector("#appShell"),
  authForm: document.querySelector("#authForm"),
  authName: document.querySelector("#authName"),
  authEmail: document.querySelector('input[name="email"]'),
  authPassword: document.querySelector('input[name="password"]'),
  authSubmit: document.querySelector("#authSubmit"),
  authToggle: document.querySelector("#authToggle"),
  authFeedback: document.querySelector("#authFeedback"),
  profileName: document.querySelector("#profileName"),
  logoutButton: document.querySelector("#logoutButton"),
  medicineForm: document.querySelector("#medicineForm"),
  medicineFeedback: document.querySelector("#medicineFeedback"),
  medicineSearch: document.querySelector("#medicineSearch"),
  medicineStatusFilter: document.querySelector("#medicineStatusFilter"),
  medicineDateFilter: document.querySelector("#medicineDateFilter"),
  medicineResultCount: document.querySelector("#medicineResultCount"),
  appointmentForm: document.querySelector("#appointmentForm"),
  appointmentFeedback: document.querySelector("#appointmentFeedback"),
  appointmentSearch: document.querySelector("#appointmentSearch"),
  appointmentDateFilter: document.querySelector("#appointmentDateFilter"),
  appointmentResultCount: document.querySelector("#appointmentResultCount"),
  noteForm: document.querySelector("#noteForm"),
  noteFeedback: document.querySelector("#noteFeedback"),
  noteSearch: document.querySelector("#noteSearch"),
  noteMoodFilter: document.querySelector("#noteMoodFilter"),
  noteResultCount: document.querySelector("#noteResultCount"),
  medicineList: document.querySelector("#medicineList"),
  appointmentList: document.querySelector("#appointmentList"),
  noteList: document.querySelector("#noteList"),
  confirmModal: document.querySelector("#confirmModal"),
  confirmTitle: document.querySelector("#confirmTitle"),
  confirmMessage: document.querySelector("#confirmMessage"),
  confirmCancel: document.querySelector("#confirmCancel"),
  confirmDelete: document.querySelector("#confirmDelete"),
  toast: document.querySelector("#toast")
};

let pendingDelete = null;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function setDefaultDates() {
  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) {
      input.value = today();
    }
  });
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    headers,
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function setFeedback(element, message = "", type = "error") {
  element.textContent = message;
  element.className = `form-feedback ${message ? `show ${type}` : ""}`;
}

function setSubmitting(form, isSubmitting, loadingText = "Saving...") {
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? loadingText : button.dataset.defaultText;
}

function prepareSubmitButtons() {
  document.querySelectorAll('form button[type="submit"]').forEach(button => {
    button.dataset.defaultText = button.textContent;
  });
}

function openConfirmModal({ type, id, name }) {
  pendingDelete = { type, id };
  els.confirmTitle.textContent = `Delete ${type}?`;
  els.confirmMessage.textContent = `You are about to delete "${name}". This action cannot be undone.`;
  els.confirmModal.classList.remove("hidden");
  els.confirmDelete.focus();
}

function closeConfirmModal() {
  pendingDelete = null;
  els.confirmModal.classList.add("hidden");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value) {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes));
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function statusClass(status) {
  return `status-pill status-${status}`;
}

function medicineTemplate(item) {
  return `
    <article class="item">
      <div class="item-title">
        <strong>${item.name}</strong>
        <span class="${statusClass(item.status)}">${item.status}</span>
      </div>
      <p class="item-meta">
        ${item.dosage} • ${formatDate(item.date)} at ${formatTime(item.time)} • ${item.category}
      </p>
      ${item.instructions ? `<p class="muted">${item.instructions}</p>` : ""}
      <div class="status-row">
        <button class="ghost-button" data-action="status" data-id="${item.id}" data-status="taken">Taken</button>
        <button class="ghost-button" data-action="status" data-id="${item.id}" data-status="missed">Missed</button>
        <button class="ghost-button" data-action="status" data-id="${item.id}" data-status="pending">Reset</button>
        <button class="danger-button" data-action="delete-medicine" data-id="${item.id}">Delete</button>
      </div>
    </article>
  `;
}

function appointmentTemplate(item) {
  return `
    <article class="item">
      <div class="item-title">
        <strong>${item.doctor}</strong>
        <button class="danger-button" data-action="delete-appointment" data-id="${item.id}">Delete</button>
      </div>
      <p class="item-meta">
        ${item.specialty} • ${formatDate(item.date)} at ${formatTime(item.time)}
      </p>
      <p class="muted">${item.location}${item.reason ? ` • ${item.reason}` : ""}</p>
    </article>
  `;
}

function noteTemplate(item) {
  return `
    <article class="item">
      <div class="item-title">
        <strong>${item.title}</strong>
        <span class="status-pill status-pending">${item.mood}</span>
      </div>
      <p class="item-meta">${new Date(item.createdAt).toLocaleString()}</p>
      <p class="muted">${item.body}</p>
    </article>
  `;
}

function filteredMedicines() {
  const search = els.medicineSearch.value.trim().toLowerCase();
  const status = els.medicineStatusFilter.value;
  const dateFilter = els.medicineDateFilter.value;
  const todayValue = today();

  return state.medicines.filter(item => {
    const searchTarget = [
      item.name,
      item.dosage,
      item.category,
      item.instructions,
      item.date,
      item.time
    ].join(" ").toLowerCase();
    const matchesSearch = !search || searchTarget.includes(search);
    const matchesStatus = status === "all" || item.status === status;
    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" && item.date === todayValue) ||
      (dateFilter === "upcoming" && item.date > todayValue) ||
      (dateFilter === "past" && item.date < todayValue);
    return matchesSearch && matchesStatus && matchesDate;
  });
}

function filteredAppointments() {
  const search = els.appointmentSearch.value.trim().toLowerCase();
  const dateFilter = els.appointmentDateFilter.value;
  const todayValue = today();

  return state.appointments.filter(item => {
    const searchTarget = [
      item.doctor,
      item.specialty,
      item.location,
      item.reason,
      item.date,
      item.time
    ].join(" ").toLowerCase();
    const matchesSearch = !search || searchTarget.includes(search);
    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" && item.date === todayValue) ||
      (dateFilter === "upcoming" && item.date > todayValue) ||
      (dateFilter === "past" && item.date < todayValue);
    return matchesSearch && matchesDate;
  });
}

function filteredNotes() {
  const search = els.noteSearch.value.trim().toLowerCase();
  const mood = els.noteMoodFilter.value;

  return state.notes.filter(item => {
    const searchTarget = [
      item.title,
      item.body,
      item.mood,
      item.createdAt
    ].join(" ").toLowerCase();
    const matchesSearch = !search || searchTarget.includes(search);
    const matchesMood = mood === "all" || item.mood === mood;
    return matchesSearch && matchesMood;
  });
}

function renderSummary(summary) {
  document.querySelector("#totalMedicines").textContent = summary.totalMedicines;
  document.querySelector("#dueToday").textContent = summary.dueToday;
  document.querySelector("#takenToday").textContent = summary.takenToday;
  document.querySelector("#upcomingAppointments").textContent = summary.upcomingAppointments;

  const title = document.querySelector("#nextAppointmentTitle");
  const meta = document.querySelector("#nextAppointmentMeta");
  if (summary.nextAppointment) {
    title.textContent = summary.nextAppointment.doctor;
    meta.textContent = `${summary.nextAppointment.specialty} on ${formatDate(summary.nextAppointment.date)} at ${formatTime(summary.nextAppointment.time)}`;
  } else {
    title.textContent = "No appointment";
    meta.textContent = "Add an appointment to track upcoming care.";
  }
}

function render() {
  const medicinesToShow = filteredMedicines();
  const appointmentsToShow = filteredAppointments();
  const notesToShow = filteredNotes();
  els.medicineResultCount.textContent = `Showing ${medicinesToShow.length} of ${state.medicines.length} medicines`;
  els.medicineList.innerHTML = medicinesToShow.length
    ? medicinesToShow.map(medicineTemplate).join("")
    : '<div class="item muted">No medicines match the current filters.</div>';
  els.appointmentResultCount.textContent = `Showing ${appointmentsToShow.length} of ${state.appointments.length} appointments`;
  els.appointmentList.innerHTML = appointmentsToShow.length
    ? appointmentsToShow.map(appointmentTemplate).join("")
    : '<div class="item muted">No appointments match the current filters.</div>';
  els.noteResultCount.textContent = `Showing ${notesToShow.length} of ${state.notes.length} notes`;
  els.noteList.innerHTML = notesToShow.length
    ? notesToShow.map(noteTemplate).join("")
    : '<div class="item muted">No notes match the current filters.</div>';
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isSignup = mode === "signup";
  els.authName.classList.toggle("hidden", !isSignup);
  els.authName.required = isSignup;
  els.authSubmit.textContent = isSignup ? "Create Account" : "Log In";
  els.authSubmit.dataset.defaultText = els.authSubmit.textContent;
  els.authToggle.textContent = isSignup ? "Use existing account" : "Create new account";
  if (isSignup && els.authEmail.value === "demo@dosewise.app") {
    els.authEmail.value = "";
    els.authPassword.value = "";
    els.authName.focus();
  }
  if (!isSignup && !els.authEmail.value) {
    els.authEmail.value = "demo@dosewise.app";
    els.authPassword.value = "secret";
  }
  setFeedback(els.authFeedback);
}

function showApp(user) {
  state.user = user;
  els.profileName.textContent = user.name;
  document.querySelector(".avatar").textContent = user.name.charAt(0).toUpperCase();
  els.authScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
}

function showAuth() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("dosewise_token");
  els.appShell.classList.add("hidden");
  els.authScreen.classList.remove("hidden");
}

async function restoreSession() {
  if (!state.token) {
    showAuth();
    return;
  }

  try {
    const user = await api("/api/auth/me");
    showApp(user);
    await load();
  } catch (error) {
    showAuth();
  }
}

async function load() {
  const [summary, medicines, appointments, notes] = await Promise.all([
    api("/api/summary"),
    api("/api/medicines"),
    api("/api/appointments"),
    api("/api/notes")
  ]);
  state.medicines = medicines;
  state.appointments = appointments;
  state.notes = notes;
  renderSummary(summary);
  render();
}

els.authForm.addEventListener("submit", async event => {
  event.preventDefault();
  setFeedback(els.authFeedback);
  const authData = formData(event.currentTarget);
  if (state.authMode === "signup" && authData.email.trim().toLowerCase() === "demo@dosewise.app") {
    setFeedback(els.authFeedback, "The demo email already exists. Use a different email for signup, or choose existing account.");
    return;
  }
  setSubmitting(event.currentTarget, true, state.authMode === "signup" ? "Creating..." : "Logging in...");
  try {
    const path = state.authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
    const data = await api(path, {
      method: "POST",
      body: JSON.stringify(authData)
    });
    state.token = data.token;
    localStorage.setItem("dosewise_token", data.token);
    showApp(data.user);
    toast(state.authMode === "signup" ? "Account created" : "Logged in");
    await load();
  } catch (error) {
    setFeedback(els.authFeedback, error.message);
  } finally {
    setSubmitting(event.currentTarget, false);
  }
});

els.authToggle.addEventListener("click", () => {
  setAuthMode(state.authMode === "signup" ? "login" : "signup");
});

els.logoutButton.addEventListener("click", () => {
  showAuth();
  toast("Logged out");
});

els.medicineSearch.addEventListener("input", render);
els.medicineStatusFilter.addEventListener("change", render);
els.medicineDateFilter.addEventListener("change", render);
els.appointmentSearch.addEventListener("input", render);
els.appointmentDateFilter.addEventListener("change", render);
els.noteSearch.addEventListener("input", render);
els.noteMoodFilter.addEventListener("change", render);

els.medicineForm.addEventListener("submit", async event => {
  event.preventDefault();
  setFeedback(els.medicineFeedback);
  setSubmitting(event.currentTarget, true);
  try {
    await api("/api/medicines", {
      method: "POST",
      body: JSON.stringify(formData(event.currentTarget))
    });
    event.currentTarget.reset();
    setDefaultDates();
    setFeedback(els.medicineFeedback, "Medicine added successfully.", "success");
    toast("Medicine added");
    await load();
  } catch (error) {
    setFeedback(els.medicineFeedback, error.message);
  } finally {
    setSubmitting(event.currentTarget, false);
  }
});

els.appointmentForm.addEventListener("submit", async event => {
  event.preventDefault();
  setFeedback(els.appointmentFeedback);
  setSubmitting(event.currentTarget, true);
  try {
    await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify(formData(event.currentTarget))
    });
    event.currentTarget.reset();
    setDefaultDates();
    setFeedback(els.appointmentFeedback, "Appointment added successfully.", "success");
    toast("Appointment added");
    await load();
  } catch (error) {
    setFeedback(els.appointmentFeedback, error.message);
  } finally {
    setSubmitting(event.currentTarget, false);
  }
});

els.noteForm.addEventListener("submit", async event => {
  event.preventDefault();
  setFeedback(els.noteFeedback);
  setSubmitting(event.currentTarget, true);
  try {
    await api("/api/notes", {
      method: "POST",
      body: JSON.stringify(formData(event.currentTarget))
    });
    event.currentTarget.reset();
    setFeedback(els.noteFeedback, "Note saved successfully.", "success");
    toast("Note saved");
    await load();
  } catch (error) {
    setFeedback(els.noteFeedback, error.message);
  } finally {
    setSubmitting(event.currentTarget, false);
  }
});

document.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id, status } = button.dataset;
  if (action === "status") {
    await api(`/api/medicines/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    toast("Medicine status updated");
  }

  if (action === "delete-medicine") {
    const medicine = state.medicines.find(item => item.id === id);
    openConfirmModal({ type: "medicine", id, name: medicine?.name || "this medicine" });
    return;
  }

  if (action === "delete-appointment") {
    const appointment = state.appointments.find(item => item.id === id);
    openConfirmModal({ type: "appointment", id, name: appointment?.doctor || "this appointment" });
    return;
  }

  await load();
});

els.confirmCancel.addEventListener("click", closeConfirmModal);

els.confirmModal.addEventListener("click", event => {
  if (event.target === els.confirmModal) {
    closeConfirmModal();
  }
});

els.confirmDelete.addEventListener("click", async () => {
  if (!pendingDelete) return;

  const { type, id } = pendingDelete;
  els.confirmDelete.disabled = true;
  els.confirmDelete.textContent = "Deleting...";
  try {
    const path = type === "medicine" ? `/api/medicines/${id}` : `/api/appointments/${id}`;
    await api(path, { method: "DELETE" });
    toast(type === "medicine" ? "Medicine removed" : "Appointment removed");
    closeConfirmModal();
    await load();
  } catch (error) {
    toast(error.message);
  } finally {
    els.confirmDelete.disabled = false;
    els.confirmDelete.textContent = "Delete";
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !els.confirmModal.classList.contains("hidden")) {
    closeConfirmModal();
  }
});

setDefaultDates();
prepareSubmitButtons();
setAuthMode("login");
restoreSession().catch(error => toast(error.message));
