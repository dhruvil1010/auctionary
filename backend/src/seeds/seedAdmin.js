// One-off script to create (or promote) an admin account.
// Admins are NOT created via public signup, so run this once:
//   1) set ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD in .env
//   2) npm run seed:admin
import "dotenv/config";
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { User } from "../models/user.model.js";

const run = async () => {
  const username = process.env.ADMIN_USERNAME || "admin";
  const email = (process.env.ADMIN_EMAIL || "admin@auction.local").toLowerCase();

  await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

  let user = await User.findOne({ email });
  if (user) {
    user.role = "admin";
    // Only reset the password if one was explicitly provided.
    if (process.env.ADMIN_PASSWORD) {
      user.password = process.env.ADMIN_PASSWORD; // re-hashed by the model's pre-save hook
    }
    await user.save();
    console.log(`✅ Promoted existing user to admin: ${user.username} <${user.email}>`);
  } else {
    const password = process.env.ADMIN_PASSWORD || "admin12345";
    user = await User.create({ username, email, password, role: "admin" });
    console.log(`✅ Created admin: ${user.username} <${user.email}>`);
  }
  console.log("   Log in with that email + the password you set.");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("❌ seed:admin failed:", err);
  process.exit(1);
});
