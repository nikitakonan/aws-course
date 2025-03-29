import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'node:path';

const PRODUCTS_TABLE_NAME = 'products';
const STOCKS_TABLE_NAME = 'stocks';

const environment = {
  PRODUCTS_TABLE_NAME,
  STOCKS_TABLE_NAME,
};

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const createTopic = this.createSNSSubscription();

    const productsTable = dynamodb.Table.fromTableName(
      this,
      'ProductsTable',
      PRODUCTS_TABLE_NAME
    );
    const stocksTable = dynamodb.Table.fromTableName(
      this,
      'StocksTable',
      STOCKS_TABLE_NAME
    );

    const dynamoDBPolicy = this.createDynamodbPolicy();

    const productsListHandler = this.createProductsListLambda();
    productsListHandler.addToRolePolicy(dynamoDBPolicy);

    const productByIdHandler = this.createProductByIdLambda();
    productByIdHandler.addToRolePolicy(dynamoDBPolicy);

    const createProductHandler = this.createProductCreateLambda();
    createProductHandler.addToRolePolicy(dynamoDBPolicy);

    const api = this.createApiGateway();

    const products = api.root.addResource('products');
    products.addMethod(
      'GET',
      new apigateway.LambdaIntegration(productsListHandler)
    );
    products.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createProductHandler)
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

    const catalogBatchProcessHandler = this.createCatalogBatchProcessLambda({
      ...environment,
      SNS_TOPIC_ARN: createTopic.topicArn,
    });
    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
    });
    catalogBatchProcessHandler.addEventSource(
      new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );
    productsTable.grantWriteData(catalogBatchProcessHandler);
    stocksTable.grantWriteData(catalogBatchProcessHandler);
    createTopic.grantPublish(catalogBatchProcessHandler);

    new cdk.CfnOutput(this, 'CatalogItemsQueueArn', {
      value: catalogItemsQueue.queueArn,
      exportName: 'CatalogItemsQueueArn',
      description: 'Catalog Items Queue Arn',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });
  }

  createSNSSubscription() {
    const createProductTopic = new sns.Topic(this, 'createProductTopic', {
      topicName: 'createProductTopic',
      displayName: 'Create Product Topic',
    });

    new sns.Subscription(this, 'emailSubscription', {
      topic: createProductTopic,
      endpoint: ssm.StringParameter.valueForStringParameter(
        this,
        '/learn-aws-course/sns/email-endpoint'
      ),
      protocol: sns.SubscriptionProtocol.EMAIL,
      filterPolicy: {
        status: sns.SubscriptionFilter.stringFilter({
          allowlist: ['success'],
        }),
      },
    });

    new sns.Subscription(this, 'failedSubscription', {
      topic: new sns.Topic(this, 'failedCreateProductTopic', {
        topicName: 'failedCreateProductTopic',
        displayName: 'Failed Create Product Topic',
      }),
      endpoint: ssm.StringParameter.valueForStringParameter(
        this,
        '/learn-aws-course/sns/failed-endpoint'
      ),
      protocol: sns.SubscriptionProtocol.EMAIL,
      filterPolicy: {
        status: sns.SubscriptionFilter.stringFilter({
          denylist: ['success'],
        }),
      },
    });

    return createProductTopic;
  }

  createDynamodbPolicy() {
    return new cdk.aws_iam.PolicyStatement({
      effect: cdk.aws_iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Scan',
        'dynamodb:Query',
        'dynamodb:BatchGetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
      ],
      resources: [
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${
          cdk.Stack.of(this).account
        }:table/${PRODUCTS_TABLE_NAME}`,
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${
          cdk.Stack.of(this).account
        }:table/${STOCKS_TABLE_NAME}`,
      ],
    });
  }

  createProductsListLambda() {
    return new lambda.Function(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
      handler: 'getProducts.handler',
      environment,
    });
  }

  createProductByIdLambda() {
    return new lambda.Function(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
      handler: 'getProductById.handler',
      environment,
    });
  }

  createProductCreateLambda() {
    return new lambda.Function(this, 'createProduct', {
      runtime: lambda.Runtime.NODEJS_LATEST,
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
      handler: 'createProduct.handler',
      environment,
    });
  }

  createCatalogBatchProcessLambda(env: Record<string, string>) {
    return new lambdaNodejs.NodejsFunction(this, 'catalogBatchProcess', {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '..', 'lambda', 'catalogBatchProcess.ts'),
      handler: 'handler',
      environment: env,
      bundling: {},
    });
  }

  createApiGateway() {
    return new apigateway.RestApi(this, 'Api', {
      restApiName: 'My API Service',
      description: 'This is my API Gateway',
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowHeaders: ['*'],
      },
    });
  }
}
