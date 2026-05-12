import { Socket } from "socket.io";
import { io } from "../index";
import { SendMessageModel } from "../types/Match";
import { verifyToken } from "./jwtService";
import logger from "./logger";

// Middleware: only accept Socket.IO connections that present a valid JWT.
export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  try {
    const raw =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.headers?.authorization as string | undefined);
    if (!raw) return next(new Error("Authentication required"));
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;
    const payload = verifyToken(token);
    if (payload.type && payload.type !== "access") {
      return next(new Error("Invalid token"));
    }
    (socket as any).user = payload;
    next();
  } catch (e) {
    next(new Error("Invalid token"));
  }
};

// WebSocket handler for managing client connections and events
export const webSocketHandler = (socket: Socket) => {
  logger.debug({ socketId: socket.id }, "New socket client connected");

  // Handle any events or messages from the client
  subscribeNotificationCourt(socket);
  unsubscribeNotificationCourt(socket);
  chatHandler(socket);
  handleAdminNotification(socket);

  socket.on("disconnect", () => {
    logger.debug({ socketId: socket.id }, "Socket client disconnected");
  });
};

// Subscribe to court notifications
export const subscribeNotificationCourt = (socket: Socket) => {
  socket.on("subscribeCourt", (schedule_id: string) => {
    logger.debug({ schedule_id }, "Client subscribed to court room");
    socket.join(`schedule_${schedule_id}`);
  });
};

// Unsubscribe from court notifications
export const unsubscribeNotificationCourt = (socket: Socket) => {
  socket.on("unsubscribeCourt", (schedule_id: string) => {
    logger.debug({ schedule_id }, "Client unsubscribed from court room");
    socket.leave(`schedule_${schedule_id}`);
  });
};

// Emit notification to all clients subscribed to a specific court
export const emitNotificationCourt = (schedule_id: string) => {
  const roomName = `schedule_${schedule_id}`;
  io.to(roomName).emit("notificationCourt", {
    message: `Court ${schedule_id} is now available for booking.`,
  });
  logger.debug({ roomName }, "Notification sent to court room");
};

// Handle Admin notifications
export const handleAdminNotification = (socket: Socket) => {
  // Join Admin room
  socket.on("JoinAdmin", () => {
    const user = (socket as any).user;
    if (!user || (user.rol !== "admin" && user.rol !== "creator")) {
      logger.warn({ socketId: socket.id }, "JoinAdmin denied: not admin");
      return;
    }
    socket.join("admins");
    logger.debug({ socketId: socket.id }, "Admin socket joined");
  });

  // Leave Admin room
  socket.on("LeaveAdmin", () => {
    socket.leave("admins");
    logger.debug({ socketId: socket.id }, "Admin socket left");
  });
};

// Emit notification for reservation cancellation
export const emitNotificationCancelRequest = (reservation_id: string) => {
  io.to("admins").emit("notificationCancelRequest", {
    message: `A cancellation request has been made for reservation ${reservation_id}.`,
  });
  logger.debug({ reservation_id }, "Cancellation request notification sent");
};

export const chatHandler = (socket: Socket) => {
  // Handle joining a match
  socket.on("joinMatch", (match_id: string) => {
    logger.debug({ match_id, socketId: socket.id }, "Client joined match");
    socket.join(`match_${match_id}`);
  });

  // Handle sending a new message
  socket.on("newMessage", (data: SendMessageModel) => {
    const payload = {
      match_id: data.match_id,
      player_id: data.player_id,
      message: data.message,
      sent_at: data.sent_at,
    };

    io.to(`match_${data.match_id}`).emit("newMessage", payload);
  });

  // Handle leaving a match
  socket.on("leaveMatch", (match_id: string) => {
    logger.debug({ match_id, socketId: socket.id }, "Client left match");
    socket.leave(`match_${match_id}`);
  });
};

// Emit a message to a specific match room
export const emitMessageToMatch = (data: SendMessageModel) => {
  io.to(`match_${data.match_id}`).emit("newMessage", {
    match_id: data.match_id,
    player_id: data.player_id,
    message: data.message,
    sent_at: data.sent_at,
  });
  logger.debug({ match_id: data.match_id }, "Message sent to match room");
};

// Join a match room
export const joinMatchRoom = (player_id: string, match_id: string) => {
  const roomName = `match_${match_id}`;
  logger.debug({ roomName, player_id }, "Joining match room");
  return roomName;
};

// Leave a match room
export const leaveMatchRoom = (player_id: string, match_id: string) => {
  const roomName = `match_${match_id}`;
  logger.debug({ roomName, player_id }, "Leaving match room");
  return roomName;
};

// Emit payment status

export const emitPaymentStatus = (id: number, external_reference: string) => {
  io.emit("payment_success", {
    id,
    external_reference,
  });

  logger.debug({ id, external_reference }, "Payment status emitted");
};
