# FaceYouFace - Airbnb Clone PRD

## Original Problem Statement
Crear una aplicación web idéntica a Airbnb para alojamientos con las siguientes características:
- Registro/login de usuarios (anfitriones y huéspedes)
- Publicar y gestionar propiedades (fotos, descripción, precio, ubicación)
- Sistema de búsqueda con filtros (ubicación, fechas, precio, tipo)
- Reservas y calendario de disponibilidad
- Sistema de reseñas y valoraciones
- Integración de pagos con Stripe y PayPal

## Updates (April 15, 2026)
- Nombre del proyecto cambiado a "FaceYouFace"
- Subida de imágenes a almacenamiento de objetos implementada
- Notificaciones por email para reservas implementadas
- Sistema de mensajería entre anfitrión y huésped implementado
- Calendario con fechas bloqueadas visuales mejorado

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT + Google OAuth (Emergent Auth)
- **Payments**: Stripe + PayPal
- **Storage**: Emergent Object Storage
- **Email**: SendGrid (optional, logs to console if not configured)

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
- [x] Image upload to object storage

### Search & Filters
- [x] Search by city/country
- [x] Filter by property type
- [x] Filter by price range
- [x] Filter by number of guests
- [x] Category pills for quick filtering

### Bookings
- [x] Date selection with availability calendar
- [x] Visual blocked dates on calendar
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

### Messaging
- [x] Real-time conversations between host and guest
- [x] Conversation list with unread count
- [x] Message history per conversation
- [x] Contact host button on property page

### Notifications
- [x] Email confirmation for bookings (guest)
- [x] Email notification for new bookings (host)
- [x] HTML email templates with FaceYouFace branding

### Dashboards
- [x] Host dashboard with stats, properties, bookings
- [x] Guest bookings view
- [x] Favorites/wishlist
- [x] Messages inbox

## What's Been Implemented

### Backend (/app/backend/server.py)
- Complete REST API with 25+ endpoints
- MongoDB models: users, properties, bookings, reviews, favorites, payments, messages, conversations, files
- JWT authentication with cookie-based sessions
- Google OAuth integration
- Stripe payment sessions
- PayPal order creation
- Object storage for image uploads
- Email notifications via SendGrid
- Messaging system with conversations
- Brute force protection
- Admin user seeding with sample properties

### Frontend (/app/frontend/src/)
- 13 pages: Home, Login, Register, PropertyDetails, Search, Bookings, Favorites, Payment, BookingSuccess, HostDashboard, NewProperty, AuthCallback, Messages
- Responsive design with Tailwind CSS
- Modern UI following Airbnb aesthetics
- Outfit + Manrope fonts
- Coral brand color (#F43F5E)
- Shadcn UI components
- React Router for navigation
- AuthContext for state management
- Toast notifications (sonner)
- Image upload with drag & drop
- Real-time messaging interface

## Test Credentials
- **Admin/Host**: admin@faceyouface.com / admin123
- **Auth endpoints**: /api/auth/login, /api/auth/register, /api/auth/me

## Prioritized Backlog

### P0 (Critical) - ✅ COMPLETED
- User authentication (JWT + Google OAuth)
- Property listing and viewing
- Booking creation
- Payment flow (Stripe)
- Host property management
- Image upload to object storage
- Messaging system
- Email notifications
- Calendar with blocked dates

### P1 (High Priority)
- [ ] Property edit/update page for hosts
- [ ] Review creation UI for completed bookings
- [ ] Host payout system
- [ ] Real-time message notifications (WebSocket)

### P2 (Medium Priority)
- [ ] Map view for properties
- [ ] Advanced search (amenities, dates)
- [ ] Multi-image upload
- [ ] Property availability management UI

### P3 (Nice to Have)
- [ ] Multi-language support
- [ ] Currency conversion
- [ ] Promotional codes/discounts
- [ ] Host verification system
- [ ] Mobile app

## Next Tasks
1. Implementar página de edición de propiedades
2. Agregar UI para crear reseñas después de completar reservas
3. Implementar sistema de pagos para anfitriones
4. Agregar notificaciones en tiempo real con WebSocket
5. Vista de mapa para buscar propiedades
