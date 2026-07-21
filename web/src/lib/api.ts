import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: string;
  details?: unknown;
};

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400, details?: unknown) {
  const body: ApiErrorBody = { error: message };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}
