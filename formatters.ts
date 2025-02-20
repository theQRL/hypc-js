export function formatFatalError (message) {
  return JSON.stringify({
    errors: [
      {
        type: 'JSONError',
        component: 'hypcjs',
        severity: 'error',
        message: message,
        formattedMessage: 'Error: ' + message
      }
    ]
  });
}
