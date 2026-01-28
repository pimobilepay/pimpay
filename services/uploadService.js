const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const uploadAvatar = async (fileId) => {
  // On envoie l'image vers le cloud
  const result = await cloudinary.uploader.upload(fileId, {
    folder: "pimpay/avatars",
    transformation: [{ width: 200, height: 200, crop: "fill" }] // Carré parfait
  });
  return result.secure_url; // C'est cette URL qu'on mettra dans Prisma
};

