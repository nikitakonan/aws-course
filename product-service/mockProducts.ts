export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  count: number;
};

export const mockProducts: Product[] = [
  {
    id: '1',
    title: '1 title',
    description: '1 description',
    price: 1,
    count: 1,
  },
  {
    id: '2',
    title: '2 title',
    description: '2 description',
    price: 2,
    count: 2,
  },
  {
    id: '3',
    title: '3 title',
    description: '3 description',
    price: 3,
    count: 3,
  },
];
