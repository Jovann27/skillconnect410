import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  profilePic: { type: String, default: "" },
  role: { type: String, default: "Admin" },
});

adminSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

adminSchema.methods.comparePassword = async function(password) {
  if (!this.password) {
    throw new Error("Password not set for this admin");
  }
  return await bcrypt.compare(password, this.password);
};

adminSchema.methods.getJWTToken = function() {
  return jwt.sign({ id: this._id, type: "admin" }, process.env.ADMIN_JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

export default mongoose.model("Admin", adminSchema);
