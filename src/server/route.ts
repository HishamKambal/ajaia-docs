import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { HttpError, badRequest } from "./errors";

/** Wraps a route handler so thrown HttpErrors / validation errors become JSON responses. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return NextResponse.json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError) {
        const msg = err.issues.map((i) => i.message).join("; ");
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  return schema.parse(body);
}
