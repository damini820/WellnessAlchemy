# DoseWise

DoseWise is a healthcare management app that helps users organize medicines, track doctor appointments, and maintain simple health notes from one dashboard.

## Features

- Dashboard with medicine, appointment, and adherence summaries
- Add and manage medicines with dosage, time, category, and notes
- Mark medicines as taken, pending, or missed
- Track upcoming doctor appointments
- Save health notes and symptoms
- Responsive frontend built with HTML, CSS, and JavaScript
- Lightweight Node.js API using local JSON storage

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js HTTP server
- Storage: JSON file storage for MVP

## Run Locally

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## API Endpoints

- `GET /api/summary`
- `GET /api/medicines`
- `POST /api/medicines`
- `PATCH /api/medicines/:id/status`
- `DELETE /api/medicines/:id`
- `GET /api/appointments`
- `POST /api/appointments`
- `DELETE /api/appointments/:id`
- `GET /api/notes`
- `POST /api/notes`

## One-Month Roadmap

Week 1:
- Build MVP dashboard, medicine tracker, appointments, and notes
- Polish responsive UI

Week 2:
- Add user authentication
- Replace JSON storage with MongoDB
- Add protected routes

Week 3:
- Add real reminder notifications
- Add filters, search, and validation
- Improve error states

Week 4:
- Deploy frontend and backend
- Add screenshots, demo video, and final README
- Add tests and resume-ready documentation

## Resume Bullet

Built DoseWise, a full-stack healthcare dashboard using JavaScript and Node.js to manage medicine schedules, appointment tracking, adherence status, and health notes with a responsive user interface and REST-style API.
