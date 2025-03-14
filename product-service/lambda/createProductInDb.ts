import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { type CreateProduct } from '../model/CreateProduct';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const createProductInDb = async (productToCreate: CreateProduct) => {
  if (!productToCreate.id) {
    productToCreate.id = randomUUID();
  }
  const { count, ...product } = productToCreate;
  const stock = {
    product_id: product.id,
    count,
  };

  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: process.env.PRODUCTS_TABLE_NAME,
            Item: product,
          },
        },
        {
          Put: {
            TableName: process.env.STOCKS_TABLE_NAME,
            Item: stock,
          },
        },
      ],
    })
  );
};
