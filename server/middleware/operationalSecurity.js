const LOCAL_DEVELOPMENT_ORIGINS = Object.freeze([
  'http://127.0.0.1:55701',
  'http://127.0.0.1:55703',
  'http://localhost:55701',
  'http://localhost:55703',
]);

const SENSITIVE_KEY_PATTERN = /(authorization|password|newpassword|confirmpassword|resettoken|token|reset.?code|phone|parentphone|studentcontact|parentcontact)/i;

const redactText = (value) => String(value ?? '')
  .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]')
  .replace(/(authorization|password|newPassword|confirmPassword|resetToken|token|code|phone|parentPhone|studentContact|parentContact)\s*([=:])\s*("[^"]*"|'[^']*'|[^,\s}]+)/gi, '$1$2[REDACTED]')
  .replace(/\b(?:01[016789])[-\s]?\d{3,4}[-\s]?\d{4}\b/g, '[PHONE]')
  .replace(/\b(?:mongodb(?:\+srv)?):\/\/[^\s'"`]+/gi, 'mongodb://[REDACTED]');

const redactValue = (value, key = '') => {
  if (SENSITIVE_KEY_PATTERN.test(key)) return '[REDACTED]';
  if (typeof value === 'string') return redactText(value);
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      redactValue(entryValue, entryKey),
    ]));
  }
  return value;
};

const parseConfiguredOrigins = () => {
  const raw = [process.env.CORS_ALLOWED_ORIGINS, process.env.FRONTEND_URL]
    .filter(Boolean)
    .join(',');
  const origins = raw.split(',').map((origin) => origin.trim()).filter(Boolean);

  origins.forEach((origin) => {
    if (origin === '*' || !/^https?:\/\//i.test(origin)) {
      throw new Error('CORS_ALLOWED_ORIGINS/FRONTEND_URL에는 http(s) origin만 지정해야 합니다.');
    }
    const parsed = new URL(origin);
    if (parsed.origin !== origin || parsed.pathname !== '/' && parsed.pathname !== '') {
      throw new Error(`CORS origin 형식이 올바르지 않습니다: ${redactText(origin)}`);
    }
  });

  if (process.env.NODE_ENV === 'production' && origins.length === 0) {
    throw new Error('프로덕션에서는 CORS_ALLOWED_ORIGINS 또는 FRONTEND_URL이 필요합니다.');
  }

  return new Set([
    ...(process.env.NODE_ENV === 'production' ? [] : LOCAL_DEVELOPMENT_ORIGINS),
    ...origins,
  ]);
};

const getCorsOptions = () => {
  const allowedOrigins = parseConfiguredOrigins();
  return {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      const error = new Error('CORS origin denied');
      error.status = 403;
      error.code = 'CORS_ORIGIN_DENIED';
      return callback(error);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 204,
  };
};

const getSafeRequestUrl = (req) => redactText(req.originalUrl || req.url || '');

const requestLogger = (req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startedAt;
    const line = `[API] ${req.method} ${getSafeRequestUrl(req)} ${res.statusCode} ${duration}ms`;
    if (res.statusCode >= 400) console.warn(line);
    else console.log(line);
  });
  next();
};

const responseSanitizer = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 500) {
      return originalJson({ success: false, error: '서버 오류가 발생했습니다' });
    }
    if (body && typeof body === 'object') {
      const safeBody = { ...body };
      delete safeBody.stack;
      delete safeBody.details;
      return originalJson(safeBody);
    }
    return originalJson(body);
  };
  next();
};

const publicErrorMessage = (error) => {
  if (error?.type === 'entity.too.large') return '요청 본문이 너무 큽니다';
  if (error?.code === 'CORS_ORIGIN_DENIED') return '허용되지 않은 Origin입니다';
  if (error?.type === 'entity.parse.failed') return '요청 본문 형식이 올바르지 않습니다';
  return '서버 오류가 발생했습니다';
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error?.statusCode || error?.status || (error?.type === 'entity.too.large' ? 413 : 500);
  console.error(`[ERROR] ${req.method} ${getSafeRequestUrl(req)} ${status}`, redactText(error?.stack || error?.message || 'unknown error'));
  return res.status(status).json({
    success: false,
    error: status >= 500 ? '서버 오류가 발생했습니다' : publicErrorMessage(error),
  });
};

module.exports = {
  getCorsOptions,
  redactText,
  redactValue,
  requestLogger,
  responseSanitizer,
  errorHandler,
};
