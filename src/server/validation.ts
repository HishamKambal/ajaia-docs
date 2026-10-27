import { z } from "zod";

// Request body schemas shared by the API routes (and tested directly).

// Trim and lowercase before validating: people paste emails with stray spaces and capitals.
export const ShareBody = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  role: z.enum(["viewer", "editor"], "Role must be viewer or editor"),
});
