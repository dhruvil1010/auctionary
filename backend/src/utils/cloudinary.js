import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary from env vars. (Credentials get filled into .env when we
// wire up auction image upload; until then uploadOnCloudinary is simply not called.)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // return https:// URLs (avoids mixed-content on an HTTPS frontend)
});

/**
 * Multer first saves an uploaded file to public/temp on local disk. We then push
 * that local file to Cloudinary and delete the temp copy. Returns the Cloudinary
 * response (which contains the hosted `url`) or null on failure.
 */
const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath); // remove temp file after a successful upload
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); // clean up temp file even if the upload failed
    return null;
  }
};

export { uploadOnCloudinary };
