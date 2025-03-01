import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'node:path';

export class AwsCourseBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsListHandler = new lambda.Function(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', 'product-service')
      ),
      handler: 'getProducts.handler',
    });

    const productByIdHandler = new lambda.Function(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', 'product-service')
      ),
      handler: 'getProductById.handler',
    });

    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: 'My API Service',
      description: 'This is my API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET'],
        allowHeaders: ['*'],
      },
    });

    const products = api.root.addResource('products');
    products.addMethod(
      'GET',
      new apigateway.LambdaIntegration(productsListHandler)
    );
    const product = products.addResource('{id}');
    product.addMethod(
      'GET',
      new apigateway.LambdaIntegration(productByIdHandler),
      {
        requestParameters: {
          'method.request.path.id': true,
        },
      }
    );

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}
