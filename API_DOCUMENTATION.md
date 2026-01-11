# 📚 MatchPlay API - Endpoint Documentation

This documentation describes all available endpoints in the MatchPlay API, including required parameters and expected responses.

## 📋 Table of Contents

- [Authentication](#authentication)
- [User Accounts](#user-accounts)
- [Sports Complexes](#sports-complexes)
- [Courts](#courts)
- [Sports](#sports)
- [Weekly Schedules](#weekly-schedules)
- [Daily Schedules](#daily-schedules)
- [Daily Prices](#daily-prices)
- [Weekly Prices](#weekly-prices)
- [Reservations](#reservations)
- [Matches](#matches)
- [Payments](#payments)

---

## 🔐 Authentication

### POST `/api/auth/login`

Authenticate a user and obtain a JWT token.

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**

```json
{
  "message": "Login successful",
  "data": {
    "id": "uuid",
    "token": "jwt_token",
    "rol": "user" // or "admin"
  }
}
```

**Possible Errors:**

- `401` - Invalid email or password
- `500` - Server error

---

## 👤 User Accounts

### GET `/api/accounts`

Get list of all accounts (App creator only).

**Headers:** `Authorization: Bearer {token}`

**Success Response (200):**

```json
{
  "message": "Account List",
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "birthdate": "1990-01-01",
      "phone": "1234567890",
      "account_type": "user"
    }
  ]
}
```

**Possible Errors:**

- `401` - Not authenticated
- `403` - Not authorized (requires "creator" role)
- `500` - Server error

---

### GET `/api/accounts/:id`

Get account by ID (App creator only).

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Account ID

**Success Response (200):**

```json
{
  "message": "Account found",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "birthdate": "1990-01-01",
    "phone": "1234567890",
    "account_type": "user"
  }
}
```

**Possible Errors:**

- `404` - Account not found
- `401` - Not authenticated
- `403` - Not authorized
- `500` - Server error

---

### POST `/api/accounts`

Create a new user account.

**Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "birthdate": "1990-01-01",
  "phone": "1234567890",
  "account_type": "user"
}
```

**Success Response (201):**

```json
{
  "message": "Account created successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "birthdate": "1990-01-01",
    "phone": "1234567890",
    "account_type": "user"
  }
}
```

**Possible Errors:**

- `500` - Server error (e.g., duplicate email)

---

### PUT `/api/accounts/:id`

Update existing account.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Account ID

**Body (all optional):**

```json
{
  "name": "John Doe Updated",
  "email": "newemail@example.com",
  "birthdate": "1990-01-01",
  "phone": "0987654321"
}
```

**Success Response (200):**

```json
{
  "message": "Account updated successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe Updated",
    "email": "newemail@example.com",
    "birthdate": "1990-01-01",
    "phone": "0987654321",
    "account_type": "user"
  }
}
```

**Possible Errors:**

- `400` - No fields to update
- `404` - Account not found
- `401` - Not authenticated
- `500` - Server error

---

### DELETE `/api/accounts/:id`

Delete an account.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Account ID

**Success Response (200):**

```json
{
  "message": "Account deleted successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Possible Errors:**

- `404` - Account not found
- `401` - Not authenticated
- `403` - Not authorized
- `500` - Server error

---

## 🏢 Sports Complexes

### GET `/api/complexes`

Get list of all sports complexes.

**Success Response (200):**

```json
{
  "message": "Complex List",
  "data": [
    {
      "id": "uuid",
      "admin_id": "uuid",
      "name": "Central Sports Complex",
      "location": "123 Main Avenue",
      "description": "Complex with multiple courts",
      "image_url": "https://cloudinary.com/image.jpg"
    }
  ]
}
```

**Possible Errors:**

- `500` - Server error

---

### POST `/api/complexes`

Create a new sports complex.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "admin_id": "uuid",
  "name": "Central Sports Complex",
  "location": "123 Main Avenue",
  "description": "Complex with multiple courts",
  "image_url": "https://cloudinary.com/image.jpg"
}
```

**Success Response (201):**

```json
{
  "message": "Complex created successfully",
  "data": {
    "id": "uuid",
    "admin_id": "uuid",
    "name": "Central Sports Complex",
    "location": "123 Main Avenue",
    "description": "Complex with multiple courts",
    "image_url": "https://cloudinary.com/image.jpg"
  }
}
```

**Possible Errors:**

- `400` - Admin not found or invalid image URL
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

### PUT `/api/complexes/:id`

Update a sports complex.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Complex ID

**Body (all optional):**

```json
{
  "name": "Central Sports Complex Updated",
  "location": "456 Main Avenue",
  "description": "New description",
  "image_url": "https://cloudinary.com/new-image.jpg"
}
```

**Success Response (200):**

```json
{
  "message": "Complex updated successfully",
  "data": {
    "id": "uuid",
    "name": "Central Sports Complex Updated",
    "location": "456 Main Avenue"
  }
}
```

**Possible Errors:**

- `400` - No fields to update or invalid image URL
- `404` - Complex not found
- `401` - Not authenticated
- `403` - Not authorized
- `500` - Server error

---

### DELETE `/api/complexes/:id`

Delete a sports complex.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Complex ID

**Success Response (200):**

```json
{
  "message": "Complex deleted successfully",
  "data": {
    "id": "uuid",
    "name": "Central Sports Complex"
  }
}
```

**Possible Errors:**

- `404` - Complex not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

## 🎾 Courts

### GET `/api/courts`

Get list of all courts.

**Success Response (200):**

```json
{
  "message": "Court List",
  "data": [
    {
      "id": "uuid",
      "complex_id": "uuid",
      "sport_id": "uuid",
      "name": "Court 1",
      "image_url": "https://cloudinary.com/court.jpg"
    }
  ]
}
```

**Possible Errors:**

- `500` - Server error

---

### POST `/api/courts`

Create a new court.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "complex_id": "uuid",
  "sport_id": "uuid",
  "name": "Court 1",
  "image_url": "https://cloudinary.com/court.jpg"
}
```

**Success Response (201):**

```json
{
  "message": "Court created successfully",
  "data": {
    "id": "uuid",
    "complex_id": "uuid",
    "sport_id": "uuid",
    "name": "Court 1",
    "image_url": "https://cloudinary.com/court.jpg"
  }
}
```

**Possible Errors:**

- `400` - Complex not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

### PUT `/api/courts/:id`

Update a court.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Court ID

**Body (all optional):**

```json
{
  "complex_id": "uuid",
  "sport_id": "uuid",
  "name": "Court 1 Updated",
  "image_url": "https://cloudinary.com/new-court.jpg"
}
```

**Success Response (200):**

```json
{
  "message": "Court updated successfully",
  "data": {
    "id": "uuid",
    "name": "Court 1 Updated"
  }
}
```

**Possible Errors:**

- `400` - No fields to update
- `404` - Court not found
- `401` - Not authenticated
- `403` - Not authorized
- `500` - Server error

---

### DELETE `/api/courts/:id`

Delete a court.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Court ID

**Success Response (200):**

```json
{
  "message": "An error ocurred",
  "error": "Court deleted successfully"
}
```

**Possible Errors:**

- `404` - Court not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

## ⚽ Sports

### GET `/api/sports`

Get list of all sports.

**Success Response (200):**

```json
{
  "message": "Sport List",
  "data": [
    {
      "id": "uuid",
      "name": "Soccer",
      "max_players": 10
    }
  ]
}
```

**Possible Errors:**

- `500` - Server error

---

### POST `/api/sports`

Create a new sport.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "name": "Soccer",
  "max_players": 10
}
```

**Success Response (201):**

```json
{
  "message": "Sport created",
  "data": {
    "id": "uuid",
    "name": "Soccer",
    "max_players": 10
  }
}
```

**Possible Errors:**

- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

### DELETE `/api/sports/:id`

Delete a sport.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (number) - Sport ID

**Success Response (200):**

```json
{
  "message": "Sport deleted",
  "data": {
    "id": "uuid",
    "name": "Soccer"
  }
}
```

**Possible Errors:**

- `404` - Sport not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

## 📅 Weekly Schedules

### GET `/api/schedule-week`

Get list of all weekly schedules.

**Success Response (200):**

```json
{
  "message": "Schedule List",
  "data": [
    {
      "id": "uuid",
      "court_id": "uuid",
      "day_of_week": "Monday",
      "start_time": "08:00:00",
      "end_time": "22:00:00"
    }
  ]
}
```

**Possible Errors:**

- `500` - Server error

---

### POST `/api/schedule-week`

Create a new weekly schedule.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "court_id": "uuid",
  "day_of_week": "Monday",
  "start_time": "08:00:00",
  "end_time": "22:00:00"
}
```

**Success Response (201):**

```json
{
  "message": "Schedule created successfully",
  "data": {
    "id": "uuid",
    "court_id": "uuid",
    "day_of_week": "Monday",
    "start_time": "08:00:00",
    "end_time": "22:00:00"
  }
}
```

**Possible Errors:**

- `400` - Court not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

### PUT `/api/schedule-week/:id`

Update a weekly schedule.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Schedule ID

**Body (all optional):**

```json
{
  "day_of_week": "Tuesday",
  "start_time": "09:00:00",
  "end_time": "23:00:00"
}
```

**Success Response (200):**

```json
{
  "message": "Schedule updated successfully",
  "data": {
    "id": "uuid",
    "day_of_week": "Tuesday"
  }
}
```

**Possible Errors:**

- `400` - No fields to update
- `404` - Schedule not found
- `401` - Not authenticated
- `403` - Not authorized
- `500` - Server error

---

### DELETE `/api/schedule-week/:id`

Delete a weekly schedule.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Schedule ID

**Success Response (200):**

```json
{
  "message": "Schedule deleted successfully",
  "data": {
    "id": "uuid"
  }
}
```

**Possible Errors:**

- `404` - Schedule not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

## 📆 Daily Schedules

### GET `/api/schedule-day`

Get list of all daily schedules.

**Success Response (200):**

```json
{
  "message": "Schedule Day List",
  "data": [
    {
      "id": "uuid",
      "court_id": "uuid",
      "date": "2024-01-15",
      "start_time": "08:00:00",
      "end_time": "22:00:00",
      "status": "available"
    }
  ]
}
```

**Possible Errors:**

- `500` - Server error

---

### POST `/api/schedule-day`

Create a new daily schedule.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "court_id": "uuid",
  "date": "2024-01-15",
  "start_time": "08:00:00",
  "end_time": "22:00:00",
  "status": "available"
}
```

**Success Response (201):**

```json
{
  "message": "Schedule Day created successfully",
  "data": {
    "id": "uuid",
    "court_id": "uuid",
    "date": "2024-01-15",
    "start_time": "08:00:00",
    "end_time": "22:00:00",
    "status": "available"
  }
}
```

**Possible Errors:**

- `400` - Court not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

### PUT `/api/schedule-day/:id`

Update a daily schedule.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Schedule ID

**Body (all optional):**

```json
{
  "date": "2024-01-16",
  "start_time": "09:00:00",
  "end_time": "23:00:00",
  "status": "occupied"
}
```

**Success Response (200):**

```json
{
  "message": "Schedule Day updated successfully",
  "data": {
    "id": "uuid",
    "date": "2024-01-16"
  }
}
```

**Possible Errors:**

- `400` - No fields to update
- `404` - Schedule not found
- `401` - Not authenticated
- `403` - Not authorized
- `500` - Server error

---

### DELETE `/api/schedule-day/:id`

Delete a daily schedule.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Schedule ID

**Success Response (200):**

```json
{
  "message": "Schedule Day deleted successfully",
  "data": {
    "id": "uuid"
  }
}
```

**Possible Errors:**

- `404` - Schedule not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

## 💰 Daily Prices

### GET `/api/schedule-day-price`

Get list of all daily prices.

**Success Response (200):**

```json
{
  "message": "Price List",
  "data": [
    {
      "id": "uuid",
      "court_id": "uuid",
      "date": "2024-01-15",
      "price": 50.0
    }
  ]
}
```

**Possible Errors:**

- `500` - Server error

---

### POST `/api/schedule-day-price`

Create a new daily price.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "court_id": "uuid",
  "date": "2024-01-15",
  "price": 50.0
}
```

**Success Response (201):**

```json
{
  "message": "Price created successfully",
  "data": {
    "id": "uuid",
    "court_id": "uuid",
    "date": "2024-01-15",
    "price": 50.0
  }
}
```

**Possible Errors:**

- `400` - Court not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

### PUT `/api/schedule-day-price/:id`

Update a daily price.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Price ID

**Body:**

```json
{
  "price": 60.0
}
```

**Success Response (200):**

```json
{
  "message": "Price updated successfully",
  "data": {
    "id": "uuid",
    "price": 60.0
  }
}
```

**Possible Errors:**

- `400` - No price provided
- `404` - Price not found
- `401` - Not authenticated
- `403` - Not authorized
- `500` - Server error

---

### DELETE `/api/schedule-day-price/:id`

Delete a daily price.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Price ID

**Success Response (200):**

```json
{
  "message": "Price deleted successfully",
  "data": {
    "id": "uuid"
  }
}
```

**Possible Errors:**

- `404` - Price not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

## 💵 Weekly Prices

### GET `/api/schedule-week-price`

Get list of all weekly prices.

**Success Response (200):**

```json
{
  "message": "Week Price List",
  "data": [
    {
      "id": "uuid",
      "court_id": "uuid",
      "day_of_week": "Monday",
      "price": 45.0
    }
  ]
}
```

**Possible Errors:**

- `500` - Server error

---

### POST `/api/schedule-week-price`

Create a new weekly price.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "court_id": "uuid",
  "day_of_week": "Monday",
  "price": 45.0
}
```

**Success Response (201):**

```json
{
  "message": "Week Price created successfully",
  "data": {
    "id": "uuid",
    "court_id": "uuid",
    "day_of_week": "Monday",
    "price": 45.0
  }
}
```

**Possible Errors:**

- `400` - Court not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

### PUT `/api/schedule-week-price/:id`

Update a weekly price.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Price ID

**Body:**

```json
{
  "price": 50.0
}
```

**Success Response (200):**

```json
{
  "message": "Week Price updated successfully",
  "data": {
    "id": "uuid",
    "price": 50.0
  }
}
```

**Possible Errors:**

- `400` - No price provided
- `404` - Price not found
- `401` - Not authenticated
- `403` - Not authorized
- `500` - Server error

---

### DELETE `/api/schedule-week-price/:id`

Delete a weekly price.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Price ID

**Success Response (200):**

```json
{
  "message": "Week Price deleted successfully",
  "data": {
    "id": "uuid"
  }
}
```

**Possible Errors:**

- `404` - Price not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

## 📝 Reservations

### POST `/api/reservations`

Create a new reservation.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "court_id": "uuid",
  "user_id": "uuid",
  "date": "2024-01-15",
  "start_time": "14:00:00",
  "end_time": "15:00:00"
}
```

**Success Response (201):**

```json
{
  "message": "Reservation created successfully",
  "data": {
    "id": "uuid",
    "court_id": "uuid",
    "user_id": "uuid",
    "date": "2024-01-15",
    "start_time": "14:00:00",
    "end_time": "15:00:00",
    "status": "pending"
  }
}
```

**Possible Errors:**

- `400` - Court not available or invalid time
- `401` - Not authenticated
- `500` - Server error

---

### POST `/api/reservations/cancel`

Cancel an existing reservation.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "reservation_id": "uuid",
  "reason": "Cannot attend"
}
```

**Success Response (200):**

```json
{
  "message": "Reservation cancelled successfully",
  "data": {
    "id": "uuid",
    "status": "cancelled"
  }
}
```

**Possible Errors:**

- `404` - Reservation not found
- `400` - Reservation cannot be cancelled (e.g., too late)
- `401` - Not authenticated
- `500` - Server error

---

## ⚽ Matches

### GET `/api/matches`

Get list of all available matches.

**Headers:** `Authorization: Bearer {token}`

**Success Response (200):**

```json
{
  "message": "Match List",
  "data": [
    {
      "id": "uuid",
      "reservation_id": "uuid",
      "sport_id": "uuid",
      "max_players": 10,
      "current_players": 5,
      "status": "open",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

**Possible Errors:**

- `401` - Not authenticated
- `500` - Server error

---

### POST `/api/matches/join`

Join an existing match.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "match_id": "uuid",
  "user_id": "uuid"
}
```

**Success Response (200):**

```json
{
  "message": "Joined match successfully",
  "data": {
    "match_id": "uuid",
    "user_id": "uuid",
    "current_players": 6
  }
}
```

**Possible Errors:**

- `404` - Match not found
- `400` - Match is full or user already joined
- `401` - Not authenticated
- `500` - Server error

---

### POST `/api/matches/leave`

Leave a match.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "match_id": "uuid",
  "user_id": "uuid"
}
```

**Success Response (200):**

```json
{
  "message": "Left match successfully",
  "data": {
    "match_id": "uuid",
    "current_players": 5
  }
}
```

**Possible Errors:**

- `404` - Match not found
- `400` - User not in match
- `401` - Not authenticated
- `500` - Server error

---

### GET `/api/matches/:id/chat`

Get chat messages for a match.

**Headers:** `Authorization: Bearer {token}`

**Parameters:**

- `id` (string) - Match ID

**Success Response (200):**

```json
{
  "message": "Chat messages",
  "data": [
    {
      "id": "uuid",
      "match_id": "uuid",
      "user_id": "uuid",
      "user_name": "John Doe",
      "message": "See you there!",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Possible Errors:**

- `404` - Match not found
- `401` - Not authenticated
- `403` - Not a member of this match
- `500` - Server error

---

## 💳 Payments

### POST `/api/payments/debit`

Process a debit/credit card payment.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "reservation_id": "uuid",
  "amount": 50.0,
  "card_token": "mercadopago_token",
  "payment_method_id": "visa",
  "payer": {
    "email": "user@example.com",
    "identification": {
      "type": "DNI",
      "number": "12345678"
    }
  }
}
```

**Success Response (201):**

```json
{
  "message": "Payment processed successfully",
  "data": {
    "id": "uuid",
    "reservation_id": "uuid",
    "amount": 50.0,
    "status": "approved",
    "payment_id": "mercadopago_payment_id",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**Possible Errors:**

- `400` - Invalid payment data or card declined
- `404` - Reservation not found
- `401` - Not authenticated
- `500` - Server error

---

### POST `/api/payments/proof`

Generate a payment proof/receipt.

**Headers:** `Authorization: Bearer {token}`

**Body (multipart/form-data):**

- `payment_id` (string) - Payment ID
- `file` (file) - Receipt image file

**Success Response (200):**

```json
{
  "message": "Proof uploaded successfully",
  "data": {
    "payment_id": "uuid",
    "proof_url": "https://cloudinary.com/proof.jpg"
  }
}
```

**Possible Errors:**

- `404` - Payment not found
- `400` - Invalid file format
- `401` - Not authenticated
- `500` - Server error (e.g., upload failed)

---

### POST `/api/payments/bank-transfer`

Create a bank transfer payment.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "reservation_id": "uuid",
  "amount": 50.0,
  "bank_account": "1234567890",
  "account_holder": "John Doe"
}
```

**Success Response (201):**

```json
{
  "message": "Transfer payment created",
  "data": {
    "id": "uuid",
    "reservation_id": "uuid",
    "amount": 50.0,
    "status": "pending",
    "bank_account": "1234567890",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**Possible Errors:**

- `400` - Invalid transfer data
- `404` - Reservation not found
- `401` - Not authenticated
- `500` - Server error

---

### POST `/api/payments/confirm-transfer`

Confirm a bank transfer payment.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "payment_id": "uuid",
  "transfer_code": "ABC123456"
}
```

**Success Response (200):**

```json
{
  "message": "Transfer confirmed successfully",
  "data": {
    "id": "uuid",
    "status": "approved",
    "transfer_code": "ABC123456"
  }
}
```

**Possible Errors:**

- `404` - Payment not found
- `400` - Invalid confirmation data
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

### POST `/api/payments/cash`

Create a cash payment.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "reservation_id": "uuid",
  "amount": 50.0,
  "received_by": "Admin Name"
}
```

**Success Response (201):**

```json
{
  "message": "Cash payment created",
  "data": {
    "id": "uuid",
    "reservation_id": "uuid",
    "amount": 50.0,
    "status": "approved",
    "received_by": "Admin Name",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**Possible Errors:**

- `400` - Invalid payment data
- `404` - Reservation not found
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

### POST `/api/payments/refund`

Process a payment refund.

**Headers:** `Authorization: Bearer {token}`

**Body:**

```json
{
  "payment_id": "uuid",
  "reason": "Customer request"
}
```

**Success Response (200):**

```json
{
  "message": "Refund processed successfully",
  "data": {
    "id": "uuid",
    "payment_id": "uuid",
    "amount": 50.0,
    "status": "refunded",
    "reason": "Customer request",
    "refunded_at": "2024-01-15T11:00:00Z"
  }
}
```

**Possible Errors:**

- `404` - Payment not found
- `400` - Payment cannot be refunded (e.g., already refunded)
- `401` - Not authenticated
- `403` - Not authorized (requires "admin" role)
- `500` - Server error

---

## 📌 Notes

### Authentication

Most endpoints require authentication via JWT token. Include the token in the `Authorization` header as: `Bearer {token}`

### Roles

- **user**: Regular user with basic permissions
- **admin**: Sports complex administrator with management permissions
- **creator**: System creator with full access

### Common Workflows

#### 1. User Registration and Login

```
1. POST /api/accounts (create account)
2. POST /api/auth/login (get JWT token)
3. Use token for authenticated requests
```

#### 2. Create a Sports Complex

```
1. POST /api/auth/login (admin login)
2. POST /api/complexes (create complex)
3. POST /api/courts (add courts)
4. POST /api/schedule-week (set weekly schedules)
5. POST /api/schedule-week-price (set prices)
```

#### 3. Make a Reservation

```
1. GET /api/courts (find available courts)
2. POST /api/reservations (create reservation)
3. POST /api/payments/debit (pay with card)
   OR
   POST /api/payments/bank-transfer (pay via transfer)
```

#### 4. Join a Match

```
1. GET /api/matches (see available matches)
2. POST /api/matches/join (join a match)
3. GET /api/matches/:id/chat (chat with players)
```

### Error Format

All errors follow this format:

```json
{
  "message": "Error description",
  "error": "Detailed error information"
}
```

### WebSocket Events

The API uses WebSocket for real-time updates on:

- New match creations
- Match chat messages
- Reservation status changes
- Payment confirmations

Connect to WebSocket at: `ws://[server-url]/socket.io`

---

**Last Updated:** January 2024  
**API Version:** 1.0  
**Base URL:** `/api`
