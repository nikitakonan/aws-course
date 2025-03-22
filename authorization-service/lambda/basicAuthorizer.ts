import {
  APIGatewayAuthorizerResultContext,
  type APIGatewayTokenAuthorizerHandler,
} from 'aws-lambda';

class CustomError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const handler: APIGatewayTokenAuthorizerHandler = async (event) => {
  try {
    const authHeader = event.authorizationToken;

    if (!authHeader) {
      throw new CustomError('Unauthorized', 401);
    }

    const token = authHeader.replace(/^Basic\s+/, '');
    const auth = Buffer.from(token, 'base64').toString();

    if (auth !== process.env.CREDENTIALS) {
      throw new CustomError('Access denied', 403);
    }

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
    };
  } catch (error) {
    const context: APIGatewayAuthorizerResultContext = {};
    if (error instanceof Error) {
      context.message = error.message;
    }
    if (error instanceof CustomError) {
      context.statusCode = error.statusCode;
    }
    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: event.methodArn,
          },
        ],
      },
      context,
    };
  }
};
