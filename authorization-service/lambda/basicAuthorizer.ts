import {
  type APIGatewayTokenAuthorizerEvent,
  type AuthResponse,
} from 'aws-lambda';

export const handler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<AuthResponse> => {
  try {
    const authHeader = event.authorizationToken;

    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const token = authHeader.replace(/^Basic\s+/, '');
    const auth = Buffer.from(token, 'base64').toString();

    if (auth !== process.env.CREDENTIALS) {
      throw new Error('Access denied');
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
      context: {
        message: (error as Error).message,
      },
    };
  }
};
