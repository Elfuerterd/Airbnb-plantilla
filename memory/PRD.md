# StayBnB - Airbnb Clone PRD

## Original Problem Statement
Crear una aplicación web idéntica a Airbnb para alojamientos con las siguientes características:
- Registro/login de usuarios (anfitriones y huéspedes)
- Publicar y gestionar propiedades (fotos, descripción, precio, ubicación)
- Sistema de búsqueda con filtros (ubicación, fechas, precio, tipo)
- Reservas y calendario de disponibilidad
- Sistema de reseñas y valoraciones
- Integración de pagos con Stripe y PayPal

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT + Google OAuth (Emergent Auth)
- **Payments**: Stripe + PayPal

## User Personas
1. **Huésped (Guest)**: Usuario que busca alojamientos y realiza reservas
2. **Anfitrión (Host)**: Usuario que publica propiedades y gestiona reservas

## Core Requirements (Static)

### Authentication
- [x] Email/password registration with role selection (guest/host)
- [x] Login with JWT tokens (access + refresh)
- [x] Google OAuth social login
- [x] Protected routes for authenticated users
- [x] Brute force protection

### Properties
- [x] Property listing with images, description, pricing
- [x] Property types: apartment, house, villa, cabin, beach, mountain
- [x] Amenities: wifi, parking, kitchen, pool, etc.
- [x] Location: city, country, address

### Search & Filters
- [x] Search by city/country
- [x] Filter by property type
- [x] Filter by price range
- [x] Filter by number of guests
- [x] Category pills for quick filtering

### Bookings
- [x] Date selection with availability calendar
- [x] Price calculation (nights × rate + service fee)
- [x] Booking creation and management
- [x] Booking statuses: pending, confirmed, cancelled, completed

### Payments
- [x] Stripe integration for card payments
- [x] PayPal integration (requires user credentials)
- [x] Payment status tracking
- [x] Webhook handling

### Reviews
- [x] Star rating (1-5)
- [x] Text comments
- [x] Average rating calculation on properties

### Dashboards
- [x] Host dashboard with stats, properties, bookings
- [x] Guest bookings view
- [x] Favorites/wishlist

## What's Been Implemented (April 15, 2026)

### Backend (/app/backend/server.py)
- Complete REST API with 19+ endpoints
- MongoDB models: users, properties, bookings, reviews, favorites, payments
- JWT authentication with cookie-based sessions
- Google OAuth integration
- Stripe payment sessions
- PayPal order creation
- Brute force protection
- Admin user seeding with sample properties

### Frontend (/app/frontend/src/)
- 12 pages: Home, Login, Register, PropertyDetails, Search, Bookings, Favorites, Payment, BookingSuccess, HostDashboard, NewProperty, AuthCallback
- Responsive design with Tailwind CSS
- Modern UI following Airbnb aesthetics
- Outfit + Manrope fonts
- Coral brand color (#F43F5E)
- Shadcn UI components
- React Router for navigation
- AuthContext for state management
- Toast notifications (sonner)

## Prioritized Backlog

### P0 (Critical) - ✅ COMPLETED
- User authentication (JWT + Google OAuth)
- Property listing and viewing
- Booking creation
- Payment flow (Stripe)
- Host property management

### P1 (High Priority)
- [ ] Image upload to object storage (currently URL-based)
- [ ] Email notifications for bookings
- [ ] Calendar blocked dates visualization
- [ ] Host payout system

### P2 (Medium Priority)
- [ ] Messaging system between host and guest
- [ ] Map view for properties
- [ ] Advanced search (amenities, dates)
- [ ] Property edit/update page
- [ ] Review creation UI for completed bookings

### P3 (Nice to Have)
- [ ] Multi-language support
- [ ] Currency conversion
- [ ] Promotional codes/discounts
- [ ] Host verification system
- [ ] Mobile app

## Test Credentials
- **Admin/Host**: admin@staybnb.com / admin123
- **Auth endpoints**: /api/auth/login, /api/auth/register, /api/auth/me

## Next Tasks
1. Add image upload functionality with object storage
2. Implement email notifications for booking confirmations
3. Add messaging system between hosts and guests
4. Improve calendar with blocked dates display
5. Add property edit page for hosts
