import {
  GetObjectCommand,
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { type S3CreateEvent } from 'aws-lambda';
import csv from 'csv-parser';
import { Readable } from 'stream';

export const handler = async (event: S3CreateEvent) => {
  try {
    const s3Client = new S3Client();
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
        logStream(readable);

        await moveFileToParsed(s3Client, bucket!, key);
      }
    }
  } catch (error) {
    console.error(error);
  }
};

async function moveFileToParsed(client: S3Client, bucket: string, key: string) {
  try {
    const destKey = `parsed/${key.split('/').pop()}`;
    console.log(`copy file ${key} to ${destKey}`);

    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${key}`,
        Key: destKey,
      })
    );
    console.log(`file ${key} successfully copied to parsed folder`);

    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    console.log(`file ${key} successfully deleted`);
  } catch (error) {
    throw error;
  }
}

async function logStream(readable: Readable) {
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
}
