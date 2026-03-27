const express = require("express");
const router = express.Router();

const basicValidation = require("../../../helper/basicValidation");
const signatureValidation = require("../../../helper/signatureValidation");

const piutangController = require("../../controller/piutang/piutang.controller");

router.post(
  "/inquirypiutang",
  basicValidation,
  signatureValidation,
  piutangController.inquiryPiutang,
);

router.post(
  "/postingpiutang",
  basicValidation,
  signatureValidation,
  piutangController.postingPiutang,
);

router.post(
  "/deletepiutang",
  basicValidation,
  signatureValidation,
  piutangController.deletePiutang,
);

module.exports = router;
