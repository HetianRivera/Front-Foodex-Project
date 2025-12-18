export const MAX_TEXT_LENGTH = 255;
export const MAX_NUMERIC = 9999999;

function _validate(value, path = '') {
  const errors = [];
  if (value === null || value === undefined) return errors;

  const t = typeof value;
  if (t === 'string') {
    if (value.length > MAX_TEXT_LENGTH) {
      errors.push(`${path || 'value'}: texto excede ${MAX_TEXT_LENGTH} caracteres`);
    }
    return errors;
  }

  if (t === 'number') {
    if (!Number.isFinite(value)) {
      errors.push(`${path || 'value'}: no es un número válido`);
    } else if (Math.abs(value) > MAX_NUMERIC) {
      errors.push(`${path || 'value'}: numérico excede ${MAX_NUMERIC}`);
    }
    return errors;
  }

  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      errors.push(..._validate(v, path ? `${path}[${i}]` : `[${i}]`));
    });
    return errors;
  }

  if (t === 'object') {
    Object.keys(value).forEach(k => {
      errors.push(..._validate(value[k], path ? `${path}.${k}` : k));
    });
    return errors;
  }

  return errors;
}

export function validateRecipePayload(obj) {
  // shallow guard: only objects allowed
  return _validate(obj, 'receta');
}
