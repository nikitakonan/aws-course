import { type APIGatewayEvent } from 'aws-lambda';
import { type CreateProduct } from '../model/CreateProduct';
import { validateCreateProduct } from './validateCreateProduct';
import { createProductInDb } from './createProductInDb';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const handler = async (event: APIGatewayEvent) => {
  try {
    console.log(event.requestContext.requestId, event.body);
    const productToCreate: Partial<CreateProduct> = JSON.parse(
      event.body || '{}'
    );

    const errors = validateCreateProduct(productToCreate);
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

    await createProductInDb(productToCreate as CreateProduct);

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
