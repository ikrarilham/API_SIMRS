const { USERAUTH } = process.env;

const basicValidation = (req, res, next) => {
  /**variable declaration */
  const auth = req.headers.authorization; //headers for authorization for a while
  const userAuth = USERAUTH;
  const userAuthEncoded =
    "Basic" + " " + Buffer.from(userAuth).toString("base64");
  /** end of variable declaration */
  /** validation condition */
  if (!auth || auth == "Basic Og==") {
    return res.status(403).send({
      message: "Auth is required",
    });
  } else if (auth != userAuthEncoded) {
    return res.status(403).send({
      message: "Invalid Auth",
    });
  } else if (!req.body.request_id) {
    return res.status(403).send({
      message: "invalid request_id",
    });
  } else {
    req.userAuth = userAuthEncoded;
  }
  /** end of validation condition */
  next();
};

module.exports = basicValidation;
