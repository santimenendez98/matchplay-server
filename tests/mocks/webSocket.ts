// Stub for `src/services/webSocket` used during tests so that the router
// can be loaded without importing the real server bootstrap (`src/index.ts`).

export const webSocketHandler = jest.fn();
export const subscribeNotificationCourt = jest.fn();
export const unsubscribeNotificationCourt = jest.fn();
export const handleAdminNotification = jest.fn();
export const chatHandler = jest.fn();

export const emitNotificationCourt = jest.fn();
export const emitNotificationCancelRequest = jest.fn();
export const emitMessageToMatch = jest.fn();
export const emitPaymentStatus = jest.fn();
export const joinMatchRoom = jest.fn();
export const leaveMatchRoom = jest.fn();
