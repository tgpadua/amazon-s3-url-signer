const mime = require('mime-types');
const { S3Client, GetObjectCommand, PutObjectCommand} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const CMD = process.argv[2];
const BUCKET = process.argv[3];
const FILENAME = process.argv[4];
const OUTPUT = process.argv[5];
const CUSTOM_DOMAIN = process.argv[6];

let error;
if(process.argv.length < 5) {
  error = 'Error: Invalid number of arguments.';
} else if (['get','put'].includes(CMD) == false) {
  error = 'Error: Invalid mode.'
} else if (OUTPUT && ['url','curl'].includes(OUTPUT) == false) {
  error = 'Error: Invalid output.'
}

if(error) {
  console.log(error);
  showUsageBanner();
  return;
}

function showUsageBanner() {
  console.log('Usage: node index [get|put] bucket file [(url)|curl] [custom_domain]');
}

const main = (async() => {
  try {
    let bucketParams = {
      Bucket: BUCKET,
      Key: FILENAME
    };

    const s3Client = new S3Client();
    const command = (CMD == 'get') ? new GetObjectCommand(bucketParams) : new PutObjectCommand(bucketParams);
    let signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    // Replace S3 domain by a custom domain if it was provided
    if(CUSTOM_DOMAIN) {
      signedUrl = signedUrl.replace(/(?<=https:\/\/{1})([\w\d\-\.]+)/, CUSTOM_DOMAIN);
    }

    if(OUTPUT && OUTPUT.toLowerCase() == 'curl') {
      const mimeType = mime.lookup(FILENAME);
      if(CMD == 'get') {
        console.log(`curl -X GET "${signedUrl}"`);
      } else {
        console.log(`curl -H "Content-Type: ${mimeType}" -T "${FILENAME}" "${signedUrl}"`);
      }
    } else {
      console.log(signedUrl);
    }
  } catch (err) {
    console.log('Error creating presigned URL', err);
  }
});

main();