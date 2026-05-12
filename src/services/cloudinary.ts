import { v2 as cloudinary } from "cloudinary";

type CloudinaryError = {
  http_code?: number;
  message?: string;
  [key: string]: any;
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const verifyCloudinaryFile = async (publicId: string) => {
  try {
    await cloudinary.api.resource(publicId);
    return true;
  } catch (error) {
    const err = error as CloudinaryError;
    if (err.http_code === 404) {
      return false;
    }
    throw err;
  }
};

// Build a signed upload payload for the frontend so the client can upload
// directly to Cloudinary without ever seeing the API secret.
export const buildSignedUpload = (
  folder: string = "matchplay",
  publicId?: string
) => {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = { timestamp, folder };
  if (publicId) paramsToSign.public_id = publicId;

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET || ""
  );

  return {
    signature,
    timestamp,
    folder,
    public_id: publicId,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
  };
};
