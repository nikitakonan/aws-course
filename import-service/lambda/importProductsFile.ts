import { type APIGatewayEvent, type APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const csvFileName = event.queryStringParameters?.name;
    console.log('get file with name ', csvFileName);

    if (!csvFileName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Parameter `name` is required' }),
      };
    }

    const key = `uploaded/${csvFileName}`;
    const client = new S3Client({
      region: process.env.AWS_REGION,
    });

    const command = new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(client, command, {
      expiresIn: 3600,
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: signedUrl,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error', error }),
    };
  }
};
