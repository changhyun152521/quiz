// mathchang-quiz는 mathchang의 인증을 사용합니다.
// 사용자 정보는 프론트엔드에서 전달받습니다.

const Course = require('../models/Course');
const getUser = require('../models/User');
const {
  resolveStudentAccess,
  sendAccessError,
} = require('../utils/studentAccess');
const { sendKakaoMessage } = require('../utils/kakaoMessage');

// POST /api/messages/send-report - 학습 보고서 메시지 발송
// 프론트엔드에서 student 정보(name, userId 등)를 함께 전달받음
const sendReportMessage = async (req, res) => {
  try {
    const { studentId, studentName, studentUserId, courseId, startDate, endDate, reportTitle, comment, reportImage, parentPhone } = req.body;

    if (!studentId || !courseId || !startDate || !endDate || !reportTitle) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다 (studentId, studentName, courseId, startDate, endDate, reportTitle)'
      });
    }

    const studentAccess = await resolveStudentAccess(req, studentId);
    if (!studentAccess.ok) return sendAccessError(res, studentAccess);

    // 강좌 정보 가져오기
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '강좌를 찾을 수 없습니다'
      });
    }

    if (!course.students.some((courseStudentId) => String(courseStudentId) === studentAccess.id)) {
      return res.status(403).json({
        success: false,
        message: '해당 강좌에 등록된 학생만 보고서를 발송할 수 있습니다',
      });
    }

    const targetStudent = await getUser().findById(studentAccess.id)
      .select('name userId parentContact')
      .lean();
    if (!targetStudent || targetStudent.userType !== '학생') {
      return res.status(403).json({ success: false, message: '학생 정보를 확인할 수 없습니다' });
    }

    // 보고서 메시지 생성
    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    let message = `[${reportTitle}]\n\n`;
    message += `학생: ${targetStudent.name} (${targetStudent.userId})\n`;
    message += `강좌: ${course.courseName}\n`;
    message += `학습 기간: ${formatDate(startDate)} ~ ${formatDate(endDate)}\n\n`;

    if (comment) {
      message += `[코멘트]\n${comment}\n\n`;
    }

    // 카카오톡 메시지 발송
    const targetPhone = targetStudent.parentContact;

    console.log('=== 학습 보고서 카카오톡 메시지 발송 ===');
    console.log('학습 보고서 카카오톡 발송을 요청했습니다');
    console.log(`부모님 연락처: ${targetPhone ? '설정됨' : '없음'}`);
    console.log(`보고서 이미지: ${reportImage ? '있음 (Base64)' : '없음'}`);
    console.log('==========================================');

    // 카카오톡 메시지 발송
    if (targetPhone) {
      try {
        await sendKakaoMessage({
          phone: targetPhone,
          message: message,
          image: reportImage,
          reportTitle: reportTitle
        });
      } catch (kakaoError) {
        console.error('카카오톡 메시지 발송 오류:', kakaoError);
        // 카카오톡 발송 실패해도 성공으로 처리 (나중에 재시도 가능)
      }
    }

    res.json({
      success: true,
      message: '메시지가 발송되었습니다',
      data: {
        studentId,
        studentName: targetStudent.name,
        parentPhone: targetPhone
      }
    });
  } catch (error) {
    console.error('메시지 발송 오류:', error);
    res.status(500).json({
      success: false,
      message: '메시지 발송 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// POST /api/messages/send-bulk-reports - 일괄 학습 보고서 메시지 발송
// 프론트엔드에서 각 학생의 정보(studentId, studentName, parentPhone 등)를 함께 전달받음
const sendBulkReportMessages = async (req, res) => {
  try {
    const { courseId, startDate, endDate, reportTitle, comment, studentReports } = req.body;

    if (!courseId || !startDate || !endDate || !reportTitle || !studentReports || !Array.isArray(studentReports)) {
      return res.status(400).json({
        success: false,
        message: '필수 정보가 누락되었습니다'
      });
    }

    // 강좌 정보 가져오기
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '강좌를 찾을 수 없습니다'
      });
    }

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    const results = [];
    const errors = [];

    // 각 학생별로 메시지 발송
    // studentReports 배열에는 { studentId, studentName, studentUserId, parentPhone, ... } 형태의 객체가 포함됨
    for (const { studentId } of studentReports) {
      try {
        if (!studentId) {
          errors.push({
            studentId,
            error: '학생 정보가 누락되었습니다'
          });
          continue;
        }

        const studentAccess = await resolveStudentAccess(req, studentId);
        if (!studentAccess.ok) {
          errors.push({ studentId, error: studentAccess.message });
          continue;
        }
        if (!course.students.some((courseStudentId) => String(courseStudentId) === studentAccess.id)) {
          errors.push({ studentId, error: '해당 강좌에 등록된 학생이 아닙니다' });
          continue;
        }
        const targetStudent = await getUser().findById(studentAccess.id)
          .select('name userId parentContact userType')
          .lean();
        if (!targetStudent || targetStudent.userType !== '학생') {
          errors.push({ studentId, error: '학생 정보를 확인할 수 없습니다' });
          continue;
        }
        const studentName = targetStudent.name;
        const studentUserId = targetStudent.userId;
        const parentPhone = targetStudent.parentContact;

        // 보고서 메시지 생성
        let message = `[${reportTitle}]\n\n`;
        message += `학생: ${studentName} (${studentUserId || studentId})\n`;
        message += `강좌: ${course.courseName}\n`;
        message += `학습 기간: ${formatDate(startDate)} ~ ${formatDate(endDate)}\n\n`;

        if (comment) {
          message += `[코멘트]\n${comment}\n\n`;
        }

        // 카카오톡 메시지 발송
        if (parentPhone) {
          try {
            await sendKakaoMessage({
              phone: parentPhone,
              message: message,
              image: null, // 일괄 발송 시 이미지는 서버에서 생성 필요
              reportTitle: reportTitle
            });
          } catch (kakaoError) {
            console.error(`학생 ${studentName} 카카오톡 메시지 발송 오류:`, kakaoError);
            // 카카오톡 발송 실패해도 성공으로 처리 (나중에 재시도 가능)
          }
        }

        console.log('[일괄 발송] 학습 보고서 카카오톡 발송을 요청했습니다');

        results.push({
          studentId,
          studentName,
          success: true
        });
      } catch (error) {
        console.error(`학생 ${studentId} 메시지 발송 오류:`, error);
        errors.push({
          studentId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `${results.length}명에게 메시지가 발송되었습니다${errors.length > 0 ? ` (${errors.length}명 실패)` : ''}`,
      data: {
        successCount: results.length,
        errorCount: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    console.error('일괄 메시지 발송 오류:', error);
    res.status(500).json({
      success: false,
      message: '일괄 메시지 발송 중 오류가 발생했습니다',
      error: error.message
    });
  }
};

// 보고서 메시지 포맷팅 함수
function formatReportMessage(student, course, startDate, endDate, reportData) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const accuracy = reportData.totalQuestions > 0
    ? ((reportData.totalCorrect / reportData.totalQuestions) * 100).toFixed(1)
    : 0;

  let message = `[${course.courseName}] 학습 보고서\n\n`;
  message += `학생: ${student.name}\n`;
  message += `기간: ${formatDate(startDate)} ~ ${formatDate(endDate)}\n\n`;
  message += `📊 전체 요약\n`;
  message += `• 전체 문제: ${reportData.totalQuestions || 0}문제\n`;
  message += `• 맞은 문제: ${reportData.totalCorrect || 0}문제\n`;
  message += `• 정답률: ${accuracy}%\n`;
  
  if (reportData.percentile !== null && reportData.percentile !== undefined) {
    message += `• 반 내 상위: ${(100 - reportData.percentile).toFixed(1)}%\n`;
  }
  message += `\n`;

  // 소단원별 현황
  if (reportData.subUnitStats && reportData.subUnitStats.length > 0) {
    message += `📚 소단원별 학습 현황\n`;
    reportData.subUnitStats.slice(0, 5).forEach((stat, index) => {
      const statAccuracy = stat.totalQuestions > 0
        ? ((stat.correctQuestions / stat.totalQuestions) * 100).toFixed(1)
        : 0;
      const unitName = stat.subject && stat.mainUnit && stat.subUnit
        ? `${stat.subject} / ${stat.mainUnit} / ${stat.subUnit}`
        : stat.subUnit || stat.mainUnit || '-';
      message += `${index + 1}. ${unitName}: ${statAccuracy}% (${stat.correctQuestions}/${stat.totalQuestions})\n`;
    });
    message += `\n`;
  }

  // 강점 단원
  if (reportData.strongUnits && reportData.strongUnits.length > 0) {
    message += `✅ 강점 단원\n`;
    reportData.strongUnits.slice(0, 3).forEach((unit, index) => {
      const unitAccuracy = unit.totalQuestions > 0
        ? ((unit.correctQuestions / unit.totalQuestions) * 100).toFixed(1)
        : 0;
      const unitName = unit.subject && unit.mainUnit && unit.subUnit
        ? `${unit.subject} / ${unit.mainUnit} / ${unit.subUnit}`
        : unit.subUnit || unit.mainUnit || '-';
      message += `${index + 1}. ${unitName}: ${unitAccuracy}%\n`;
    });
    message += `\n`;
  }

  // 취약 단원
  if (reportData.weakUnits && reportData.weakUnits.length > 0) {
    message += `⚠️ 취약 단원\n`;
    reportData.weakUnits.slice(0, 3).forEach((unit, index) => {
      const unitAccuracy = unit.totalQuestions > 0
        ? ((unit.correctQuestions / unit.totalQuestions) * 100).toFixed(1)
        : 0;
      const unitName = unit.subject && unit.mainUnit && unit.subUnit
        ? `${unit.subject} / ${unit.mainUnit} / ${unit.subUnit}`
        : unit.subUnit || unit.mainUnit || '-';
      message += `${index + 1}. ${unitName}: ${unitAccuracy}%\n`;
    });
    message += `\n`;
  }

  message += `더 자세한 내용은 학습 보고서에서 확인하실 수 있습니다.`;

  return message;
}

module.exports = {
  sendReportMessage,
  sendBulkReportMessages
};
