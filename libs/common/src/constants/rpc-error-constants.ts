export const ERROR_MESSAGE = {
  BAD_REQUEST: 'bad_request',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  UNPROCESSABLE_ENTITY: 'unprocessable_entity',
  TOO_MANY_REQUESTS: 'too_many_requests',

  INTERNAL_SERVER_ERROR: 'internal_server_error',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  GATEWAY_TIMEOUT: 'gateway_timeout',

  SOMETHING_WENT_WRONG: 'something_went_wrong',
} as const;

export type ErrorMessageKey =
  (typeof ERROR_MESSAGE)[keyof typeof ERROR_MESSAGE];
