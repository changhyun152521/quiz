const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const User = require('../models/User');

// GET /api/students/:studentId/study-report - 학생 학습현황 보고서
const getStudyReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { year, month, startDate: startDateParam, endDate: endDateParam, courseId } = req.query;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: '학생 ID는 필수입니다'
      });
    }

    let startDate, endDate;

    // startDate와 endDate가 제공된 경우 (관리자 페이지용)
    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999); // 종료일의 마지막 시간으로 설정

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: '올바른 날짜 형식을 입력해주세요'
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: '시작일은 종료일보다 이전이어야 합니다'
        });
      }
    } else if (year && month) {
      // year와 month가 제공된 경우 (학생 페이지용 - 기존 방식)
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          message: '올바른 년도와 월을 입력해주세요'
        });
      }

      // 해당 월의 시작일과 종료일 계산
      startDate = new Date(yearNum, monthNum - 1, 1);
      endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    } else {
      return res.status(400).json({
        success: false,
        message: '년도와 월 또는 시작일과 종료일을 입력해주세요'
      });
    }

    // 강좌 찾기
    let course;
    if (courseId) {
      course = await Course.findById(courseId).populate('assignments');
      if (!course) {
        return res.status(404).json({
          success: false,
          message: '강좌를 찾을 수 없습니다'
        });
      }
    } else {
      // courseId가 없으면 학생이 등록된 모든 강좌에서 찾기
      const courses = await Course.find({ students: studentId }).populate('assignments');
      if (courses.length === 0) {
        return res.status(404).json({
          success: false,
          message: '등록된 강좌가 없습니다'
        });
      }
      course = courses[0]; // 첫 번째 강좌 사용
    }

    // 해당 강좌의 QUIZ 타입 과제만 필터링 (과제의 시작일/종료일과 무관하게 모든 QUIZ 과제 포함)
    const quizAssignments = course.assignments.filter(
      assignment => assignment.assignmentType === 'QUIZ'
    );

    // 과제 ID 배열 (모든 QUIZ 과제 포함)
    const assignmentIds = quizAssignments.map(a => a._id);

    // 해당 과제들의 제출 정보 가져오기
    const assignments = await Assignment.find({
      _id: { $in: assignmentIds }
    }).select('subject mainUnit subUnit questionCount answers submissions');

    // 학생의 제출 정보 추출 (제출일이 기간 내에 있는 것만)
    const studentSubmissions = [];
    assignments.forEach(assignment => {
      const submission = assignment.submissions?.find(sub => {
        const subStudentId = sub.studentId?._id || sub.studentId;
        if (!subStudentId || String(subStudentId) !== String(studentId)) {
          return false;
        }
        // 제출 시간(submittedAt)이 기간 내에 있는지 확인 (과제의 시작일/종료일과 무관)
        if (sub.submittedAt) {
          const submittedAt = new Date(sub.submittedAt);
          return submittedAt >= startDate && submittedAt <= endDate;
        }
        // submittedAt이 없으면 제출 정보가 없으므로 제외
        return false;
      });

      if (submission) {
        studentSubmissions.push({
          assignment,
          submission
        });
      }
    });

    // 전체 통계 계산
    let totalQuestions = 0;
    let totalCorrect = 0;

    // 소단원별 통계
    const subUnitStatsMap = new Map();

    studentSubmissions.forEach(({ assignment, submission }) => {
      const questionCount = assignment.questionCount || 0;
      const correctCount = submission.correctCount || 0;
      const wrongCount = submission.wrongCount || 0;

      totalQuestions += questionCount;
      totalCorrect += correctCount;

      // 소단원별 통계
      if (assignment.subject && assignment.mainUnit && assignment.subUnit) {
        const key = `${assignment.subject}|${assignment.mainUnit}|${assignment.subUnit}`;
        
        if (!subUnitStatsMap.has(key)) {
          subUnitStatsMap.set(key, {
            subject: assignment.subject,
            mainUnit: assignment.mainUnit,
            subUnit: assignment.subUnit,
            totalQuestions: 0,
            correctQuestions: 0
          });
        }

        const stat = subUnitStatsMap.get(key);
        stat.totalQuestions += questionCount;
        stat.correctQuestions += correctCount;
      }
    });

    // 소단원별 통계 배열로 변환
    const subUnitStats = Array.from(subUnitStatsMap.values());

    // 취약 단원 찾기 (정답률이 70% 미만인 단원)
    const weakUnits = subUnitStats
      .filter(stat => {
        const accuracy = stat.totalQuestions > 0
          ? (stat.correctQuestions / stat.totalQuestions) * 100
          : 0;
        return accuracy < 70;
      })
      .sort((a, b) => {
        const accuracyA = a.totalQuestions > 0 ? (a.correctQuestions / a.totalQuestions) * 100 : 0;
        const accuracyB = b.totalQuestions > 0 ? (b.correctQuestions / b.totalQuestions) * 100 : 0;
        return accuracyA - accuracyB; // 정답률이 낮은 순으로 정렬
      })
      .slice(0, 5); // 상위 5개만

    // 잘한 단원 찾기 (정답률이 70% 이상인 단원)
    const strongUnits = subUnitStats
      .filter(stat => {
        const accuracy = stat.totalQuestions > 0
          ? (stat.correctQuestions / stat.totalQuestions) * 100
          : 0;
        return accuracy >= 70 && stat.totalQuestions >= 3; // 최소 3문제 이상 푼 단원만
      })
      .sort((a, b) => {
        const accuracyA = a.totalQuestions > 0 ? (a.correctQuestions / a.totalQuestions) * 100 : 0;
        const accuracyB = b.totalQuestions > 0 ? (b.correctQuestions / b.totalQuestions) * 100 : 0;
        return accuracyB - accuracyA; // 정답률이 높은 순으로 정렬
      })
      .slice(0, 5); // 상위 5개만

    // 반 내 상위 퍼센트 계산
    let percentile = null;
    if (course && course.students && course.students.length > 1) {
      // 같은 강좌의 모든 학생들의 점수 계산
      const allStudentScores = [];
      
      for (const studentIdInCourse of course.students) {
        let studentTotalQuestions = 0;
        let studentTotalCorrect = 0;

        assignments.forEach(assignment => {
          const submission = assignment.submissions?.find(sub => {
            const subStudentId = sub.studentId?._id || sub.studentId;
            if (!subStudentId || String(subStudentId) !== String(studentIdInCourse)) {
              return false;
            }
            // 제출 시간이 해당 월 범위 내에 있는지 확인
            if (sub.submittedAt) {
              const submittedAt = new Date(sub.submittedAt);
              return submittedAt >= startDate && submittedAt <= endDate;
            }
            // submittedAt이 없으면 과제의 제출일 기준으로 포함
            return true;
          });

          if (submission) {
            studentTotalQuestions += assignment.questionCount || 0;
            studentTotalCorrect += submission.correctCount || 0;
          }
        });

        if (studentTotalQuestions > 0) {
          const accuracy = (studentTotalCorrect / studentTotalQuestions) * 100;
          allStudentScores.push({
            studentId: String(studentIdInCourse),
            accuracy
          });
        }
      }

      // 현재 학생의 정답률
      const currentStudentAccuracy = totalQuestions > 0
        ? (totalCorrect / totalQuestions) * 100
        : 0;

      // 정답률 순으로 정렬
      allStudentScores.sort((a, b) => b.accuracy - a.accuracy);

      // 현재 학생보다 높은 정답률을 가진 학생 수 계산
      const betterStudents = allStudentScores.filter(
        score => score.accuracy > currentStudentAccuracy
      ).length;

      // 퍼센트 계산
      percentile = allStudentScores.length > 0
        ? (betterStudents / allStudentScores.length) * 100
        : null;
    }

    res.json({
      success: true,
      data: {
        totalQuestions,
        totalCorrect,
        totalWrong: totalQuestions - totalCorrect,
        subUnitStats,
        weakUnits,
        strongUnits,
        percentile
      }
    });
  } catch (error) {
    console.error('학습현황 보고서 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '학습현황 보고서 조회 실패',
      error: error.message
    });
  }
};

module.exports = {
  getStudyReport
};

