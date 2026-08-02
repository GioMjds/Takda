import { z } from "zod";
import { http, createEndpoint } from "./fetch";

const LoginRes = z.object({ token: z.string() });

// Should type-check: body is present, response is present.
async function ok() {
  const r = await http.post("/v1/auth/login", {
    body: { email: "a@b.c", password: "pw" },
    response: LoginRes,
  });
  return r.token;
}

// Should be a type error: body missing on POST.
async function missingBody() {
  // @ts-expect-error
  await http.post("/v1/auth/login", { response: LoginRes });
}

// Should be a type error: body supplied on GET.
async function extraBody() {
  // @ts-expect-error
  await http.get("/v1/x", { body: { nope: true }, response: LoginRes });
}

// createEndpoint prefix applies.
async function ep() {
  const auth = createEndpoint("/v1/auth");
  const r = await auth.post("login", {
    body: { email: "a@b.c", password: "pw" },
    response: LoginRes,
  });
  return r.token;
}