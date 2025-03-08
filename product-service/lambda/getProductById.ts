import type { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

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

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  const productId = event.pathParameters?.id;

  console.log(event.requestContext.requestId, productId);

  try {
    if (!productId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Product id is not provided',
        }),
      };
    }

    const productResponse = await dynamo.send(
      new GetCommand({
        TableName: process.env.PRODUCTS_TABLE_NAME,
        Key: {
          id: productId,
        },
      })
    );

    const stockResponse = await dynamo.send(
      new GetCommand({
        TableName: process.env.STOCKS_TABLE_NAME,
        Key: {
          product_id: productId,
        },
      })
    );

    if (!productResponse.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: 'Product not found',
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...productResponse.Item,
        count: stockResponse.Item?.count,
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
