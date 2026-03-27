const crypto = require("crypto");
const { SECRETKEYHMACSHA256 } = process.env;

const signatureValidation = (req, res, next) => {
  /* =======================
     HEADER & BODY
  ======================= */
  const contentType = req.headers["content-type"];
  const reqSignature = req.headers["x-signature"];
  const instansiId = req.headers["x-instansiid"];
  const timeStamp = req.headers["x-timestamp"];

  const requestId = req.body.request_id;
  const idbilling = req.body.idbilling || "";

  const path = req.originalUrl.toLowerCase();

  /* =======================
     BASIC HEADER CHECK
  ======================= */
  if (!reqSignature || !instansiId || !timeStamp) {
    return res.status(400).json({
      responseCode: "99",
      responseMessage: "Invalid Header",
      message: "Header signature tidak lengkap",
    });
  }

  if (!requestId) {
    return res.status(400).json({
      responseCode: "99",
      responseMessage: "Invalid Body",
      message: "request_id wajib diisi",
    });
  }

  /* =======================
     STRING TO SIGN
  ======================= */
  let stringToSign = "";

  //  DELETE PEMBAYARAN & DELETE PIUTANG
  // (X-INSTANSI_ID|REQUEST_ID|X-TIMESTAMP)
  if (path.includes("/deletepembayaran") || path.includes("/deletepiutang")) {
    stringToSign = `${instansiId}|${requestId}|${timeStamp}`;
  }

  // INQUIRY & POSTING & DELETE PEMBAYARAN
  // (X-INSTANSI_ID|REQUEST_ID|IDBILLING|X-TIMESTAMP)
  else if (
    path.includes("/inquirypembayaran") ||
    path.includes("/postingpembayaran") ||
    path.includes("/inquirypiutang") ||
    path.includes("/postingpiutang")
  ) {
    stringToSign = `${instansiId}|${requestId}|${idbilling}|${timeStamp}`;
  } else {
    return res.status(400).json({
      responseCode: "99",
      responseMessage: "Unsupported Endpoint",
      message: "Endpoint tidak dikenali untuk signature SIMRS",
    });
  }

  /* =======================
     GENERATE SIGNATURE
  ======================= */
  const generatedSignature = crypto
    .createHmac("sha256", SECRETKEYHMACSHA256)
    .update(stringToSign)
    .digest("base64");

  /* =======================
     DEBUG LOG (AMAN)
  ======================= */
  console.log("=============================================");
  console.log(" SIMRS SIGNATURE VALIDATION");
  console.log("---------------------------------------------");
  console.log(" Endpoint      :", path);
  console.log(" Instansi ID   :", instansiId);
  console.log(" Request ID    :", requestId);
  console.log(" Idbilling     :", idbilling || "-");
  console.log(" Timestamp     :", timeStamp);
  console.log(" StringToSign  :", stringToSign);
  console.log(" Signature API :", generatedSignature);
  console.log(" Signature Req :", reqSignature);
  console.log(
    generatedSignature === reqSignature
      ? " Signature MATCH"
      : " Signature MISMATCH"
  );
  console.log("=============================================");

  /* =======================
     COMPARE SIGNATURE
  ======================= */
  if (generatedSignature !== reqSignature) {
    return res.status(403).json({
      responseCode: "01",
      responseMessage: "Invalid Signature",
      message: "Signature tidak valid",
    });
  }

  /* =======================
     PASS TO NEXT
  ======================= */
  req.signature = generatedSignature;
  req.instansiId = instansiId;
  req.request_id = requestId;
  req.idbilling = idbilling;
  req.timeStamp = timeStamp;
  req.contentType = contentType;

  next();
};

module.exports = signatureValidation;
