import { categoryRepository } from '../../../repositories/categories.repository';
import { HttpError } from '../../../validations/errors';

/** Resolve a categoria do lançamento de hora extra (default: global "Salário"). */
export async function resolveCategory(
  categoryId: string | undefined,
  userId: string
): Promise<string> {
  if (categoryId) {
    const cat = await categoryRepository.findByIdAndUserId(categoryId, userId);
    if (!cat) throw new HttpError(404, 'Categoria não encontrada');
    return cat.id;
  }
  const globals = await categoryRepository.findGlobalCategories();
  const salario = globals.find((c) => c.name === 'Salário');
  if (!salario) throw new HttpError(500, 'Categoria padrão não encontrada');
  return salario.id;
}
