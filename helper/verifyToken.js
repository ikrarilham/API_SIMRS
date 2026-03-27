/** Import Modules */
const jwt = require("jsonwebtoken");
/** Import JWT_PRIVATE_KEY from ENV */
const { JWT_PRIVATE_KEY } = process.env;

const verifyToken = (req, res, next) => {
  const token = req.header("token");
  if (!req.header("token")) {
    return res.status(400).send({
      message: "required token",
    });
  } else {
    jwt.verify(token, JWT_PRIVATE_KEY, function (err, decoded) {
      if (!err) {
        if (decoded.role === "admin") {
          next();
        } else if (decoded.role === "user") {
          return res.status(403).send({
            message: "Kamu tidak memiliki akses",
          });
        } else {
          return res.status(403).send({
            message: "Kamu tidak memiliki akses",
          });
        }
      } else {
        return res.status(400).send({
          message: "token tidak valid",
        });
      }
    });
  }
};

/** Export verifyToken */
module.exports = verifyToken;
