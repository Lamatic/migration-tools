// Lightweight schema validator for Lamatic nodes (warn-by-default)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateAgainstSchema(node: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!schema || typeof schema !== 'object') {
    return { valid: true, errors };
  }

  // Basic object check
  if (schema.type === 'object') {
    if (typeof node !== 'object' || node == null || Array.isArray(node)) {
      errors.push('Node is not an object');
      return { valid: false, errors };
    }

    // Required at object level
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    schema.required && Array.isArray(schema.required) && schema.required.forEach((k: string) => {
      if (!(k in node)) errors.push(`Missing required field: ${k}`);
    });

    // Properties validation (shallow + recurse for objects/arrays)
    if (schema.properties && typeof schema.properties === 'object') {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const value = (node as Record<string, unknown>)[key];
        // Required at property level
        if ((propSchema as any).required && (value === undefined || value === null || value === '')) {
          errors.push(`Missing required field: ${key}`);
          continue;
        }
        if (value === undefined) continue;
        const t = Array.isArray(value) ? 'array' : typeof value;
        if ((propSchema as any).type && (propSchema as any).type !== t) {
          errors.push(`Field ${key} expected type ${(propSchema as any).type} but got ${t}`);
        }
        // Recurse
        if ((propSchema as any).type === 'object') {
          const child = validateAgainstSchema(value, propSchema);
          errors.push(...child.errors.map(e => `${key}: ${e}`));
        } else if ((propSchema as any).type === 'array') {
          const itemSchema = (propSchema as any).items;
          if (itemSchema) {
            (value as unknown[]).forEach((item, idx) => {
              const child = validateAgainstSchema(item, itemSchema);
              errors.push(...child.errors.map(e => `${key}[${idx}]: ${e}`));
            });
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isStrictMode(): boolean {
  return String(process.env.LAMATIC_SCHEMA_STRICT || '').toLowerCase() === 'true';
}




