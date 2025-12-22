import jwt from "jsonwebtoken";

function getJwtSecrets() {
  const accessSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT secrets are not defined");
  }

  return { accessSecret, refreshSecret };
}

export function signAccessToken(payload: object) {
  const { accessSecret } = getJwtSecrets();

  return jwt.sign(payload, accessSecret, {
    expiresIn: "15m",
  });
}

export function signRefreshToken(payload: object) {
  const { refreshSecret } = getJwtSecrets();

  return jwt.sign(payload, refreshSecret, {
    expiresIn: "7d",
  });
}

export function verifyAccessToken(token: string) {
  const { accessSecret } = getJwtSecrets();
  return jwt.verify(token, accessSecret);
}

export function verifyRefreshToken(token: string) {
  const { refreshSecret } = getJwtSecrets();
  return jwt.verify(token, refreshSecret);
}
