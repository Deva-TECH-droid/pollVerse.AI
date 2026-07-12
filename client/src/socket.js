import { io } from 'socket.io-client';

// In production (Vercel), set REACT_APP_API_URL to your Render backend URL
// e.g. https://livepollverse.onrender.com
const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
