import jwt from "jsonwebtoken";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.unauthorized("Missing token");

    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = decode;

    if (decode.type === "doctor") {
      req.user = await Doctor.findById(decode.id);
    } else if (decode.type === "patient") {
      req.user = await Patient.findById(decode.id);
    }

    if (!req.user) return res.unauthorized("Invalid user");
    next();
  } catch (error) {
    return res.unauthorized("Invalid or expired token");
  }
};

export const requireRole = (role) => (req, res, next) => {
  if (!req.auth || req.auth.type !== role) {
    return res.forbidden("Insufficient role permissions");
  }
  next();
};

export default { authenticate, requireRole };