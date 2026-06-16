const state = {
  medicines: [],
  appointments: [],
  notes: []
};

const els = {
  medicineForm: document.querySelector("#medicineForm"),
  appointmentForm: document.querySelector("#appointmentForm"),
  noteForm: document.querySelector("#noteForm"),
  medicineList: document.querySelector("#medicineList"),
  appointmentList: document.querySelector("#appointmentList"),
  noteList: document.querySelector("#noteList"),
  toast: document.querySelector("#toast")
};

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
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
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
  els.medicineList.innerHTML = state.medicines.map(medicineTemplate).join("");
  els.appointmentList.innerHTML = state.appointments.map(appointmentTemplate).join("");
  els.noteList.innerHTML = state.notes.map(noteTemplate).join("");
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
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

els.medicineForm.addEventListener("submit", async event => {
  event.preventDefault();
  await api("/api/medicines", {
    method: "POST",
    body: JSON.stringify(formData(event.currentTarget))
  });
  event.currentTarget.reset();
  setDefaultDates();
  toast("Medicine added");
  await load();
});

els.appointmentForm.addEventListener("submit", async event => {
  event.preventDefault();
  await api("/api/appointments", {
    method: "POST",
    body: JSON.stringify(formData(event.currentTarget))
  });
  event.currentTarget.reset();
  setDefaultDates();
  toast("Appointment added");
  await load();
});

els.noteForm.addEventListener("submit", async event => {
  event.preventDefault();
  await api("/api/notes", {
    method: "POST",
    body: JSON.stringify(formData(event.currentTarget))
  });
  event.currentTarget.reset();
  toast("Note saved");
  await load();
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
    await api(`/api/medicines/${id}`, { method: "DELETE" });
    toast("Medicine removed");
  }

  if (action === "delete-appointment") {
    await api(`/api/appointments/${id}`, { method: "DELETE" });
    toast("Appointment removed");
  }

  await load();
});

setDefaultDates();
load().catch(error => toast(error.message));
