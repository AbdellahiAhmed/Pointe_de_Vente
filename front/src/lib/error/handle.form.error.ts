import { HttpException, UnprocessableEntityException } from '../http/exception/http.exception';
import { ConstraintViolation, ValidationResult } from '../validator/validation.result';
import { notify } from '../../app-common/components/confirm/notification';

interface HandleFormErrorOptions {
  setError?: (name: string, error: { message: string; type: string }) => void;
}

/**
 * Shared error handler for all entity creation/update forms.
 *
 * Fixes:
 * - Checks UnprocessableEntityException BEFORE HttpException (avoids double notification)
 * - Shows user-friendly messages for 403 (RBAC) and 500 errors
 * - Parses API Platform JSON-LD error responses for detailed messages
 * - Does NOT re-throw handled errors (prevents component crashes)
 */
export const handleFormError = async (
  exception: unknown,
  options?: HandleFormErrorOptions
): Promise<void> => {
  // 422 Validation errors — parse violations and set field errors
  if (exception instanceof UnprocessableEntityException) {
    try {
      const e: ValidationResult = await exception.response.json();

      if (options?.setError && e.violations) {
        e.violations.forEach((item: ConstraintViolation) => {
          options.setError!(item.propertyPath, {
            message: item.message,
            type: 'server',
          });
        });
      }

      if (e.errorMessage) {
        notify({ type: 'error', description: e.errorMessage });
      }
    } catch {
      notify({ type: 'error', description: exception.message });
    }
    return;
  }

  // All other HTTP errors (400, 403, 404, 500, etc.)
  if (exception instanceof HttpException) {
    let msg: string;

    // Try to parse a detailed message from the API response body
    try {
      const body = await exception.response.json();
      msg =
        body['hydra:description'] ||
        body.detail ||
        body.message ||
        exception.message;
    } catch {
      msg = exception.message;
    }

    // User-friendly messages for common codes
    if (exception.code === 403) {
      msg = "Vous n'avez pas les droits nécessaires pour cette action.";
    } else if (exception.code >= 500) {
      msg = msg === exception.message
        ? 'Erreur serveur. Veuillez réessayer ou contacter un administrateur.'
        : msg;
    }

    notify({
      type: 'error',
      description: msg,
      title: String(exception.code),
    });
    return;
  }

  // Non-HTTP errors (network, etc.) — re-throw
  throw exception;
};
