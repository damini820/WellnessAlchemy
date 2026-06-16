const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { createHash, randomUUID } = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = path.join(__dirname, "..", "..");
const CLIENT_DIR = path.join(ROOT, "client");
const DB_FILE = path.join(__dirname, "data", "db.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function readDb() {
  const raw = await fs.readFile(DB_FILE, "utf8");
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.writeFile(DB_FILE, `${JSON.stringify(db, null, 2)}\n`);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function getUserData(db, userId) {
  return {
    medicines: db.medicines.filter(item => item.userId === userId),
    appointments: db.appointments.filter(item => item.userId === userId),
    notes: db.notes.filter(item => item.userId === userId)
  };
}

function buildSummary(records) {
  const today = new Date().toISOString().slice(0, 10);
  const todaysMedicines = records.medicines.filter(item => item.date === today);
  const nextAppointment = records.appointments
    .filter(item => item.date >= today)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];

  return {
    totalMedicines: records.medicines.length,
    dueToday: todaysMedicines.length,
    takenToday: todaysMedicines.filter(item => item.status === "taken").length,
    missedToday: todaysMedicines.filter(item => item.status === "missed").length,
    upcomingAppointments: records.appointments.filter(item => item.date >= today).length,
    notes: records.notes.length,
    nextAppointment
  };
}

function required(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return "";
  }
  return header.slice("Bearer ".length);
}

function requireUser(req, res, db) {
  const token = getBearerToken(req);
  const session = db.sessions.find(item => item.token === token);
  if (!session) {
    sendJson(res, 401, { message: "Please log in to continue." });
    return null;
  }

  const user = db.users.find(item => item.id === session.userId);
  if (!user) {
    sendJson(res, 401, { message: "Session user was not found." });
    return null;
  }

  return user;
}

async function handleApi(req, res, pathname) {
  const db = await readDb();
  const method = req.method || "GET";

  if (method === "POST" && pathname === "/api/auth/signup") {
    const body = await parseBody(req);
    if (!required(body.name) || !required(body.email) || !required(body.password)) {
      sendJson(res, 400, { message: "Name, email, and password are required." });
      return;
    }

    const email = body.email.trim().toLowerCase();
    if (db.users.some(user => user.email === email)) {
      sendJson(res, 409, { message: "An account with this email already exists." });
      return;
    }

    const user = {
      id: randomUUID(),
      name: body.name.trim(),
      email,
      passwordHash: hashPassword(body.password)
    };
    const session = {
      token: randomUUID(),
      userId: user.id,
      createdAt: new Date().toISOString()
    };

    db.users.push(user);
    db.sessions.push(session);
    await writeDb(db);
    sendJson(res, 201, { user: publicUser(user), token: session.token });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/login") {
    const body = await parseBody(req);
    const email = String(body.email || "").trim().toLowerCase();
    const user = db.users.find(item => item.email === email);

    if (!user || user.passwordHash !== hashPassword(String(body.password || ""))) {
      sendJson(res, 401, { message: "Invalid email or password." });
      return;
    }

    const session = {
      token: randomUUID(),
      userId: user.id,
      createdAt: new Date().toISOString()
    };
    db.sessions.push(session);
    await writeDb(db);
    sendJson(res, 200, { user: publicUser(user), token: session.token });
    return;
  }

  if (method === "GET" && pathname === "/api/auth/me") {
    const user = requireUser(req, res, db);
    if (!user) return;
    sendJson(res, 200, publicUser(user));
    return;
  }

  const user = requireUser(req, res, db);
  if (!user) return;
  const records = getUserData(db, user.id);

  if (method === "GET" && pathname === "/api/summary") {
    sendJson(res, 200, buildSummary(records));
    return;
  }

  if (method === "GET" && pathname === "/api/medicines") {
    sendJson(res, 200, records.medicines);
    return;
  }

  if (method === "POST" && pathname === "/api/medicines") {
    const body = await parseBody(req);
    if (!required(body.name) || !required(body.dosage) || !required(body.time) || !required(body.date)) {
      sendJson(res, 400, { message: "Medicine name, dosage, date, and time are required." });
      return;
    }

    const medicine = {
      id: randomUUID(),
      userId: user.id,
      name: body.name.trim(),
      dosage: body.dosage.trim(),
      date: body.date,
      time: body.time,
      category: body.category || "General",
      instructions: body.instructions || "",
      status: "pending"
    };
    db.medicines.unshift(medicine);
    await writeDb(db);
    sendJson(res, 201, medicine);
    return;
  }

  const medicineStatusMatch = pathname.match(/^\/api\/medicines\/([^/]+)\/status$/);
  if (method === "PATCH" && medicineStatusMatch) {
    const body = await parseBody(req);
    const allowed = ["pending", "taken", "missed"];
    if (!allowed.includes(body.status)) {
      sendJson(res, 400, { message: "Status must be pending, taken, or missed." });
      return;
    }

    const medicine = db.medicines.find(item => item.id === medicineStatusMatch[1] && item.userId === user.id);
    if (!medicine) {
      sendJson(res, 404, { message: "Medicine not found." });
      return;
    }

    medicine.status = body.status;
    await writeDb(db);
    sendJson(res, 200, medicine);
    return;
  }

  const medicineDeleteMatch = pathname.match(/^\/api\/medicines\/([^/]+)$/);
  if (method === "DELETE" && medicineDeleteMatch) {
    db.medicines = db.medicines.filter(item => item.id !== medicineDeleteMatch[1] || item.userId !== user.id);
    await writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (method === "GET" && pathname === "/api/appointments") {
    sendJson(res, 200, records.appointments);
    return;
  }

  if (method === "POST" && pathname === "/api/appointments") {
    const body = await parseBody(req);
    if (!required(body.doctor) || !required(body.date) || !required(body.time)) {
      sendJson(res, 400, { message: "Doctor, date, and time are required." });
      return;
    }

    const appointment = {
      id: randomUUID(),
      userId: user.id,
      doctor: body.doctor.trim(),
      specialty: body.specialty || "General consultation",
      date: body.date,
      time: body.time,
      location: body.location || "Clinic",
      reason: body.reason || ""
    };
    db.appointments.unshift(appointment);
    await writeDb(db);
    sendJson(res, 201, appointment);
    return;
  }

  const appointmentDeleteMatch = pathname.match(/^\/api\/appointments\/([^/]+)$/);
  if (method === "DELETE" && appointmentDeleteMatch) {
    db.appointments = db.appointments.filter(item => item.id !== appointmentDeleteMatch[1] || item.userId !== user.id);
    await writeDb(db);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (method === "GET" && pathname === "/api/notes") {
    sendJson(res, 200, records.notes);
    return;
  }

  if (method === "POST" && pathname === "/api/notes") {
    const body = await parseBody(req);
    if (!required(body.title) || !required(body.body)) {
      sendJson(res, 400, { message: "Note title and details are required." });
      return;
    }

    const note = {
      id: randomUUID(),
      userId: user.id,
      title: body.title.trim(),
      body: body.body.trim(),
      mood: body.mood || "Neutral",
      createdAt: new Date().toISOString()
    };
    db.notes.unshift(note);
    await writeDb(db);
    sendJson(res, 201, note);
    return;
  }

  sendJson(res, 404, { message: "API route not found." });
}

async function serveStatic(res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(CLIENT_DIR, safePath));

  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  } catch (error) {
    const fallback = await fs.readFile(path.join(CLIENT_DIR, "index.html"));
    res.writeHead(200, { "Content-Type": contentTypes[".html"] });
    res.end(fallback);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url.pathname);
      return;
    }
    await serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { message: "Something went wrong.", detail: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`DoseWise is running at http://${HOST}:${PORT}`);
});
