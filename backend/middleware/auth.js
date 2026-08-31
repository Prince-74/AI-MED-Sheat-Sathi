import jwt from "jsonwebtoken";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";
import { getJwtSecret } from "../services/auth/tokenService.js";

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

    if (!token) {
      return res.unauthorized("Authentication token required");
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    if (!decoded || !decoded.id || !decoded.type) {
      return res.unauthorized("Malformed authentication token");
    }

    req.auth = {
      id: decoded.id.toString(),
      type: decoded.type,
    };

    if (decoded.type === "doctor") {
      req.user = await Doctor.findById(decoded.id).select("-password -googleId");
    } else if (decoded.type === "patient") {
      req.user = await Patient.findById(decoded.id).select("-password -googleId");
    }

    if (!req.user || req.user.isActive === false) {
      return res.unauthorized("User account not found or deactivated");
    }

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.unauthorized("Token expired");
    }
    return res.unauthorized("Invalid or malformed token");
  }
};

export const requireRole = (role) => (req, res, next) => {
  if (!req.auth || req.auth.type !== role) {
    return res.forbidden(`Access denied: Requires ${role} role`);
  }
  next();
};

export default { authenticate, requireRole };
