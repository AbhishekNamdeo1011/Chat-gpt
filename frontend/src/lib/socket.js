import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL;
let socket;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }

  return socket;
}

export async function connectSocket() {
  const instance = getSocket();

  if (instance.connected) {
    return instance;
  }

  return new Promise((resolve, reject) => {
    const onConnect = () => {
      cleanup();
      resolve(instance);
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      instance.off("connect", onConnect);
      instance.off("connect_error", onError);
    };

    instance.on("connect", onConnect);
    instance.on("connect_error", onError);
    instance.connect();
  });
}
