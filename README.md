# DoseWise

DoseWise is a full-stack healthcare dashboard that helps users manage medicine schedules, doctor appointments, and health journal notes from one responsive web app.

The project is built as a practical MVP for learning full-stack development: a browser-based frontend, a Node.js backend, token-based sessions, user-specific records, and REST-style API routes.

## Highlights

- Login and signup with token-based sessions
- User-scoped medicines, appointments, and notes
- Dashboard summary for medicines, due doses, completed doses, and upcoming appointments
- Medicine CRUD with dosage, date, time, category, instructions, and adherence status
- Medicine search with status and date filters
- Appointment tracking with search and date filters
- Health journal notes with search and mood filters
- Inline success/error feedback for key forms
- Confirmation modal before deleting medicines or appointments
- Responsive layout for desktop and mobile screens
- Lightweight JSON storage for the MVP phase

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js HTTP server
- Storage: Local JSON file
- Auth: Token-based sessions

## Run Locally

```bash
npm install
npm start
```

Open the app:

```text
http://localhost:3000
```

Demo account:

```text
Email: demo@dosewise.app
Password: secret
```

## Verify

```bash
npm run check
```

This checks JavaScript syntax and confirms the JSON data file is valid.

## Project Structure

```text
dosewise/
  client/
    index.html
    src/
      app.js
      styles.css
  server/
    src/
      index.js
      data/
        db.json
  package.json
  README.md
```

## API Endpoints

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

Dashboard:

- `GET /api/summary`

Medicines:

- `GET /api/medicines`
- `POST /api/medicines`
- `PATCH /api/medicines/:id/status`
- `DELETE /api/medicines/:id`

Appointments:

- `GET /api/appointments`
- `POST /api/appointments`
- `DELETE /api/appointments/:id`

Notes:

- `GET /api/notes`
- `POST /api/notes`

## Current Status

This version is an MVP. It is ready for GitHub as a learning and resume project, but the storage layer is intentionally simple. The next production-style improvement is replacing JSON storage with MongoDB and moving session tokens to JWT or secure cookies.

## Roadmap

- Replace JSON storage with MongoDB
- Add password hashing with a stronger algorithm such as bcrypt
- Add reminder notifications for upcoming medicine doses
- Add edit flows for medicines, appointments, and notes
- Add unit/API tests
- Deploy frontend and backend
- Add screenshots and a short demo video

## Resume Bullet

Built DoseWise, a full-stack healthcare dashboard using JavaScript and Node.js with login/signup, token-based sessions, user-scoped medicine scheduling, medicine/appointment/note search and filter workflows, inline form feedback, delete confirmations, appointment tracking, adherence status, and health notes through a responsive UI and REST-style API.
