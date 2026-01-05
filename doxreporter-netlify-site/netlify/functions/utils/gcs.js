const { Storage } = require('@google-cloud/storage');

let storage;

function getStorage() {
  if (!storage) {
    const keyFileContent = Buffer.from(
      process.env.GCS_SERVICE_ACCOUNT_KEY,
      'base64'
    ).toString('utf-8');
    
    const credentials = JSON.parse(keyFileContent);
    
    storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials,
    });
  }
  return storage;
}

async function uploadIncidentData(incidentData) {
  const storage = getStorage();
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
  
  const timestamp = Date.now();
  const filename = `incidents/${incidentData.user_id}/${timestamp}.json`;
  const file = bucket.file(filename);
  
  const dataToUpload = {
    ...incidentData,
    uploadedAt: new Date().toISOString(),
    blockchain_verified: true,
  };
  
  try {
    await file.save(JSON.stringify(dataToUpload, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    
    // Make file publicly readable
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filename}`;
    return publicUrl;
  } catch (error) {
    console.error('GCS upload error:', error);
    throw error;
  }
}

module.exports = { uploadIncidentData };

