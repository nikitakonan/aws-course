import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { type APIGatewayEvent } from 'aws-lambda';
import { Product } from '../model/Product';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const validateProduct = ({ title, description, price }: Partial<Product>) => {
  const errors: string[] = [];

  if (!title) {
    errors.push('Title is required');
  }
  if (typeof title !== 'string') {
    errors.push('Title must be a string');
  }
  if (typeof description !== 'string') {
    errors.push('Description must be a string');
  }
  if (typeof price !== 'number') {
    errors.push('Price must be a number');
  }

  return errors;
};

export const handler = async (event: APIGatewayEvent) => {
  try {
    const productToCreate: Partial<Product> = JSON.parse(event.body || '{}');

    const errors = validateProduct(productToCreate);
    if (errors.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Invalid product data',
          errors,
        }),
      };
    }

    productToCreate.id = randomUUID();

    const response = await dynamo.send(
      new PutCommand({
        TableName: process.env.PRODUCTS_TABLE_NAME,
        Item: productToCreate,
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Product created successfully',
        product: response.Attributes,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: error,
      }),
    };
  }
};
