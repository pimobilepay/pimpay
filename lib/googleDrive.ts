import { google } from "googleapis";
import { Readable } from "stream";

/**
 * Upload d'un fichier de sauvegarde vers Google Drive via un compte de service.
 *
 * Variables d'environnement requises :
 *  - GOOGLE_SERVICE_ACCOUNT_EMAIL : e-mail du compte de service (xxx@xxx.iam.gserviceaccount.com)
 *  - GOOGLE_PRIVATE_KEY           : clé privée du compte de service (garder les \n)
 *  - GOOGLE_DRIVE_FOLDER_ID       : ID du dossier Drive (partagé avec le compte de service)
 */
export async function uploadBackupToDrive(
  fileName: string,
  content: string
): Promise<{ id: string; name: string; webViewLink?: string | null }> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!email || !rawKey || !folderId) {
    throw new Error(
      "Configuration Google Drive manquante (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID)."
    );
  }

  // La clé privée stockée en variable d'env contient des \n littéraux à convertir.
  const privateKey = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  const drive = google.drive({ version: "v3", auth });

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: "application/json",
    },
    media: {
      mimeType: "application/json",
      body: Readable.from([content]),
    },
    fields: "id, name, webViewLink",
  });

  return {
    id: res.data.id || "",
    name: res.data.name || fileName,
    webViewLink: res.data.webViewLink,
  };
}
