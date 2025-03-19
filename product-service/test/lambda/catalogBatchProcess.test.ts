import { SQSEvent, SQSRecord } from 'aws-lambda';
import { handler } from '../../lambda/catalogBatchProcess';
import { mockClient } from 'aws-sdk-client-mock';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { validateCreateProduct } from '../../lambda/validateCreateProduct';
import { createProductInDb } from '../../lambda/createProductInDb';

jest.mock('../../lambda/validateCreateProduct', () => {
  return {
    validateCreateProduct: jest.fn(),
  };
});

jest.mock('../../lambda/createProductInDb', () => {
  return {
    createProductInDb: jest.fn(),
  };
});

const mockRecords: SQSRecord[] = [
  {
    messageId: '1',
    messageAttributes: {
      source: {
        dataType: 'String',
        stringValue: 'import-service',
      },
    },
    body: JSON.stringify({
      title: 'title',
      description: 'description',
      price: 1,
      count: 1,
    }),
    attributes: {
      ApproximateReceiveCount: '1',
      SentTimestamp: '1',
      SenderId: '',
      ApproximateFirstReceiveTimestamp: '',
    },
    awsRegion: '',
    eventSource: '',
    eventSourceARN: '',
    md5OfBody: '',
    receiptHandle: '',
  },
];

describe('catalogBatchProcess', () => {
  const snsClientMock = mockClient(SNSClient);

  beforeEach(() => {
    snsClientMock.reset();
  });

  it('should work', async () => {
    const validateMock = (
      validateCreateProduct as jest.Mock
    ).mockImplementation(() => []);
    const createProductMock = (
      createProductInDb as jest.Mock
    ).mockResolvedValue({});

    snsClientMock.on(PublishCommand).resolves({});

    const mockEvent: SQSEvent = {
      Records: mockRecords,
    };
    await handler(mockEvent);

    expect(validateMock).toHaveBeenCalled();
    expect(createProductMock).toHaveBeenCalled();

    expect(snsClientMock.commandCalls(PublishCommand)).toHaveLength(1);
  });
});
