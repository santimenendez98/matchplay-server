import { v2 as cloudinary } from "cloudinary";

type CloudinaryError = {
  http_code?: number;
  message?: string;
  [key: string]: any;
};

cloudinary.config({
  cloud_name: "duc5utevv",
  api_key: "884112363553158",
  api_secret: "umAlgDw6HDw5dFqwGBxTP2bZ80I",
});

export const verifyCloudinaryFile = async (url: string) => {
  try {
    const resource = await cloudinary.api.resource(url);
    return true;
  } catch (error) {
    const err = error as CloudinaryError;
    if (err.http_code === 404) {
      return false;
    }
    throw err;
  }
};
