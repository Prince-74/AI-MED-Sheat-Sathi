import crypto from "crypto";

export const DEFAULT_ZEGO_APP_ID = 1879308119;
export const DEFAULT_ZEGO_SERVER_SECRET = "6bead71a81dc89b14db8c8fa9074ee2c";

/**
 * Generates official Zego Token04 for WebRTC authentication
 * @param {Object} params - { appId, userId, secret, effectiveTimeInSeconds, payload }
 * @returns {string} Token04 formatted string starting with "04"
 */
export function generateZegoToken04({
  appId = Number(process.env.ZEGO_APP_ID || DEFAULT_ZEGO_APP_ID),
  userId,
  secret = String(process.env.ZEGO_SERVER_SECRET || DEFAULT_ZEGO_SERVER_SECRET),
  effectiveTimeInSeconds = 3600, // 1 hour expiration
  payload = "",
}) {
  if (!appId || typeof appId !== "number") {
    throw new Error("Invalid or missing Zego appId.");
  }
  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid or missing userId.");
  }
  if (!secret || typeof secret !== "string" || secret.length !== 32) {
    throw new Error("Invalid Zego server secret. Expected 32-character string.");
  }
  if (!effectiveTimeInSeconds || typeof effectiveTimeInSeconds !== "number") {
    throw new Error("Invalid effectiveTimeInSeconds.");
  }

  const createTime = Math.floor(Date.now() / 1000);
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: Math.floor(Math.random() * 2147483647),
    ctime: createTime,
    expire: createTime + effectiveTimeInSeconds,
    payload: typeof payload === "object" ? JSON.stringify(payload) : String(payload || ""),
  };

  const plainText = JSON.stringify(tokenInfo);
  const iv = crypto.randomBytes(16);

  // 32-character secret key uses AES-256-CBC with utf-8 key buffer
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(secret, "utf8"), iv);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);

  const expireBuffer = Buffer.alloc(8);
  expireBuffer.writeBigInt64BE(BigInt(tokenInfo.expire), 0);

  const ivLenBuffer = Buffer.alloc(2);
  ivLenBuffer.writeUInt16BE(iv.length, 0);

  const contentLenBuffer = Buffer.alloc(2);
  contentLenBuffer.writeUInt16BE(encrypted.length, 0);

  const tokenBuffer = Buffer.concat([
    expireBuffer,
    ivLenBuffer,
    iv,
    contentLenBuffer,
    encrypted,
  ]);

  return "04" + tokenBuffer.toString("base64");
}

/**
 * Generates an authorized consultation room payload for an appointment participant
 */
export function generateConsultationToken({
  appointmentId,
  userId,
  userName = "Participant",
  role = "patient",
  roomId,
  expirationSeconds = 3600,
}) {
  const appId = Number(process.env.ZEGO_APP_ID || DEFAULT_ZEGO_APP_ID);
  const secret = String(process.env.ZEGO_SERVER_SECRET || DEFAULT_ZEGO_SERVER_SECRET);
  const derivedRoomId = roomId || `room_${appointmentId}`;

  const payload = JSON.stringify({
    room_id: derivedRoomId,
    privilege: {
      1: 1, // login room
      2: 1, // publish stream
    },
    stream_id_list: null,
  });

  const token = generateZegoToken04({
    appId,
    userId: String(userId),
    secret,
    effectiveTimeInSeconds: expirationSeconds,
    payload,
  });

  return {
    appId,
    token,
    roomId: derivedRoomId,
    userId: String(userId),
    userName,
    role,
    expiresInSeconds: expirationSeconds,
  };
}
