-- Eliminar tablas en orden dependiente para evitar errores
DROP TABLE IF EXISTS HistoryCancelReservation CASCADE;
DROP TABLE IF EXISTS MessageMatch CASCADE;
DROP TABLE IF EXISTS Refund CASCADE;
DROP TABLE IF EXISTS Payment CASCADE;
DROP TABLE IF EXISTS CancelRequest CASCADE;
DROP TABLE IF EXISTS PreRegistration CASCADE;
DROP TABLE IF EXISTS MatchPlayer CASCADE;
DROP TABLE IF EXISTS Match CASCADE;
DROP TABLE IF EXISTS Reservation CASCADE;
DROP TABLE IF EXISTS ScheduleCourt CASCADE;
DROP TABLE IF EXISTS ScheduleCourtPrice CASCADE;
DROP TABLE IF EXISTS WeekScheduleCourt CASCADE;
DROP TABLE IF EXISTS WeekScheduleCourtPrice CASCADE;
DROP TABLE IF EXISTS Court CASCADE;
DROP TABLE IF EXISTS Sport CASCADE;
DROP TABLE IF EXISTS Complex CASCADE;
DROP TABLE IF EXISTS Account CASCADE;

-- Crear tablas

CREATE TABLE Account (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  birthdate DATE NOT NULL,
  phone VARCHAR(9) NOT NULL,
  account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('user', 'admin'))
);

CREATE TABLE Sport (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  max_players INTEGER NOT NULL
);

CREATE TABLE Complex (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES Account(id),
  name VARCHAR(100) NOT NULL,
  location VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(255)
);

CREATE TABLE Court (
  id SERIAL PRIMARY KEY,
  complex_id INTEGER NOT NULL REFERENCES Complex(id),
  sport_id INTEGER NOT NULL REFERENCES Sport(id),
  name VARCHAR(100) NOT NULL,
  image_url VARCHAR(255)
);

CREATE TABLE WeekScheduleCourt (
  id SERIAL PRIMARY KEY,
  court_id INTEGER NOT NULL REFERENCES Court(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE(court_id, day_of_week, start_time, end_time)
);

CREATE TABLE WeekScheduleCourtPrice (
  id SERIAL PRIMARY KEY,
  week_schedule_id INTEGER NOT NULL REFERENCES WeekScheduleCourt(id),
  hourPrice DECIMAL(10, 2) NOT NULL,
  halfPrice DECIMAL(10, 2) NOT NULL,
  UNIQUE(week_schedule_id)
);

CREATE TABLE ScheduleCourt (
  id SERIAL PRIMARY KEY,
  court_id INTEGER NOT NULL REFERENCES Court(id),
  schedule_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (court_id, schedule_date, start_time, end_time)
);

CREATE TABLE ScheduleCourtPrice (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES ScheduleCourt(id),
  hourPrice DECIMAL(10, 2) NOT NULL,
  halfPrice DECIMAL(10, 2) NOT NULL,
  UNIQUE(schedule_id)
);

CREATE TABLE Reservation (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES ScheduleCourt(id),
  account_id INTEGER NOT NULL REFERENCES Account(id),
  price DECIMAL(10, 2) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  time_reserved DECIMAL(10,1) NOT NULL CHECK (time_reserved IN (1, 1.5)),
  reservation_date DATE NOT NULL,
  is_match BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')) DEFAULT 'pending'
);

CREATE TABLE CancelRequest (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER NOT NULL REFERENCES Reservation(id),
  requested_by INTEGER NOT NULL REFERENCES Account(id),
  reason TEXT NOT NULL,
  cancel_status VARCHAR(20) NOT NULL CHECK (cancel_status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by INTEGER REFERENCES Account(id),
  reviewed_at TIMESTAMP
);

CREATE TABLE Match (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER NOT NULL REFERENCES Account(id),
  court_id INTEGER NOT NULL REFERENCES Court(id),
  reservation_id INTEGER NOT NULL REFERENCES Reservation(id),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'ongoing', 'completed', 'cancelled'))
);

CREATE TABLE MatchPlayer (
  match_id INTEGER NOT NULL REFERENCES Match(id),
  player_id INTEGER NOT NULL REFERENCES Account(id),
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (match_id, player_id)
);

CREATE TABLE PreRegistration (
  id SERIAL PRIMARY KEY,
  court_id INTEGER NOT NULL REFERENCES Court(id),
  match_id INTEGER NOT NULL REFERENCES Match(id),
  expiration_date TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour'),
  registration_status VARCHAR(20) NOT NULL CHECK (registration_status IN ('pending', 'confirmed', 'cancelled'))
);

CREATE TABLE Payment (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES Account(id),
  match_id INTEGER NOT NULL REFERENCES Match(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('debit card', 'cash', 'bank_transfer')),
  payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed')),
  payment_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_by INTEGER NOT NULL REFERENCES Account(id)
);

CREATE TABLE Refund (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES Payment(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  refund_method VARCHAR(50) NOT NULL CHECK (refund_method IN ('debit card', 'cash', 'bank_transfer')),
  refund_status VARCHAR(20) NOT NULL CHECK (refund_status IN ('pending', 'completed', 'failed')),
  refund_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  refunded_by INTEGER NOT NULL REFERENCES Account(id),
  refund_reason TEXT NOT NULL
);

CREATE TABLE MessageMatch (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES Match(id),
  sender_id INTEGER NOT NULL REFERENCES Account(id),
  message_content TEXT NOT NULL,
  date_sent TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE HistoryCancelReservation (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER REFERENCES Reservation(id),
  match_id INTEGER REFERENCES Match(id),
  cancelled_by INTEGER NOT NULL REFERENCES Account(id),
  cancellation_reason TEXT NOT NULL,
  cancellation_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
