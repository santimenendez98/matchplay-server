import { Socket } from "socket.io";
import { io } from "../index";

export const webSocketHandler = (socket: Socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Handle any events or messages from the client
  subscribeNotificationCourt(socket);
  unsubscribeNotificationCourt(socket);

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
