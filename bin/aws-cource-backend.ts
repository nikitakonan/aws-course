#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwsCourseBackendStack } from '../lib/aws-course-backend-stack';

const app = new cdk.App();
new AwsCourseBackendStack(app, 'AwsCourseBackendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
