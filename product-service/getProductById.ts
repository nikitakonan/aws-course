import type { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { mockProducts } from './mockProducts';

export const handler = (event: APIGatewayEvent): APIGatewayProxyResult => {
  const productId = event.pathParameters?.id;

  const product = mockProducts.find((product) => product.id === productId);

  if (!product) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Product not found',
      }),
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(product),
  };
};
