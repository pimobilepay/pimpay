import * as jose from "jose";

function getJwtSecrets() {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT secrets are not defined");
  }

  return { 
    accessSecret: new TextEncoder().encode(accessSecret), 
    refreshSecret: new TextEncoder().encode(refreshSecret) 
  };
}

export async function signAccessToken(payload: Record<string, unknown>) {
  const { accessSecret } = getJwtSecrets();

  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(accessSecret);
}

export async function signRefreshToken(payload: Record<string, unknown>) {
  const { refreshSecret } = getJwtSecrets();

  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(refreshSecret);
}

export async function verifyAccessToken(token: string) {
  const { accessSecret } = getJwtSecrets();
  const { payload } = await jose.jwtVerify(token, accessSecret);
  return payload;
}

export async function verifyRefreshToken(token: string) {
  const { refreshSecret } = getJwtSecrets();
  const { payload } = await jose.jwtVerify(token, refreshSecret);
  return payload;
}
