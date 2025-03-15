import { CreateProduct } from '../model/CreateProduct';

export const validateCreateProduct = ({
  title,
  description,
  price,
  count,
}: Partial<CreateProduct>) => {
  const errors: string[] = [];

  if (!title) {
    errors.push('Title is required');
  }
  if (typeof title !== 'string') {
    errors.push('Title must be a string');
  }
  if (description && typeof description !== 'string') {
    errors.push('Description must be a string');
  }
  if (price !== undefined && typeof price !== 'number') {
    errors.push('Price must be a number');
  }
  const countNum = Number(count);
  if (Number.isNaN(countNum)) {
    errors.push('Count must be a number');
  }
  if (countNum < 0) {
    errors.push('Count must be a positive number');
  }

  return errors;
};
