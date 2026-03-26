# PROJECT MEMORY — Property Management System

## Project Name
Property Management & Rent Reminder System

---

# SYSTEM OVERVIEW

This is a multi-tenant property management system that allows:

- Admins to manage landlords
- Landlords to manage properties, apartments, tenants, and rents
- Automatic rent reminders to tenants
- Multi-channel notifications:
  - SMS
  - WhatsApp
  - Dashboard notifications
  - (Optional Email)

---

# TECHNOLOGY STACK

## Backend

- FastAPI
- Python 3.13
- SQLAlchemy ORM
- MySQL Database
- dotenv (.env configuration)
- Scheduler (background jobs)
- Services-based architecture

## Frontend

- React
- TypeScript
- Vite
- Landlord dashboard UI
- Admin dashboard UI

## Messaging

- SMS Service
- WhatsApp Service
- Reminder Scheduler

---

# PROJECT STRUCTURE

## Backend

app/

- api.py  
  Main FastAPI entry point  
  Registers all routers  
  Creates database tables  

- database.py  
  Loads DATABASE_URL from .env  
  Creates SQLAlchemy engine  
  Defines Base  

- deps.py  
  Dependency injection helpers  

- scheduler.py  
  Background reminder scheduling  

- request_validator.py  
  Request validation helpers  

---

## Models

app/models/

Includes:

- user.py
- landlord.py
- property.py
- apartment.py
- tenant.py
- rent.py
- reminder.py
- rent_reminder_log.py

Important tables:

### apartments

Must include:

- id
- property_id
- unit_number
- apartment_type
- is_vacant

### tenants

Must include:

- id
- full_name
- phone_number
- apartment_id

### rents

Must include:

- tenant_id
- due_date
- amount

### reminder_config

Stores landlord reminder preferences.

Must include:

- landlord_id
- days_before_due
- channels

### rent_reminder_log

Tracks sent reminders.

Must include:

- tenant_id
- channel_type
- sent_at
- delivery_status

---

## Routes

app/routes/

Includes:

- auth.py
- landlord.py
- property.py
- apartment.py
- tenant.py
- rent.py
- rent_reminder.py
- admin.py

These routes power frontend modules.

---

## Services

app/services/

Important:

### reminder_service.py

Main reminder logic.

Responsibilities:

- Fetch upcoming rents
- Determine reminder timing
- Send notifications
- Log delivery

Calls:

- sms_service.py
- whatsapp_service.py

---

### sms_service.py

Responsible for:

- Sending SMS reminders
- Formatting messages
- Handling SMS gateway

---

### whatsapp_service.py

Responsible for:

- Sending WhatsApp reminders
- Formatting WhatsApp messages

---

# FRONTEND STRUCTURE

frontend/src/

Includes:

## Landlord Pages

frontend/src/pages/landlord/

- LandlordDashboard.tsx
- Properties.tsx
- Apartments.tsx
- Tenants.tsx
- Rents.tsx
- Reminders.tsx

These pages depend on backend APIs.

---

## Admin Pages

frontend/src/pages/admin/

Admin must be able to:

- View landlords
- Approve landlord onboarding
- Reject landlord onboarding

---

# DATABASE CONFIGURATION

Database:

MySQL

Database name:

app_db

User:

app_user

Password:

PasswordQayyi@2026

Encoded DATABASE_URL:

# ADMIN LANDLORD MANAGEMENT

Admin must be able to:

- View all landlords
- Approve landlord onboarding
- Reject landlord onboarding
- Activate / Deactivate landlord

Landlord model must include:

status ENUM:

- pending
- approved
- rejected
- inactive

Default:

pending

Only approved landlords can log in and use system.