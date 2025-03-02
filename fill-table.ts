import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidV4 } from 'uuid';
import { CreateProduct } from './model/CreateProduct';
import { marshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({
  region: 'us-east-1',
});

const productsTableName = 'products';
const stocksTableName = 'stocks';

const mockProducts: CreateProduct[] = [
  {
    id: uuidV4(),
    title: 'Laptop',
    description: 'Powerful laptop for development',
    price: 1299.99,
    count: 10,
  },
  {
    id: uuidV4(),
    title: 'Smartphone',
    description: 'Latest smartphone model',
    price: 899.99,
    count: 15,
  },
  {
    id: uuidV4(),
    title: 'Headphones',
    description: 'Wireless noise-canceling headphones',
    price: 199.99,
    count: 8,
  },
];

const mockStocks = [
  {
    productId: mockProducts[0].id,
    count: 10,
  },
  {
    productId: mockProducts[1].id,
    count: 15,
  },
  {
    productId: mockProducts[2].id,
    count: 8,
  },
];

const fillProductsTable = async () => {
  try {
    for (const createProduct of mockProducts) {
      const { count, ...product } = createProduct;
      const command = new PutItemCommand({
        TableName: productsTableName,
        Item: marshall(product),
      });
      await client.send(command);
      console.log('Product added: ', product.id);
    }
  } catch (error) {
    console.error('Error filling products table:', error);
  }
};

const fillStocksTable = async () => {
  try {
    for (const createProduct of mockProducts) {
      const command = new PutItemCommand({
        TableName: stocksTableName,
        Item: {
          product_id: { S: createProduct.id },
          count: { N: createProduct.count.toString() },
        },
      });
      await client.send(command);
      console.log('Stock added: ', createProduct.id);
    }
  } catch (error) {
    console.error('Error filling stocks table:', error);
  }
};

fillProductsTable().then(fillStocksTable);
