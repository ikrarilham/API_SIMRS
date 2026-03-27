const penerimaanModel = require("../../model/penerimaan/penerimaan.model");
const getKodeOrg = (req) => req.instansiId || req.headers["x-instansiid"] || null;

const penerimaanController = {
  // ==================== INQUIRY PEMBAYARAN SIMRS ====================
  inquiry: (req, res) => {
     const kode_org = getKodeOrg(req);
     const {
      request_id,
      idbilling,
      Unit_Pelaksana,
      Jenis_Transaksi,
      Id_transaksi_piutang,
      Jenis_Pembayaran,
      Nomor_Bukti,
      Tgl_Penerimaan,
      Nama_Objek_Pendapatan,
      Alamat_Objek_Pendapatan,
      Jenis_Penerima,
      Sebagai_Pembayaran,
      Nama_Penerima,
      rincian,
      pajak_list,
    } = req.body;
    console.log("[PENERIMAAN CONTROLLER][INQUIRY] Request body:", req.body);

    // ================= VALIDASI =================
    if (
      !idbilling ||
      !kode_org ||
      !Unit_Pelaksana ||
      !Jenis_Transaksi ||
      !Jenis_Pembayaran ||
      !Nomor_Bukti ||
      !Tgl_Penerimaan ||
      !Nama_Objek_Pendapatan ||
      !Alamat_Objek_Pendapatan ||
      Jenis_Penerima == null ||
      !Sebagai_Pembayaran ||
      !Nama_Penerima ||
      !Array.isArray(rincian) ||
      !Array.isArray(pajak_list)
    ) {
      return res.status(200).send({
        ResponseCode: "01",
        ResponseMessage: "Failed",
        Message: "Request tidak lengkap",
      });
    }

    penerimaanModel
      .inquiry({
        request_id,
        idbilling,
        kode_org,
        Unit_Pelaksana,
        Jenis_Transaksi,
        Id_transaksi_piutang,
        Jenis_Pembayaran,
        Nomor_Bukti,
        Tgl_Penerimaan,
        Nama_Objek_Pendapatan,
        Alamat_Objek_Pendapatan,
        Jenis_Penerima,
        Sebagai_Pembayaran,
        Nama_Penerima,
        rincian,
        pajak_list,
     })
      .then((result) => {
        if (result.responseCode !== "00") {
          return res.status(200).send({
            ResponseCode: result.responseCode,
            ResponseMessage: result.responseMessage,
            Message: result.message,
          });
        }

        return res.status(200).send({
          ResponseCode: "00",
          ResponseMessage: "Success",
          Message: "Data Sudah Ada",
        });
      })
      .catch((err) => {
        console.error("[INQUIRY SIMRS ERROR]", err.message);
        res.status(500).send({
          ResponseCode: "99",
          ResponseMessage: "Failed",
          Message: err.message,
        });
      });
  },

  // ==================== POSTING PEMBAYARAN ====================
  postingPembayaran: (req, res) => {
    const kode_org = getKodeOrg(req);
    const {
      request_id, // optional
      idbilling,
      Unit_Pelaksana,
      Jenis_Transaksi,
      Id_transaksi_piutang,
      Jenis_Pembayaran,
      Nomor_Bukti,
      Tgl_Penerimaan,
      Nama_Objek_Pendapatan,
      Alamat_Objek_Pendapatan,
      Jenis_Penerima,
      Sebagai_Pembayaran,
      Nama_Penerima,
      rincian,
      pajak_list,
    } = req.body;
    console.log("[PENERIMAAN CONTROLLER][POSTING] Request body:", req.body);

    // fallback request_id (opsional)
    //const finalRequestId = request_id || idbilling || null;

    penerimaanModel
      .posting({
        request_id,
        idbilling,
        kode_org,
        Unit_Pelaksana,
        Jenis_Transaksi,
        Id_transaksi_piutang,
        Jenis_Pembayaran,
        Nomor_Bukti,
        Tgl_Penerimaan,
        Nama_Objek_Pendapatan,
        Alamat_Objek_Pendapatan,
        Jenis_Penerima,
        Sebagai_Pembayaran,
        Nama_Penerima,
        rincian,
        pajak_list,
      })
      .then((result) => {
        res.status(200).send({
          responseCode: result.responseCode,
          responseMessage: result.responseMessage,
          message: result.message,
        });
      })
      .catch((err) => {
        console.error(" ERROR di controller postingPembayaran:", err.message);
        res.status(500).send({
          responseCode: err.responseCode || "99",
          responseMessage: err.responseMessage || "Failed",
          message: err.message,
        });
      });
  },
  // ==================== DELETE PEMBAYARAN ====================
  deletePembayaran: (req, res) => {
    const kode_org = getKodeOrg(req);
    const {
      request_id,
      idbilling,
      user,
      note,
      Jenis_Pendapatan,
      Nominal,
      Jenis_Pajak,
      Amount_Pajak,
    } = req.body;
    console.log("[PENERIMAAN CONTROLLER][DELETE] Request body:", req.body);

    penerimaanModel
      .deletePiutang({
        request_id,
        idbilling,
        kode_org,
        user,
        note,
        Jenis_Pendapatan,
        Nominal,
        Jenis_Pajak,
        Amount_Pajak,
      })
      .then((result) => {
        res.status(200).send({
          responseCode: result.responseCode,
          responseMessage: result.responseMessage,
          message: result.message,
        });
      })
      .catch((err) => {
        res.status(500).send({
          responseCode: "99",
          responseMessage: "Failed",
          message: err.message,
        });
      });
  },
};

module.exports = penerimaanController;
