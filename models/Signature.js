import mongoose from "mongoose";

const SignatureSchema = new mongoose.Schema({
  preHash: { type: String, required: true },
  postHash: { type: String, required: true },
  meta: { type: Object },
  createdAt: { type: Date, default: Date.now },
});

const Signature =
  mongoose.models.Signature || mongoose.model("Signature", SignatureSchema);
export default Signature;
