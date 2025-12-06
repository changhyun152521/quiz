// API 기본 URL 설정
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * API 요청 헬퍼 함수
 * @param {string} endpoint - API 엔드포인트 (예: '/api/auth/login')
 * @param {object} options - fetch 옵션
 * @returns {Promise<Response>}
 */
export const apiRequest = async (endpoint, options = {}) => {
  // API_URL에서 마지막 슬래시 제거
  const baseUrl = API_URL.replace(/\/$/, '');
  
  // endpoint가 이미 /api로 시작하는지 확인
  // API_URL에 /api가 포함되어 있을 수 있으므로 중복 방지
  let url;
  if (endpoint.startsWith('http')) {
    // 전체 URL인 경우 그대로 사용
    url = endpoint;
  } else if (endpoint.startsWith('/api')) {
    // endpoint가 /api로 시작하면, baseUrl에 /api가 있는지 확인
    if (baseUrl.endsWith('/api')) {
      // baseUrl이 /api로 끝나면 endpoint의 /api 제거
      url = `${baseUrl}${endpoint.substring(4)}`;
    } else {
      // baseUrl에 /api가 없으면 그대로 연결
      url = `${baseUrl}${endpoint}`;
    }
  } else {
    // endpoint가 /api로 시작하지 않으면 그대로 연결
    url = `${baseUrl}${endpoint}`;
  }
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 토큰이 있으면 Authorization 헤더 추가
  const token = localStorage.getItem('token');
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  return fetch(url, mergedOptions);
};

/**
 * GET 요청
 */
export const get = async (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'GET' });
};

/**
 * POST 요청
 */
export const post = async (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * PUT 요청
 */
export const put = async (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * DELETE 요청
 */
export const del = async (endpoint, options = {}) => {
  return apiRequest(endpoint, { ...options, method: 'DELETE' });
};

/**
 * PATCH 요청
 */
export const patch = async (endpoint, data, options = {}) => {
  return apiRequest(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export default {
  API_URL,
  apiRequest,
  get,
  post,
  put,
  patch,
  delete: del,
};

