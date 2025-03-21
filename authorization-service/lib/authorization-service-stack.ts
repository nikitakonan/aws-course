import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const basicAuthorizerHandler = new lambdaNodejs.NodejsFunction(
      this,
      'BasicAuthorizer',
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, '..', 'lambda', 'basicAuthorizer.ts'),
        handler: 'handler',
        environment: {
          CREDENTIALS: process.env.CREDENTIALS!,
        },
      }
    );

    new cdk.CfnOutput(this, 'BasicAuthorizerArn', {
      value: basicAuthorizerHandler.functionArn,
      exportName: 'BasicAuthorizerArn',
    });
  }
}
