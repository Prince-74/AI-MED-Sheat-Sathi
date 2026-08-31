

import { validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    const specificMessage = errorList.map((e) => e.msg).filter(Boolean).join(", ") || "Validation Error";
    return res.badRequest(specificMessage, errorList);
  }
  next();
};

export default validate;