const piutangModel = require("../../model/piutang/piutang.model");

// Helper untuk format angka desimal
const formatDecimal = (value) =>
  value != null ? Number(value).toFixed(2) : null;
const getKodeOrg = (req) => req.instansiId || req.headers["x-instansiid"] || null;

const piutangController = {
  // ==================== INQUIRY PIUTANG ====================
  inquiryPiutang: (req, res) => {
    const kode_org = getKodeOrg(req);
    const {
      request_id,
      idbilling,
      Unit_Pelaksana,
      Jenis_Transaksi,
      Nomor_Bukti,
      Tahun_piutang,
      Tgl_Piutang,
      Nama,
      Keterangan,
      rincian,
    } = req.body;
    console.log("[PIUTANG CONTROLLER][INQUIRY] Request body:", req.body);

    // ================= VALIDASI =================
    if (
      !idbilling ||
      !kode_org ||
      !Unit_Pelaksana ||
      !Jenis_Transaksi ||
      !Nomor_Bukti ||
      !Tahun_piutang ||
      !Tgl_Piutang ||
      !Nama ||
      !Array.isArray(rincian)
    ) {
      return res.status(200).send({
        responseCode: "01",
        responseMessage: "Failed",
        message: "Request tidak lengkap",
      });
    }

    piutangModel
      .inquiryPiutang({
        request_id,
        idbilling,
        kode_org,
        Unit_Pelaksana,
        Jenis_Transaksi,
        Nomor_Bukti,
        Tahun_piutang,
        Tgl_Piutang,
        Nama,
        Keterangan,
        rincian,
      })
      .then((result) => {
        if (result.responseCode !== "00") {
          return res.status(200).send({
            responseCode: result.responseCode,
            responseMessage: result.responseMessage,
            message: result.message,
          });
        }

        res.status(200).send({
          responseCode: result.responseCode,
          responseMessage: result.responseMessage,
          message: result.message,
          data: result.data,
          rincian: result.rincian,
        });
      })
      .catch((err) => {
        console.error("ERROR di controller inquiryPiutang:", err.message);
        res.status(500).send({
          responseCode: "99",
          responseMessage: "Failed",
          message: err.message,
        });
      });
  },

  /// ==================== POSTING PIUTANG ====================
  postingPiutang: (req, res) => {
    const kode_org = getKodeOrg(req);
    const {
      request_id, // optional
      idbilling,
      Unit_Pelaksana,
      Jenis_Transaksi,
      Nomor_Bukti,
      Tahun_piutang,
      Tgl_Piutang,
      Tgl_Batas_Pembayaran,
      Nama,
      Keterangan,
      rincian,
    } = req.body;
    console.log("[PIUTANG CONTROLLER][POSTING] Request body:", req.body);

    // fallback request_id (opsional, konsisten dg pembayaran)
    //const finalRequestId = request_id || idbilling || null;

    piutangModel
      .postingPiutang({
        request_id,
        idbilling,
        kode_org,
        Unit_Pelaksana,
        Jenis_Transaksi,
        Nomor_Bukti,
        Tahun_piutang,
        Tgl_Piutang,
        Tgl_Batas_Pembayaran,
        Nama,
        Keterangan,
        rincian,
      })
      .then((result) => {
        res.status(200).send({
          responseCode: result.responseCode,
          responseMessage: result.responseMessage,
          message: result.message,
        });
      })
      .catch((err) => {
        console.error(" ERROR di controller postingPiutang:", err.message);
        res.status(500).send({
          responseCode: err.responseCode || "99",
          responseMessage: err.responseMessage || "Failed",
          message: err.message,
        });
      });
  },
  // ==================== DELETE PIUTANG ====================
  deletePiutang: (req, res) => {
    const kode_org = getKodeOrg(req);
    const {
      request_id, // optional
      idbilling,
      user,
      note,
      Jenis_Piutang_Pendapatan,
      Nominal,
      Jenis_Denda,
      Nominal_Denda,
      Total,
    } = req.body;
    console.log("[PIUTANG CONTROLLER][DELETE] Request body:", req.body);

    // ================= VALIDASI REQUEST =================
    if (
      !idbilling ||
      !user ||
      !note ||
      !Jenis_Piutang_Pendapatan ||
      Nominal == null ||
      !Jenis_Denda ||
      Nominal_Denda == null ||
      Total == null
    ) {
      return res.status(200).send({
        responseCode: "01",
        responseMessage: "Failed",
        message: "Request tidak lengkap",
      });
    }

    piutangModel
      .deletePiutang({
        request_id,
        idbilling,
        kode_org,
        user,
        note,
        Jenis_Piutang_Pendapatan,
        Nominal,
        Jenis_Denda,
        Nominal_Denda,
        Total,
      })
      .then((result) => {
        res.status(200).send({
          responseCode: result.responseCode,
          responseMessage: result.responseMessage,
          message: result.message,
        });
      })
      .catch((err) => {
        console.error("ERROR di controller deletePiutang:", err.message);
        res.status(500).send({
          responseCode: "99",
          responseMessage: "Failed",
          message: err.message,
        });
      });
  },
};

module.exports = piutangController;
