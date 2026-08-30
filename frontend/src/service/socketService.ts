// src/service/socketService.ts
import { io, Socket } from "socket.io-client";
import { BASE_URL } from "./httpService";

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    const socketUrl = BASE_URL.replace(/\/api$/, "");
    socketInstance = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log("? Connected to AI-MED Real-time Sockets:", socketInstance?.id);
    });

    socketInstance.on("disconnect", () => {
      console.log("?? Disconnected from AI-MED Real-time Sockets");
    });
  }

  return socketInstance;
};

export const joinRoom = (roomId: string) => {
  const socket = getSocket();
  socket.emit("join_room", roomId);
};

export const leaveRoom = (roomId: string) => {
  const socket = getSocket();
  socket.emit("leave_room", roomId);
};
