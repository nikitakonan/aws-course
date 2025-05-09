import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'node:path';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      'CatalogItemsQueue',
      cdk.Fn.importValue('CatalogItemsQueueArn')
    );

    const bucket = s3.Bucket.fromBucketName(
      this,
      'ImportBucket',
      'import-service-bucket-e16aad61-9c38-4a13-9683-9911158fdd7f'
    );

    const importProductsHandler = new lambdaNodejs.NodejsFunction(
      this,
      'importProductsFile',
      {
        runtime: lambda.Runtime.NODEJS_LATEST,
        code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
        handler: 'importProductsFile.handler',
        environment: {
          BUCKET_NAME: bucket.bucketName,
        },
      }
    );

    importProductsHandler.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['s3:PutObject'],
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
      })
    );

    const importFileParser = new lambdaNodejs.NodejsFunction(
      this,
      'importFileParser',
      {
        bundling: {
          nodeModules: ['csv-parser'],
        },
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: path.join(__dirname, '..', 'lambda', 'importFileParser.ts'),
        handler: 'handler',
        environment: {
          BUCKET_NAME: bucket.bucketName,
          SQS_URL: catalogItemsQueue.queueUrl,
        },
      }
    );

    catalogItemsQueue.grantSendMessages(importFileParser);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3notifications.LambdaDestination(importFileParser),
      {
        prefix: 'uploaded/',
        suffix: '.csv',
      }
    );

    importFileParser.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:CopyObject',
          's3:PutObject',
          's3:DeleteObject',
        ],
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
      })
    );

    const api = new apigateway.RestApi(this, 'ImportServiceApi', {
      restApiName: 'Import Service API Service',
      description: 'This is Import Service API Service Gateway',
    });

    const basicAuthorizerHandler = lambda.Function.fromFunctionAttributes(
      this,
      'BasicAuthorizer',
      {
        functionArn: cdk.Fn.importValue('BasicAuthorizerArn'),
        sameEnvironment: true,
      }
    );

    const authorizer = new apigateway.TokenAuthorizer(
      this,
      'BasicTokenAuthorizer',
      {
        handler: basicAuthorizerHandler,
        identitySource: 'method.request.header.Authorization',
      }
    );

    const importProducts = api.root.addResource('import');
    importProducts.addMethod(
      'GET',
      new apigateway.LambdaIntegration(importProductsHandler),
      {
        requestParameters: {
          'method.request.querystring.name': true,
        },
        // authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer,
      }
    );
    importProducts.addCorsPreflight({
      allowOrigins: apigateway.Cors.ALL_ORIGINS,
      allowMethods: apigateway.Cors.ALL_METHODS,
      allowHeaders: ['*'],
      allowCredentials: true,
    });

    new cdk.CfnOutput(this, 'ImportServiceApiArn', {
      value: api.arnForExecuteApi(),
      exportName: 'ImportServiceApiArn',
      description: 'Import Service API ARN',
    });

    new cdk.CfnOutput(this, 'ImportServiceApiUrl', {
      value: api.url,
    });
  }
}
