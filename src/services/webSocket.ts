import { Socket } from "socket.io";
import { io } from "../index";
import { SendMessageModel } from "../types/Match";

// WebSocket handler for managing client connections and events
export const webSocketHandler = (socket: Socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Handle any events or messages from the client
  subscribeNotificationCourt(socket);
  unsubscribeNotificationCourt(socket);
  chatHandler(socket);
  handleAdminNotification(socket);

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
};

// Subscribe to court notifications
export const subscribeNotificationCourt = (socket: Socket) => {
  socket.on("subscribeCourt", (schedule_id: string) => {
    console.log(`Client subscribed to notification court: ${schedule_id}`);
    socket.join(`schedule_${schedule_id}`);
  });
};

// Unsubscribe from court notifications
export const unsubscribeNotificationCourt = (socket: Socket) => {
  socket.on("unsubscribeCourt", (schedule_id: string) => {
    console.log(`Client unsubscribed from notification court: ${schedule_id}`);
    socket.leave(`schedule_${schedule_id}`);
  });
};

// Emit notification to all clients subscribed to a specific court
export const emitNotificationCourt = (schedule_id: string) => {
  const roomName = `schedule_${schedule_id}`;
  io.to(roomName).emit("notificationCourt", {
    message: `Court ${schedule_id} is now available for booking.`,
  });
  console.log(`Notification sent to court room: ${roomName}`);
};

// Handle Admin notifications
export const handleAdminNotification = (socket: Socket) => {
  // Join Admin room
  socket.on("JoinAdmin", () => {
    socket.join("admins");
    console.log(`Admin joined: ${socket.id}`);
  });

  // Leave Admin room
  socket.on("LeaveAdmin", () => {
    socket.leave("admins");
    console.log(`Admin left: ${socket.id}`);
  });
};

// Emit notification for reservation cancellation
export const emitNotificationCancelRequest = (reservation_id: string) => {
  io.to("admins").emit("notificationCancelRequest", {
    message: `A cancellation request has been made for reservation ${reservation_id}.`,
  });
  console.log(
    `Cancellation request notification sent for reservation: ${reservation_id}`
  );
};

export const chatHandler = (socket: Socket) => {
  // Handle joining a match
  socket.on("joinMatch", (match_id: string) => {
    console.log(`Client joined match: ${match_id}`);
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
    console.log(`Client left match: ${match_id}`);
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
  console.log(`Message sent to match ${data.match_id}: ${data.message}`);
};

// Join a match room
export const joinMatchRoom = (player_id: string, match_id: string) => {
  const roomName = `match_${match_id}`;
  console.log(`Joining match room: ${roomName} for player: ${player_id}`);
  return roomName;
};

// Leave a match room
export const leaveMatchRoom = (player_id: string, match_id: string) => {
  const roomName = `match_${match_id}`;
  console.log(`Leaving match room: ${roomName} for player: ${player_id}`);
  return roomName;
};

// Emit payment status

export const emitPaymentStatus = (id: number, external_reference: string) => {
  io.emit("payment_success", {
    id,
    external_reference,
  });

  console.log("Payment status emitted success");
};
