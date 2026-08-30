

import { validationResult } from "express-validator";

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.badRequest("Validation Error", errors.array());
  }
  next();
};

export default validate;