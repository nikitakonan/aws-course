import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { type SQSHandler } from 'aws-lambda';
import { CreateProduct } from '../model/CreateProduct';
import { createProductInDb } from './createProductInDb';
import { validateCreateProduct } from './validateCreateProduct';
import { atob } from 'node:buffer';

export const handler: SQSHandler = async (event) => {
  try {
    console.log(
      'catalogBatchProcess handler. Number of records ',
      event.Records.length
    );
    const snsClient = new SNSClient();
    const promises = event.Records.filter((record) => {
      return record.messageAttributes?.source?.stringValue === 'import-service';
    }).map((record) => {
      console.log('Start batch process ', record.messageId, record.body);
      console.log('source: ', record.messageAttributes.source.stringValue);
      console.log('body: ', record.body);
      const message = atob(record.body);
      console.log('message: ', message);
      const productToCreate = JSON.parse(message) as Partial<CreateProduct>;
      const errors = validateCreateProduct(productToCreate);
      if (errors.length > 0) {
        console.error('Validation failed: ', errors);
        return null;
      } else {
        return createProductInDb(productToCreate as CreateProduct);
      }
    });

    if (promises.length) {
      const createdProducts = await Promise.all(promises);

      snsClient.send(
        new PublishCommand({
          TopicArn: process.env.SNS_TOPIC_ARN,
          Subject: 'Products created',
          Message: `Products created successfully - ${createdProducts
            .filter((p) => !!p)
            .map((p) => p.title)
            .join(', ')}`,
          MessageAttributes: {
            status: {
              DataType: 'String',
              StringValue: 'success',
            },
          },
        })
      );
    }
  } catch (error) {
    console.error('Error processing batch: ', error);
    throw error;
  }
};
