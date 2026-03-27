const db = require("mssql/msnodesqlv8");
const connectDatabase = require("../../../helper/connection");
const { response } = require("express");

const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10).replace(/-/g, "");
};
/**
 * =========================
 * MODEL PENERIMAAN SIMRS
 * =========================
 */
const penerimaanModel = {
  /**
   * INQUIRY PEMBAYARAN SIMRS
   */
  inquiry: async (payload) => {
    const config = connectDatabase();
    let request;

    try {
      await db.connect(config);
      const {
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
        rincian = [],
        pajak_list = [],
      } = payload;

      console.log("[INQUIRY] idbilling :", idbilling);

      // ================= HEADER =================
      request = new db.Request();
      request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("kode_org", db.VarChar(50), kode_org);

      const headerRes = await request.query(`
      SELECT
        id                      AS IdPenerimaan,
        idbilling               AS IdBilling,
        kode_org                AS KodeOrg,
        Unit_Pelaksana          AS UnitPelaksana,
        Jenis_Transaksi         AS JenisTransaksi,
        Id_transaksi_piutang    AS IdTransaksiPiutang,
        Jenis_Pembayaran        AS JenisPembayaran,
        Nomor_Bukti             AS NomorBukti,
        Tgl_Penerimaan          AS TanggalPenerimaan,
        Nama_Objek_Pendapatan   AS NamaObjekPendapatan,
        Alamat_Objek_Pendapatan AS AlamatObjekPendapatan,
        Jenis_Penerima          AS JenisPenerima,
        Sebagai_Pembayaran      AS SebagaiPembayaran,
        Nama_Penerima           AS NamaPenerima
      FROM Tu_Penerimaan_stage
      WHERE idbilling = @idbilling
        AND kode_org = @kode_org
    `);

      if (headerRes.recordset.length === 0) {
        return {
          responseCode: "01",
          responseMessage: "Failed",
          message: `ID Billing tidak ditemukan ${idbilling}`,
          data: [],
        };
      }

      const header = headerRes.recordset[0];
      console.log("[PENERIMAAN]", header);

      const isIdTransaksiPiutangProvided =
        Id_transaksi_piutang !== undefined &&
        Id_transaksi_piutang !== null &&
        String(Id_transaksi_piutang).trim() !== "";

      const isHeaderMatch =
        header.IdBilling === idbilling &&
        header.KodeOrg === kode_org &&
        header.UnitPelaksana === Unit_Pelaksana &&
        header.JenisTransaksi === Jenis_Transaksi &&
        (!isIdTransaksiPiutangProvided ||
          String(header.IdTransaksiPiutang ?? "") ===
            String(Id_transaksi_piutang).trim()) &&
        header.JenisPembayaran === Jenis_Pembayaran &&
        header.NomorBukti === Nomor_Bukti &&
        formatDate(header.TanggalPenerimaan) === formatDate(Tgl_Penerimaan) &&
        header.NamaObjekPendapatan === Nama_Objek_Pendapatan &&
        header.AlamatObjekPendapatan === Alamat_Objek_Pendapatan &&
        Number(header.JenisPenerima) === Number(Jenis_Penerima) &&
        header.SebagaiPembayaran === Sebagai_Pembayaran &&
        header.NamaPenerima === Nama_Penerima;

      if (!isHeaderMatch) {
        return {
          responseCode: "01",
          responseMessage: "Failed",
          message: "Data penerimaan tidak ditemukan / tidak cocok",
          data: [],
        };
      }

      // ================= RINCIAN =================
      request = new db.Request();
      request.input(
        "idpenerimaan",
        db.VarChar(50),
        String(header.IdPenerimaan),
      );

      const rincianRes = await request.query(`
      SELECT
        id,
        Jenis_Pendapatan AS JenisPendapatan,
        Nominal
      FROM Tu_Penerimaan_rincian_stage
      WHERE idpenerimaan = @idpenerimaan
    `);

      console.log("[RINCIAN]", rincianRes.recordset);

      for (const item of rincian) {
        const rincianMatch = rincianRes.recordset.some(
          (row) =>
            row.JenisPendapatan === item.Jenis_Pendapatan &&
            Number(row.Nominal) === Number(item.Nominal),
        );

        if (!rincianMatch) {
          return {
            responseCode: "01",
            responseMessage: "Failed",
            message: "Rincian penerimaan tidak cocok",
            data: [],
          };
        }
      }

      // ================= PAJAK =================
      request = new db.Request();
      request
        .input("idreff", db.Int, header.IdPenerimaan)
        .input("kode_org", db.VarChar(50), kode_org);

      const pajakRes = await request.query(`
        SELECT
          kode_org,
          Jenis_Pajak,
          Amount_Pajak,
          Account_Code
        FROM Tu_Pajak_stage
        WHERE idreff = @idreff
          AND kode_org = @kode_org
      `);

      const pajakList = pajakRes.recordset;
      console.log("[PAJAK]", pajakList);

      for (const item of pajak_list) {
        const pajakMatch = pajakList.some(
          (row) =>
            row.Jenis_Pajak === item.Jenis_Pajak &&
            Number(row.Amount_Pajak) === Number(item.Amount_Pajak) &&
            row.Account_Code === item.Account_Code,
        );

        if (!pajakMatch) {
          return {
            responseCode: "01",
            responseMessage: "Failed",
            message: "Pajak penerimaan tidak cocok",
            data: [],
          };
        }
      }

      return {
        responseCode: "00",
        responseMessage: "Success",
        message: "OK",
        data: [header],
        rincian_list: rincianRes.recordset,
        pajak_list: pajakList,
      };
    } catch (err) {
      console.error("[INQUIRY ERROR]", err);
      return {
        responseCode: "99",
        responseMessage: "Query inquiry gagal",
        message: err.message,
        data: [],
      };
    } finally {
      db.close();
    }
  },

  /**
   * POSTING PEMBAYARAN
   */
  posting: async (payload) => {
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
        Id_transaksi_piutang,
        Jenis_Pembayaran,
        Nomor_Bukti,
        Tgl_Penerimaan,
        Nama_Objek_Pendapatan,
        Alamat_Objek_Pendapatan,
        Jenis_Penerima,
        Sebagai_Pembayaran,
        Nama_Penerima,
        rincian = [],
        pajak_list = [],
      } = payload;

      if (!idbilling) {
        return {
          responseCode: "99",
          responseMessage: "Invalid Request",
          message: "idbilling wajib diisi",
        };
      }

      if (!kode_org) {
        return {
          responseCode: "99",
          responseMessage: "Invalid Request",
          message: "kode_org wajib diisi",
        };
      }

      let idPiutangStage = null;

      if (
        Id_transaksi_piutang !== undefined &&
        Id_transaksi_piutang !== null &&
        String(Id_transaksi_piutang).trim() !== ""
      ) {
        const parsedIdPiutang = Number(String(Id_transaksi_piutang).trim());

        if (!Number.isInteger(parsedIdPiutang) || parsedIdPiutang <= 0) {
          return {
            responseCode: "99",
            responseMessage: "Invalid Request",
            message: "Id_transaksi_piutang harus berupa id piutang yang valid",
          };
        }

        request = new db.Request();
        request
          .input("idpiutang", db.Int, parsedIdPiutang)
          .input("kode_org", db.VarChar(50), kode_org);

        const piutangRes = await request.query(`
          SELECT TOP 1 id
          FROM Tu_Piutang_stage
          WHERE id = @idpiutang
            AND kode_org = @kode_org
        `);

        if (piutangRes.recordset.length === 0) {
          return {
            responseCode: "99",
            responseMessage: "Invalid Request",
            message: "Id_transaksi_piutang tidak ditemukan pada data piutang",
          };
        }

        idPiutangStage = String(piutangRes.recordset[0].id);
      }

      transaction = new db.Transaction();
      await transaction.begin();

      // ================= HEADER =================
      request = new db.Request(transaction);
      const headerInsertRes = await request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("kode_org", db.VarChar(50), kode_org)
        .input("Unit_Pelaksana", db.VarChar(55), Unit_Pelaksana)
        .input("Jenis_Transaksi", db.VarChar(15), Jenis_Transaksi)
        .input(
          "Id_transaksi_piutang",
          db.VarChar(50),
          idPiutangStage,
        )
        .input("Jenis_Pembayaran", db.VarChar(30), Jenis_Pembayaran)
        .input("Nomor_Bukti", db.VarChar(255), Nomor_Bukti)
        .input(
          "Tgl_Penerimaan",
          db.Date,
          Tgl_Penerimaan ? new Date(Tgl_Penerimaan) : null,
        )
        .input("Nama_Objek_Pendapatan", db.VarChar(255), Nama_Objek_Pendapatan)
        .input(
          "Alamat_Objek_Pendapatan",
          db.VarChar(255),
          Alamat_Objek_Pendapatan,
        )
        .input("Jenis_Penerima", db.Int, Jenis_Penerima)
        .input("Sebagai_Pembayaran", db.VarChar(255), Sebagai_Pembayaran)
        .input("Nama_Penerima", db.VarChar(255), Nama_Penerima).query(`
        INSERT INTO Tu_Penerimaan_stage (
          idbilling, kode_org, Unit_Pelaksana, Jenis_Transaksi, Id_transaksi_piutang,
          Jenis_Pembayaran, Nomor_Bukti, Tgl_Penerimaan,
          Nama_Objek_Pendapatan, Alamat_Objek_Pendapatan,
          Jenis_Penerima, Sebagai_Pembayaran, Nama_Penerima
        )
        OUTPUT INSERTED.id
        VALUES (
          @idbilling, @kode_org, @Unit_Pelaksana, @Jenis_Transaksi, @Id_transaksi_piutang,
          @Jenis_Pembayaran, @Nomor_Bukti, @Tgl_Penerimaan,
          @Nama_Objek_Pendapatan, @Alamat_Objek_Pendapatan,
          @Jenis_Penerima, @Sebagai_Pembayaran, @Nama_Penerima
        )
      `);

      const idPenerimaanStage = headerInsertRes.recordset[0].id;

      // ================= RINCIAN =================
      for (const item of rincian) {
        request = new db.Request(transaction);
        await request
          .input("idpenerimaan", db.VarChar(50), String(idPenerimaanStage))
          .input("Jenis_Pendapatan", db.VarChar(50), item.Jenis_Pendapatan)
          .input("Nominal", db.Decimal(18, 2), item.Nominal);
        await request.query(`
          INSERT INTO Tu_Penerimaan_rincian_stage
          (idpenerimaan, Jenis_Pendapatan, Nominal)
          VALUES (@idpenerimaan, @Jenis_Pendapatan, @Nominal)
        `);
      }

      // ================= PAJAK =================
      for (const pajak of pajak_list) {
        request = new db.Request(transaction);
        await request
          .input("idreff", db.Int, idPenerimaanStage)
          .input("kode_org", db.VarChar(50), kode_org)
          .input("Jenis_Pajak", db.VarChar(50), pajak.Jenis_Pajak)
          .input("Amount_Pajak", db.Decimal(18, 2), pajak.Amount_Pajak)
          .input("Account_Code", db.VarChar(55), pajak.Account_Code).query(`
          INSERT INTO Tu_Pajak_stage
          (idreff, kode_org, Jenis_Pajak, Amount_Pajak, Account_Code)
          VALUES (@idreff, @kode_org, @Jenis_Pajak, @Amount_Pajak, @Account_Code)
        `);
      }

      await transaction.commit();

      return {
        responseCode: "00",
        responseMessage: "Success",
        message: "OK",
        data: { idbilling },
      };
    } catch (err) {
      if (transaction) await transaction.rollback();
      return {
        responseCode: "99",
        responseMessage: "Query posting gagal",
        message: err.message,
      };
    } finally {
      db.close();
    }
  },
  /**
   * DELETE PEMBAYARAN
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
        //Jenis_Pendapatan,
        //Nominal,
        //Jenis_Pajak,
        //Amount_Pajak,
      } = payload;

      transaction = new db.Transaction();
      await transaction.begin();

      // ================= AMBIL HEADER =================
      request = new db.Request(transaction);
      request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("kode_org", db.VarChar(50), kode_org);

      const headerRes = await request.query(`
      SELECT *
      FROM Tu_Penerimaan_stage
      WHERE idbilling = @idbilling
        AND (@kode_org IS NULL OR kode_org = @kode_org)
    `);

      if (headerRes.recordset.length === 0) {
        return {
          responseCode: "99",
          responseMessage: "Failed",
          message: `IdBilling ${idbilling} tidak ditemukan`,
        };
      }

      const header = headerRes.recordset[0];
      const idPenerimaanStage = Number(header.id);

      // ================= AMBIL RINCIAN =================
      request = new db.Request(transaction);
      request.input("idpenerimaan", db.VarChar(50), String(idPenerimaanStage));

      const rincianRes = await request.query(`
      SELECT *
      FROM Tu_Penerimaan_rincian_stage
      WHERE idpenerimaan = @idpenerimaan
    `);

      // ================= AMBIL PAJAK =================
      request = new db.Request(transaction);
      request
        .input("idreff", db.Int, idPenerimaanStage)
        .input("kode_org", db.VarChar(50), kode_org);

      const pajakRes = await request.query(`
      SELECT *
      FROM Tu_Pajak_stage
      WHERE idreff = @idreff
        AND (@kode_org IS NULL OR kode_org = @kode_org)
    `);

      // ================= INSERT LOG =================

      const logHeader = {
        ...header,
        User: user,
        Note: note,
      };

      request = new db.Request(transaction);
      request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("user", db.VarChar(50), user)
        .input("note", db.VarChar(255), note)
        .input("header", db.NVarChar, JSON.stringify(logHeader))
        .input("rincian", db.NVarChar, JSON.stringify(rincianRes.recordset))
        .input("pajak", db.NVarChar, JSON.stringify(pajakRes.recordset));

      await request.query(`
      INSERT INTO Tu_Penerimaan_Delete_Log
      (idbilling, user_delete, note_delete, header_json, rincian_json, pajak_json)
      VALUES (@idbilling, @user, @note, @header, @rincian, @pajak)
    `);

      // ================= DELETE PAJAK =================
      request = new db.Request(transaction);
      request
        .input("idreff", db.Int, idPenerimaanStage)
        .input("kode_org", db.VarChar(50), kode_org);
      await request.query(`
        DELETE FROM Tu_Pajak_stage
        WHERE idreff = @idreff
          AND (@kode_org IS NULL OR kode_org = @kode_org)
      `);

      // ================= DELETE RINCIAN =================
      request = new db.Request(transaction);
      request.input("idpenerimaan", db.VarChar(50), String(idPenerimaanStage));
      await request.query(`
        DELETE FROM Tu_Penerimaan_rincian_stage
        WHERE idpenerimaan = @idpenerimaan
      `);

      // ================= DELETE HEADER =================
      request = new db.Request(transaction);
      request
        .input("idbilling", db.VarChar(50), idbilling)
        .input("kode_org", db.VarChar(50), kode_org);
      await request.query(`
        DELETE FROM Tu_Penerimaan_stage
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
      return {
        responseCode: "99",
        responseMessage: "Query delete gagal",
        message: err.message,
      };
    } finally {
      db.close();
    }
  },
};

module.exports = penerimaanModel;
