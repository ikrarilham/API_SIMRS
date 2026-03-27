const db = require("mssql/msnodesqlv8");
const connectDatabase = require("../../../helper/connection");
const { response } = require("express");

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10).replace(/-/g, "");
};
/**
 * =========================
 * MODEL PIUTANG SIMRS
 * =========================
 */
const piutangModel = {
  /**
   * INQUIRY PIUTANG SIMRS
   */
  inquiryPiutang: async (payload) => {
    const config = connectDatabase();
    let request;

    try {
      await db.connect(config);

      const {
        idbilling,
        kode_org,
        Unit_Pelaksana,
        Jenis_Transaksi,
        Nomor_Bukti,
        Tahun_piutang,
        Tgl_Piutang,
        Nama,
        Keterangan,
        rincian = [],
      } = payload;

      // ================= HEADER =================
      request = new db.Request();
      request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("kode_org", db.VarChar(50), kode_org)
        .input("Unit_Pelaksana", db.VarChar(100), Unit_Pelaksana)
        .input("Jenis_Transaksi", db.VarChar(20), Jenis_Transaksi)
        .input("Nomor_Bukti", db.VarChar(100), Nomor_Bukti)
        .input("Tahun_piutang", db.VarChar(4), Tahun_piutang)
        .input("Tgl_Piutang", db.Date, new Date(Tgl_Piutang))
        .input("Nama", db.VarChar(255), Nama)
        .input("Keterangan", db.VarChar(255), Keterangan);

      const headerRes = await request.query(`
      SELECT *
      FROM Tu_Piutang_stage
      WHERE idbilling = @idbilling
        AND kode_org = @kode_org
        AND Unit_Pelaksana = @Unit_Pelaksana
        AND Jenis_Transaksi = @Jenis_Transaksi
        AND Nomor_Bukti = @Nomor_Bukti
        AND Tahun_piutang = @Tahun_piutang
        AND Tgl_Piutang = @Tgl_Piutang
        AND Nama = @Nama
        AND Keterangan = @Keterangan
    `);

      if (headerRes.recordset.length === 0) {
        return {
          responseCode: "01",
          responseMessage: "Transaksi Gagal",
          message: "Data piutang tidak ditemukan / tidak cocok",
        };
      }

      const idpiutang = headerRes.recordset[0].id;

      // ================= RINCIAN =================
      for (const item of rincian) {
        request = new db.Request();
        request
          .input("idpiutang", db.Int, idpiutang)
          .input(
            "Jenis_Piutang_Pendapatan",
            db.VarChar(100),
            item.Jenis_Piutang_Pendapatan,
          )
          .input("Nominal", db.Decimal(18, 2), item.Nominal)
          .input("Jenis_Denda", db.VarChar(100), item.Jenis_Denda)
          .input("Nominal_Denda", db.Decimal(18, 2), item.Nominal_Denda)
          .input("Total", db.Decimal(18, 2), item.Total);

        const rincianRes = await request.query(`
        SELECT 1
        FROM Tu_Piutang_rincian_stage
        WHERE idpiutang = @idpiutang
          AND Jenis_Piutang_Pendapatan = @Jenis_Piutang_Pendapatan
          AND Nominal = @Nominal
          AND Jenis_Denda = @Jenis_Denda
          AND Nominal_Denda = @Nominal_Denda
          AND Total = @Total
      `);

        if (rincianRes.recordset.length === 0) {
          return {
            responseCode: "01",
            responseMessage: "Transaksi Gagal",
            message: "Rincian piutang tidak cocok",
          };
        }
      }

      return {
        responseCode: "00",
        responseMessage: "Success",
        message: "Data Sudah Ada",
      };
    } catch (err) {
      return {
        responseCode: "99",
        responseMessage: "Data Not Found",
        message: err.message,
      };
    } finally {
      db.close();
    }
  },
  /**
   * POSTING PIUTANG SIMRS
   */
  postingPiutang: async (payload) => {
    const config = connectDatabase();
    let transaction;
    let request;

    try {
      await db.connect(config);

      const {
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
        rincian = [],
      } = payload;

      // ================= VALIDASI =================
      if (Jenis_Transaksi !== "Piutang") {
        return {
          responseCode: "01",
          responseMessage: "Transaksi Gagal",
          message: "Jenis_Transaksi harus Piutang",
        };
      }

      if (
        !idbilling ||
        !kode_org ||
        !Unit_Pelaksana ||
        !Nomor_Bukti ||
        !Tahun_piutang ||
        !Tgl_Piutang ||
        !Tgl_Batas_Pembayaran
      ) {
        return {
          responseCode: "01",
          responseMessage: "Transaksi Gagal",
          message: "Field wajib tidak lengkap",
        };
      }

      if (!Array.isArray(rincian) || rincian.length === 0) {
        return {
          responseCode: "01",
          responseMessage: "Transaksi Gagal",
          message: "Rincian piutang wajib diisi",
        };
      }

      const tglPiutang = new Date(Tgl_Piutang);
      if (isNaN(tglPiutang)) {
        return {
          responseCode: "01",
          responseMessage: "Transaksi Gagal",
          message: "Format Tgl_Piutang tidak valid",
        };
      }
      const tglbataspembayaran = new Date(Tgl_Batas_Pembayaran);
      if (isNaN(tglbataspembayaran)) {
        return {
          responseCode: "01",
          responseMessage: "Transaksi Gagal",
          message: "Format Tgl_Piutang tidak valid",
        };
      }

      // ================= CEK DUPLICATE =================
      request = new db.Request();
      request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("kode_org", db.VarChar(50), kode_org);

      const exist = await request.query(`
      SELECT 1 FROM Tu_Piutang_stage WHERE idbilling = @idbilling AND kode_org = @kode_org
    `);

      if (exist.recordset.length > 0) {
        return {
          responseCode: "02",
          responseMessage: "Data sudah ada",
          message: "Data sudah ada",
        };
      }

      transaction = new db.Transaction();
      await transaction.begin();

      // ================= INSERT HEADER =================
      request = new db.Request(transaction);
      const headerRes = await request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("kode_org", db.VarChar(50), kode_org)
        .input("Unit_Pelaksana", db.VarChar(100), Unit_Pelaksana)
        .input("Jenis_Transaksi", db.VarChar(20), Jenis_Transaksi)
        .input("Nomor_Bukti", db.VarChar(100), Nomor_Bukti)
        .input("Tahun_piutang", db.VarChar(4), Tahun_piutang)
        .input("Tgl_Piutang", db.Date, tglPiutang)
        .input("Tgl_Batas_Pembayaran", db.Date, tglbataspembayaran)
        .input("Nama", db.VarChar(255), Nama)
        .input("Keterangan", db.VarChar(255), Keterangan).query(`
        INSERT INTO Tu_Piutang_stage (
          idbilling, kode_org, Unit_Pelaksana, Jenis_Transaksi,
          Nomor_Bukti, Tahun_piutang, Tgl_Piutang,Tgl_Batas_Pembayaran,
          Nama, Keterangan
        )
        OUTPUT INSERTED.id
        VALUES (
          @idbilling, @kode_org, @Unit_Pelaksana, @Jenis_Transaksi,
          @Nomor_Bukti, @Tahun_piutang, @Tgl_Piutang,@Tgl_Batas_Pembayaran,
          @Nama, @Keterangan
        )
      `);

      const idpiutang = headerRes.recordset[0].id;

      // ================= INSERT RINCIAN =================
      for (const item of rincian) {
        request = new db.Request(transaction);
        await request
          .input("idpiutang", db.Int, idpiutang)
          .input(
            "Jenis_Piutang_Pendapatan",
            db.VarChar(100),
            item.Jenis_Piutang_Pendapatan,
          )
          .input("Nominal", db.Decimal(18, 2), item.Nominal)
          .input("Jenis_Denda", db.VarChar(100), item.Jenis_Denda)
          .input("Nominal_Denda", db.Decimal(18, 2), item.Nominal_Denda)
          .input("Total", db.Decimal(18, 2), item.Total).query(`
          INSERT INTO Tu_Piutang_rincian_stage
          (idpiutang, Jenis_Piutang_Pendapatan, Nominal, Jenis_Denda, Nominal_Denda, Total)
          VALUES
          (@idpiutang, @Jenis_Piutang_Pendapatan, @Nominal, @Jenis_Denda, @Nominal_Denda, @Total)
        `);
      }

      await transaction.commit();

      return {
        responseCode: "00",
        responseMessage: "Success",
        message: "OK",
      };
    } catch (err) {
      if (transaction) await transaction.rollback();
      return {
        responseCode: "01",
        responseMessage: "Transaksi Gagal",
        message: err.message,
      };
    } finally {
      db.close();
    }
  },
  /**
   * DELETE PIUTANG SIMRS
   */
  deletePiutang: async (payload) => {
    const config = connectDatabase();
    let transaction;
    let request;

    try {
      await db.connect(config);

      const {
        idbilling,
        kode_org,
        user,
        note,
        Jenis_Piutang_Pendapatan,
        Nominal,
        Jenis_Denda,
        Nominal_Denda,
        Total,
      } = payload;

      // ================= CEK HEADER =================
      request = new db.Request();
      request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("kode_org", db.VarChar(50), kode_org);

      const headerRes = await request.query(`
      SELECT id
      FROM Tu_Piutang_stage
      WHERE idbilling = @idbilling
        AND (@kode_org IS NULL OR kode_org = @kode_org)
    `);

      if (headerRes.recordset.length === 0) {
        return {
          responseCode: "01",
          responseMessage: "Failed",
          message: "Data piutang tidak ditemukan",
        };
      }

      const idpiutang = headerRes.recordset[0].id;

      transaction = new db.Transaction();
      await transaction.begin();

      // ================= AMBIL RINCIAN =================
      request = new db.Request(transaction);
      request.input("idpiutang", db.Int, idpiutang);

      const rincianRes = await request.query(`
        SELECT *
        FROM Tu_Piutang_rincian_stage
        WHERE idpiutang = @idpiutang
      `);

      // ================= INSERT LOG =================
      const logHeader = {
        ...headerRes.recordset[0],
        User: user,
        Note: note,
      };

      request = new db.Request(transaction);
      request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("user", db.VarChar(50), user)
        .input("note", db.VarChar(255), note)
        .input("header", db.NVarChar(db.MAX), JSON.stringify(logHeader))
        .input(
          "rincian",
          db.NVarChar(db.MAX),
          JSON.stringify(rincianRes.recordset),
        );

      await request.query(`
        INSERT INTO Tu_Piutang_Delete_Log
        (idbilling, user_delete, note_delete, header_json, rincian_json)
        VALUES (@idbilling, @user, @note, @header, @rincian)
      `);

      // ================= DELETE RINCIAN =================
      request = new db.Request(transaction);
      request
        .input("idpiutang", db.Int, idpiutang)
        .input(
          "Jenis_Piutang_Pendapatan",
          db.VarChar(100),
          Jenis_Piutang_Pendapatan,
        )
        .input("Nominal", db.Decimal(18, 2), Nominal)
        .input("Jenis_Denda", db.VarChar(100), Jenis_Denda)
        .input("Nominal_Denda", db.Decimal(18, 2), Nominal_Denda)
        .input("Total", db.Decimal(18, 2), Total);

      const rincianDelete = await request.query(`
      DELETE FROM Tu_Piutang_rincian_stage
      WHERE idpiutang = @idpiutang
        AND Jenis_Piutang_Pendapatan = @Jenis_Piutang_Pendapatan
        AND Nominal = @Nominal
        AND Jenis_Denda = @Jenis_Denda
        AND Nominal_Denda = @Nominal_Denda
        AND Total = @Total
    `);

      if (rincianDelete.rowsAffected[0] === 0) {
        await transaction.rollback();
        return {
          responseCode: "01",
          responseMessage: "Failed",
          message: "Data rincian tidak cocok",
        };
      }

      // ================= DELETE HEADER =================
      request = new db.Request(transaction);
      request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("kode_org", db.VarChar(50), kode_org);

      await request.query(`
      DELETE FROM Tu_Piutang_stage
      WHERE idbilling = @idbilling
        AND (@kode_org IS NULL OR kode_org = @kode_org)
    `);

      await transaction.commit();

      return {
        responseCode: "00",
        responseMessage: "Success",
        message: "OK",
      };
    } catch (err) {
      if (transaction) await transaction.rollback();
      console.error("[DELETE PIUTANG MODEL ERROR]", err);

      return {
        responseCode: "99",
        responseMessage: "Query delete piutang gagal",
        message: err.message,
      };
    } finally {
      db.close();
    }
  },
};

module.exports = piutangModel;
