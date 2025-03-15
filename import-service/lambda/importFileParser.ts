import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { type S3CreateEvent } from 'aws-lambda';
import csv from 'csv-parser';
import { Readable } from 'node:stream';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { btoa } from 'node:buffer';

export const handler = async (event: S3CreateEvent) => {
  try {
    const s3Client = new S3Client();
    const bucket = process.env.BUCKET_NAME;

    if (!bucket) {
      throw new Error('Bucket name is not set');
    }

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
        await sendToQueue(readable);
        await moveFileToParsed(s3Client, bucket, key);
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

async function sendToQueue(readable: Readable) {
  const sqsClient = new SQSClient();

  await new Promise((resolve, reject) => {
    readable
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.trim().toLowerCase(),
          mapValues: ({ value, header }) => {
            if (/price/i.test(header)) {
              return parseInt(value.trim());
            }
            if (/count/i.test(header)) {
              return parseInt(value.trim());
            }
            return value.trim();
          },
          strict: true,
        })
      )
      .on('data', (data) => {
        const message = btoa(JSON.stringify(data));
        console.log(`Sending to queue ->  "${message}"`);
        sqsClient
          .send(
            new SendMessageCommand({
              QueueUrl: process.env.SQS_URL,
              MessageBody: message,
              DelaySeconds: 5,
              MessageAttributes: {
                source: {
                  DataType: 'String',
                  StringValue: 'import-service',
                },
              },
            })
          )
          .then(() => {
            console.log('Message sent to queue');
          })
          .catch((error) => {
            console.error('Error sending message to queue: ', error);
          });
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
