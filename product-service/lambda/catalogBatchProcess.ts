import { type SQSHandler } from 'aws-lambda';
import { CreateProduct } from '../model/CreateProduct';
import { validateCreateProduct } from './validateCreateProduct';
import { createProductInDb } from './createProductInDb';

export const handler: SQSHandler = async (event) => {
  try {
    for (const record of event.Records) {
      const productToCreate = JSON.parse(record.body) as Partial<CreateProduct>;
      const errors = validateCreateProduct(productToCreate);
      if (errors.length > 0) {
        console.error('Validation failed: ', record.body);
        // TODO something with this error
      } else {
        await createProductInDb(productToCreate as CreateProduct);
      }
    }
  } catch (error) {
    console.error('Error processing batch: ', error);
    throw error;
  }
};
