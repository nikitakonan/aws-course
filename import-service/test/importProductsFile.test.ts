import { type APIGatewayEvent } from 'aws-lambda';
import { handler } from '../lambda/importProductsFile';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('mocked-signed-url'),
}));

const createMockEvent = (
  queryStringParameters: APIGatewayEvent['queryStringParameters']
): APIGatewayEvent => {
  return {
    queryStringParameters,
  } as APIGatewayEvent;
};

describe('importProductsFile', () => {
  const s3Client = mockClient(S3Client);

  beforeEach(() => {
    s3Client.reset();
    jest.clearAllMocks();
    (getSignedUrl as jest.Mock).mockResolvedValue('mocked-signed-url');
  });

  it('should return 400 when no name is provided', async () => {
    const event = createMockEvent({});

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(result.body).toBe(
      JSON.stringify({ message: 'Parameter `name` is required' })
    );
  });

  it('should create signed url', async () => {
    const event = createMockEvent({ name: 'test.csv' });

    s3Client.on(PutObjectCommand).resolves({});
    const response = await handler(event);

    expect(getSignedUrl).toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('mocked-signed-url');
  });
});
