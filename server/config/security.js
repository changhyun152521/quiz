const MIN_JWT_SECRET_LENGTH = 32;

/**
 * Return the configured JWT signing secret.
 *
 * Quiz validates the same secret as changhyun because it consumes tokens
 * issued by the main LMS. There is deliberately no source-level fallback.
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  const normalizedSecret = typeof secret === 'string' ? secret.trim() : '';
  const isPlaceholder = normalizedSecret.startsWith('<') && normalizedSecret.endsWith('>');
  if (
    typeof secret !== 'string' ||
    normalizedSecret.length < MIN_JWT_SECRET_LENGTH ||
    isPlaceholder ||
    normalizedSecret === 'mathchang123456' ||
    normalizedSecret.toLowerCase().includes('change-in-production')
  ) {
    throw new Error(
      `JWT_SECRET must be configured with at least ${MIN_JWT_SECRET_LENGTH} non-placeholder characters`,
    );
  }
  return normalizedSecret;
};

const validateJwtSecret = () => getJwtSecret();

module.exports = { MIN_JWT_SECRET_LENGTH, getJwtSecret, validateJwtSecret };
