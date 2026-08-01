import { io } from "socket.io-client";
import { SOCKET_URL } from "./client";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ["websocket"] });
  }
  return socket;
}
