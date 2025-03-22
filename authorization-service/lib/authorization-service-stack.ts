import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'node:path';

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const authorizerRole = new iam.Role(this, 'AuthorizerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    authorizerRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );

    const basicAuthorizerHandler = new lambdaNodejs.NodejsFunction(
      this,
      'BasicAuthorizer',
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, '..', 'lambda', 'basicAuthorizer.ts'),
        handler: 'handler',
        role: authorizerRole,
        environment: {
          CREDENTIALS: process.env.CREDENTIALS!,
        },
      }
    );

    basicAuthorizerHandler.addPermission('ApiGatewayInvoke', {
      principal: new cdk.aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: cdk.Fn.importValue('ImportServiceApiArn'),
    });

    new cdk.CfnOutput(this, 'BasicAuthorizerArn', {
      value: basicAuthorizerHandler.functionArn,
      exportName: 'BasicAuthorizerArn',
    });
  }
}
