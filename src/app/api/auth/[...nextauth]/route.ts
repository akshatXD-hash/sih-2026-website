import { handlers } from "@/auth";

// Auth.js requires this protocol handler. Feature form submissions use Server
// Actions; future non-auth Route Handlers are reserved for the FastAPI boundary.
export const { GET, POST } = handlers;
