const express = require("express");
const router = express.Router();

const basicValidation = require("../../../helper/basicValidation");
const signatureValidation = require("../../../helper/signatureValidation");

const penerimaanController = require("../../controller/penerimaan/penerimaan.controller");

router.post(
  "/inquirypembayaran",
  basicValidation,
  signatureValidation,
  penerimaanController.inquiry,
);

router.post(
  "/postingpembayaran",
  basicValidation,
  signatureValidation,
  penerimaanController.postingPembayaran,
);

router.post(
  "/deletepembayaran",
  basicValidation,
  signatureValidation,
  penerimaanController.deletePembayaran,
);

module.exports = router;
