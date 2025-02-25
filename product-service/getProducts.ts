import type { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { mockProducts } from './mockProducts';

export const handler = (event: APIGatewayEvent): APIGatewayProxyResult => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(mockProducts),
  };
};
