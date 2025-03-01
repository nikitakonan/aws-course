import type {
  APIGatewayEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    const productsResponse = await dynamo.send(
      new ScanCommand({
        TableName: process.env.PRODUCTS_TABLE_NAME,
      })
    );
    const stocksResponse = await dynamo.send(
      new ScanCommand({
        TableName: process.env.STOCKS_TABLE_NAME,
      })
    );
    const products = (productsResponse.Items || []).map((product) => {
      const stock = (stocksResponse.Items || []).find(
        (stock) => stock.product_id === product.id
      );
      return {
        ...product,
        count: stock ? stock.count : 0,
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(products),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Internal Server Error',
        error: e,
      }),
    };
  }
};
