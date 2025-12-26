import express from "express";
import cors from "cors";
import connectDB from "./db.js";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import crypto from "crypto";
import Signature from "./models/Signature.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// connect DB
connectDB();

app.get("/", (req, res) => {
  res.send("Chandra Kumar Backend is running");
});

// POST /api/sign
// body: { pdfBase64, sigBase64, xPercent, yPercent, widthPercent, pageIndex }
app.post("/api/sign", async (req, res) => {
  try {
    const {
      pdfBase64,
      sigBase64,
      xPercent = 0,
      yPercent = 0,
      widthPercent = 10,
      pageIndex = 0,
    } = req.body;
    if (!pdfBase64 || !sigBase64)
      return res
        .status(400)
        .json({ error: "pdfBase64 and sigBase64 are required" });

    const pdfClean = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(pdfClean, "base64");

    // pre-sign SHA-256
    const preHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    const pg = pages[pageIndex] || pages[0];
    const { width: pageWidth, height: pageHeight } = pg.getSize();

    // prepare signature image
    const sigClean = sigBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
    const sigBuffer = Buffer.from(sigClean, "base64");
    const meta = await sharp(sigBuffer).metadata();
    const imgWidth = meta.width;
    const imgHeight = meta.height;

    // compute target size in PDF points (points = 1/72 inch; pdf-lib uses points)
    const targetWidthPoints = (Number(widthPercent) / 100) * pageWidth;
    const targetHeightPoints = (imgHeight / imgWidth) * targetWidthPoints;

    const xPoints = (Number(xPercent) / 100) * pageWidth;
    const yTopPoints = (Number(yPercent) / 100) * pageHeight; // percent from top
    const yPoints = pageHeight - yTopPoints - targetHeightPoints; // flip Y-axis

    // embed image preserving format
    let embeddedImage;
    const fmt = (meta.format || "").toLowerCase();
    if (fmt === "png") {
      embeddedImage = await pdfDoc.embedPng(sigBuffer);
    } else {
      // treat as jpg/jpeg otherwise
      embeddedImage = await pdfDoc.embedJpg(sigBuffer);
    }

    pg.drawImage(embeddedImage, {
      x: xPoints,
      y: yPoints,
      width: targetWidthPoints,
      height: targetHeightPoints,
    });

    const signedPdfBytes = await pdfDoc.save();
    const postHash = crypto
      .createHash("sha256")
      .update(signedPdfBytes)
      .digest("hex");

    // save record
    try {
      const rec = new Signature({
        preHash,
        postHash,
        meta: { pageIndex, xPercent, yPercent, widthPercent },
      });
      await rec.save();
    } catch (dbErr) {
      console.warn("Failed to save signature record:", dbErr.message || dbErr);
    }

    const outBase64 = Buffer.from(signedPdfBytes).toString("base64");
    res.json({ preHash, postHash, signedPdfBase64: outBase64 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default app;
