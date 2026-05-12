// Stub for the cloudinary service.

export const verifyCloudinaryFile = jest.fn();

export const buildSignedUpload = jest.fn((folder = "matchplay", publicId?: string) => ({
  signature: "fake-signature",
  timestamp: 1700000000,
  folder,
  public_id: publicId,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "test_cloud",
  api_key: process.env.CLOUDINARY_API_KEY || "test_key",
}));
