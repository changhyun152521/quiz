// 카카오톡 메시지 발송 유틸리티
// 카카오톡 비즈니스 API 또는 알림톡 API를 사용하여 메시지 발송

/**
 * 카카오톡 메시지 발송
 * @param {Object} options - 발송 옵션
 * @param {string} options.phone - 수신자 전화번호
 * @param {string} options.message - 메시지 내용
 * @param {string} options.image - 이미지 Base64 데이터 (선택)
 * @param {string} options.reportTitle - 보고서 제목
 * @returns {Promise<Object>} 발송 결과
 */
async function sendKakaoMessage({ phone, message, image, reportTitle }) {
  // TODO: 실제 카카오톡 API 연동
  // 카카오톡 비즈니스 API 또는 알림톡 API 사용
  // 예: https://developers.kakao.com/docs/latest/ko/kakaotalk-business/message
  
  // 현재는 로그만 남김
  console.log('=== 카카오톡 메시지 발송 ===');
  console.log(`수신자: ${phone}`);
  console.log(`보고서 제목: ${reportTitle}`);
  console.log(`메시지: ${message}`);
  console.log(`이미지: ${image ? '있음' : '없음'}`);
  console.log('===========================');

  // 실제 API 호출 예시:
  // const response = await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${KAKAO_ACCESS_TOKEN}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     receiver_uuids: [phone],
  //     template_object: {
  //       object_type: 'text',
  //       text: message,
  //       link: {
  //         web_url: 'https://example.com',
  //         mobile_web_url: 'https://example.com'
  //       }
  //     }
  //   })
  // });

  return {
    success: true,
    message: '카카오톡 메시지가 발송되었습니다'
  };
}

module.exports = {
  sendKakaoMessage
};

