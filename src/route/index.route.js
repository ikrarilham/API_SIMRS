const express = require("express");
const router = express.Router();

const penerimaanRoute = require("./penerimaan/penerimaan.route");
const piutangRoute = require("./piutang/piutang.route");

router.get("/", (req, res) => {
  return res.send("Connected to API SIMRS - SIPD BLUD");
});

router.use("/penerimaan", penerimaanRoute);
router.use("/piutang", piutangRoute);

module.exports = router;
