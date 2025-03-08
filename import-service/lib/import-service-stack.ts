import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'node:path';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
          BUCKET_NAME: bucket.bucketRegionalDomainName,
        },
      }
    );

    importProductsHandler.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
      })
    );

    const api = new apigateway.RestApi(this, 'ImportServiceApi', {
      restApiName: 'Import Service API Service',
      description: 'This is Import Service API Service Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowHeaders: ['*'],
      },
    });

    const importProducts = api.root.addResource('import');
    importProducts.addMethod(
      'GET',
      new apigateway.LambdaIntegration(importProductsHandler),
      {
        requestParameters: {
          'method.request.querystring.name': true,
        },
      }
    );

    new cdk.CfnOutput(this, 'ImportServiceApiUrl', {
      value: api.url,
    });
  }
}
