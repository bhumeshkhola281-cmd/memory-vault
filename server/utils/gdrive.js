import { google } from 'googleapis';
import fs from 'fs';

let driveClient = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  // Try OAuth2 first (personal account with storage quota)
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    try {
      const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
      oauth2.setCredentials({ refresh_token: refreshToken });
      driveClient = google.drive({ version: 'v3', auth: oauth2 });
      console.log('[GDrive] Using OAuth2 (personal account)');
      return driveClient;
    } catch (err) {
      console.error('[GDrive] OAuth2 init error:', err.message);
    }
  }

  // OAuth2 not configured - don't fall back to service account
  // (service accounts have no storage quota)
  return null;
}

export function isDriveConfigured() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const client = getDriveClient();
  return Boolean(client && folderId);
}

export async function uploadToDrive(filePath, fileName, mimeType) {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!drive || !folderId) {
    throw new Error('Google Drive is not configured on server');
  }

  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };

  const media = {
    mimeType: mimeType || 'application/octet-stream',
    body: fs.createReadStream(filePath)
  };

  const response = await drive.files.create(
    {
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink'
    },
    {
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    }
  );

  // Make file publicly accessible by link
  try {
    await drive.permissions.create({
      fileId: response.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });
  } catch (permErr) {
    console.warn('Could not set public permission on Drive file:', permErr.message);
  }

  return response.data;
}

export async function getDriveStream(fileId, range) {
  const drive = getDriveClient();
  if (!drive) throw new Error('Google Drive client unavailable');

  const headers = {};
  if (range) {
    headers.Range = range;
  }

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream', headers }
  );

  return {
    stream: res.data,
    headers: res.headers
  };
}

export async function deleteFromDrive(fileId) {
  const drive = getDriveClient();
  if (!drive || !fileId) return false;

  try {
    await drive.files.delete({ fileId });
    return true;
  } catch (err) {
    console.error('Failed to delete file ' + fileId + ' from Google Drive:', err.message);
    return false;
  }
}
