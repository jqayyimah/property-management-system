type ValidationErrorItem = {
  msg?: string;
  loc?: Array<string | number>;
};

type ApiErrorShape = {
  response?: {
    data?: {
      detail?: string | ValidationErrorItem[];
    };
  };
  message?: string;
};

function cleanValidationMessage(message: string): string {
  return message
    .replace(/^Value error,\s*/i, '')
    .replace(/^body:\s*/i, '')
    .replace(/start_date/g, 'start date')
    .replace(/end_date/g, 'end date')
    .replace(/\byear\b/i, 'rent year')
    .trim();
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const detail = (error as ApiErrorShape)?.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return cleanValidationMessage(detail);
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (first?.loc?.length && first?.msg) {
      const field = String(first.loc[first.loc.length - 1]).replace(/_/g, ' ');
      const cleaned = cleanValidationMessage(first.msg);
      if (field.toLowerCase() === 'body') {
        return cleaned;
      }
      return `${field}: ${cleaned}`;
    }
    if (first?.msg) {
      return cleanValidationMessage(first.msg);
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function isValidCurrencyInput(value: string): boolean {
  return /^\d{1,10}(\.\d{0,2})?$/.test(value.trim());
}
