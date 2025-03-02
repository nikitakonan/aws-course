import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { type APIGatewayEvent } from 'aws-lambda';
import { CreateProduct } from '../model/CreateProduct';
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

const validateProduct = ({
  title,
  description,
  price,
  count,
}: Partial<CreateProduct>) => {
  const errors: string[] = [];

  if (!title) {
    errors.push('Title is required');
  }
  if (typeof title !== 'string') {
    errors.push('Title must be a string');
  }
  if (description && typeof description !== 'string') {
    errors.push('Description must be a string');
  }
  if (price !== undefined && typeof price !== 'number') {
    errors.push('Price must be a number');
  }
  const countNum = Number(count);
  if (Number.isNaN(countNum)) {
    errors.push('Count must be a number');
  }
  if (countNum < 0) {
    errors.push('Count must be a positive number');
  }

  return errors;
};

export const handler = async (event: APIGatewayEvent) => {
  try {
    console.log(event.requestContext.requestId, event.body);
    const productToCreate: Partial<CreateProduct> = JSON.parse(
      event.body || '{}'
    );

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

    const { count, ...product } = productToCreate;
    const stock = {
      product_id: product.id,
      count,
    };

    const productResponse = await dynamo.send(
      new PutCommand({
        TableName: process.env.PRODUCTS_TABLE_NAME,
        Item: product,
      })
    );
    const stockResponse = await dynamo.send(
      new PutCommand({
        TableName: process.env.STOCKS_TABLE_NAME,
        Item: stock,
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Product created successfully',
        productId: productToCreate.id,
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
