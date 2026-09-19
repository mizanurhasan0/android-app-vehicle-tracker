import { toPoisha } from '../../../utils/format';
import { ValidationError } from '../../../utils/validation';

export function validatedAmount(value: string, field: string) {
  try {
    return toPoisha(value);
  } catch (problem) {
    throw new ValidationError({ [field]: (problem as Error).message });
  }
}
