import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { type S3CreateEvent } from 'aws-lambda';
import csv from 'csv-parser';
import { Readable } from 'stream';

export const handler = async (event: S3CreateEvent) => {
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
    });
    const bucket = process.env.BUCKET_NAME;

    for (const record of event.Records) {
      const key = record.s3.object.key;
      console.log('Processing file: ', key);

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3Client.send(command);

      if (response.Body) {
        const readable = Readable.from(response.Body as any);
        await new Promise((resolve, reject) => {
          readable
            .pipe(csv())
            .on('data', (data) => {
              console.log('CSV data: ', data);
            })
            .on('end', () => {
              console.log('CSV file successfully processed');
              resolve(true);
            })
            .on('error', (error) => {
              console.error('Error processing CSV file: ', error);
              reject(error);
            });
        });

        // TODO move to parsed folder
      }
    }
  } catch (error) {
    console.error(error);
  }
};
