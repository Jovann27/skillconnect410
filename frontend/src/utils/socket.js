import { io } from "socket.io-client";

// Socket.io should connect to the base server URL, not the API endpoint
// Extract base URL from API_BASE_URL by removing /api/v1 if present
const getSocketBaseURL = () => {
  const apiBaseURL = import.meta.env.VITE_API_BASE_URL;
  // Remove /api/v1 or /api from the end if present
  return apiBaseURL.replace(/\/api\/v1$|\/api$/, '');
};

const SOCKET_BASE_URL = getSocketBaseURL();

let _socket = null;
let pendingListeners = [];

const socketClient = {
    on(event, cb) {
        if (_socket && typeof _socket.on === "function") return _socket.on(event, cb);
        pendingListeners.push({ event, cb });
    },
    off(event, cb) {
        if (_socket && typeof _socket.off === "function") return _socket.off(event, cb);
        pendingListeners = pendingListeners.filter(l => {
            if (l.event !== event) return true;
            if (cb) return l.cb !== cb;
            return false;
        });
    },
    emit(event, ...args) {
        if (_socket && typeof _socket.emit === "function") return _socket.emit(event, ...args);
    },
    disconnect() {
        if (_socket && typeof _socket.disconnect === "function") {
            _socket.disconnect();
            _socket = null;
        }
    },
    get connected() {
        return _socket ? _socket.connected : false;
    },
    _getRaw() {
        return _socket;
    }
};

const initializeSocket = (token) => {
    if (!token) {
        return null;
    }

    _socket = io(SOCKET_BASE_URL, {
        withCredentials: true,
        query: { token }
    });

    _socket.on("connect_error", (error) => {
        console.warn("Socket connection error:", error.message);
        if (error.message === "Authentication error" || error.message === "Token verification failed" || error.message === "Invalid token" || error.message === "Token expired" || error.message === "No token provided" || error.message === "Not a user token" || error.message === "User not found" || error.message === "Account is banned") {
            console.log("Socket authentication failed, clearing token and disconnecting");
            _socket.disconnect();
            _socket = null;
            localStorage.removeItem("token");
            // Also clear user data to force re-login
            localStorage.removeItem("user");
            localStorage.removeItem("isAuthorized");
            localStorage.removeItem("tokenType");
            // Trigger page reload to force re-authentication
            window.location.reload();
        }
    });

    _socket.on("connect", () => {
        console.log("Socket connected successfully");
    });

    if (pendingListeners.length > 0) {
        pendingListeners.forEach(({ event, cb }) => {
            try {
                _socket.on(event, cb);
            } catch (err) {
                console.error("Failed to attach pending listener", event, err);
            }
        });
        pendingListeners = [];
    }

    return _socket;
};

// Don't auto-initialize socket on module load
// _socket = initializeSocket();

export const updateSocketToken = (token) => {
    if (_socket) {
        _socket.disconnect();
        _socket = null;
    }

    if (token) {
        localStorage.setItem("token", token);
        // Only initialize socket for user tokens, not admin tokens
        const tokenType = localStorage.getItem("tokenType");
        if (tokenType === "user") {
            _socket = initializeSocket(token);
        }
    } else {
        localStorage.removeItem("token");
        _socket = null;
    }
};

export const clearSocket = () => {
    if (_socket) {
        _socket.disconnect();
        _socket = null;
    }
    localStorage.removeItem("token");
};

export default socketClient;
