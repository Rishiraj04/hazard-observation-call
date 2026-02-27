# Hazard Observation Call (HOC) System

A full-stack workplace safety management application designed to streamline **hazard reporting, tracking, and resolution**.  
The system follows a **dual-module architecture** for employees and safety administrators, enhanced with **real-time updates** for operational visibility.

This application replaces manual and spreadsheet-based safety reporting with a centralized digital compliance system.

---

##  Features

###  User Module (Employees)
- Secure Authentication (JWT-based)
- Hazard Reporting with:
  - Hazard type and description
  - Location details
  - Risk level (Low, Medium, High)
  - Image evidence upload
- Personal dashboard with real-time status tracking

---

###  Admin Module (Safety Officers)
- Centralized hazard command dashboard
- Advanced filtering (severity, location, status, keywords)
- Status lifecycle management (Open → In Progress → Closed)
- Corrective action and resolution notes
- Safety analytics overview

---

###  System Capabilities
- Real-time synchronization using WebSockets
- Responsive UI (Desktop + Mobile optimized)

---

## 🛠 Tech Stack

### Frontend
- React 19
- TypeScript
- Tailwind CSS 4.0
- Motion
- Lucide Icons

### Backend
- Node.js
- Express
- WebSockets (`ws`)

### Database
- SQLite (`better-sqlite3`)

### Authentication
- JWT (JSON Web Tokens) with secure cookies

---

##  Future Enhancements

- Email notification system using **Nodemailer (SMTP)**:
  - Admin alerts for new hazard submissions
  - User notifications on status updates
- Role-based access control (RBAC) for multi-level safety management
- Deployment with Docker for scalable enterprise environments
- Cloud database integration (PostgreSQL / MySQL)

---

##  Use Case

Designed for enterprise environments to:
- Improve workplace safety reporting efficiency
- Enhance hazard traceability and accountability
- Support compliance audits with structured data
- Enable faster corrective action through real-time visibility

---

##  Disclaimer

Developed as part of an internship initiative.  
All confidential or proprietary information has been removed.
