import multer from "multer";
import path from "path";

// Store uploads temporarily on local disk (public/temp). The controller then
// pushes the file to Cloudinary and deletes this temp copy.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // Unique name to avoid collisions: fieldname-timestamp-random.ext
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${unique}${path.extname(file.originalname)}`);
  },
});

// Accept image files only; reject anything else with a 400.
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    const error = new Error("Only image files are allowed");
    error.statusCode = 400;
    cb(error, false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
});
