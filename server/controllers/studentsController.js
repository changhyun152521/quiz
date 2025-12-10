const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const User = require('../models/User');

// 과목별 대단원 및 소단원 순서 정의
const unitOrder = {
  '중1-1': {
    mainUnits: [
      '수와 연산',
      '정수와 유리수',
      '문자와 식',
      '좌표평면과 그래프'
    ],
    subUnits: {
      '수와 연산': ['소인수분해', '최대공약수와 최소공배수'],
      '정수와 유리수': ['정수와 유리수', '정수와 유리수의 계산'],
      '문자와 식': ['문자의 사용과 식의 계산', '일차방정식', '일차방정식의 활용'],
      '좌표평면과 그래프': ['좌표평면과 그래프', '정비례와 반비례']
    }
  },
  '중1-2': {
    mainUnits: [
      '기본 도형과 작도',
      '평면도형의 성질',
      '입체도형의 성질',
      '자료의 정리와 해석'
    ],
    subUnits: {
      '기본 도형과 작도': ['기본 도형', '위치 관계', '작도와 합동'],
      '평면도형의 성질': ['다각형', '원과 부채꼴'],
      '입체도형의 성질': ['다면체와 회전체', '입체도형의 겉넓이와 부피'],
      '자료의 정리와 해석': ['자료의 정리와 해석']
    }
  },
  '중2-1': {
    mainUnits: [
      '수와 식',
      '부등식',
      '방정식',
      '함수'
    ],
    subUnits: {
      '수와 식': ['유리수와 순환소수', '식의 계산'],
      '부등식': ['일차부등식', '일차부등식의 활용'],
      '방정식': ['연립일차방정식', '연립방정식의 풀이', '연립방정식의 활용'],
      '함수': ['일차함수와 그래프(1)', '일차함수와 그래프(2)', '일차함수와 일차방정식의 관계']
    }
  },
  '중2-2': {
    mainUnits: [
      '도형의 성질',
      '도형의 닮음',
      '확률'
    ],
    subUnits: {
      '도형의 성질': ['삼각형의 성질', '사각형의 성질'],
      '도형의 닮음': ['도형의 닮음', '닮은 도형의 성질', '피타고라스 정리'],
      '확률': ['경우의 수와 확률']
    }
  },
  '중3-1': {
    mainUnits: [
      '실수와 그 계산',
      '다항식의 곱셈과 인수분해',
      '이차방정식',
      '이차함수'
    ],
    subUnits: {
      '실수와 그 계산': ['제곱근과 실수', '근호를 포함한 식의 계산'],
      '다항식의 곱셈과 인수분해': ['다항식의 곱셈', '다항식의 인수분해'],
      '이차방정식': ['이차방정식의 풀이', '이차방정식의 활용'],
      '이차함수': ['이차함수의 그래프', '이차함수의 활용']
    }
  },
  '중3-2': {
    mainUnits: [
      '삼각비',
      '원의 성질',
      '통계'
    ],
    subUnits: {
      '삼각비': ['삼각비', '삼각비의 활용'],
      '원의 성질': ['원과 직선', '원주각', '원주각의 활용'],
      '통계': ['대푯값과 산포도', '상관관계']
    }
  },
  '공통수학1': {
    mainUnits: [
      '다항식',
      '방정식과 부등식',
      '경우의 수',
      '행렬'
    ],
    subUnits: {
      '다항식': ['다항식의 연산', '나머지정리', '인수분해'],
      '방정식과 부등식': ['복소수와 이차방정식', '이차방정식과 이차함수', '여러 가지 방정식과 부등식'],
      '경우의 수': ['합의 법칙과 곱의 법칙', '순열과 조합'],
      '행렬': ['행렬과 그 연산']
    }
  },
  '공통수학2': {
    mainUnits: [
      '도형의 방정식',
      '집합과 명제',
      '함수와 그래프'
    ],
    subUnits: {
      '도형의 방정식': ['평면좌표', '직선의 방정식', '원의 방정식', '도형의 이동'],
      '집합과 명제': ['집합', '명제'],
      '함수와 그래프': ['함수', '유무리함수']
    }
  },
  '대수': {
    mainUnits: [
      '지수함수와 로그함수',
      '삼각함수',
      '수열'
    ],
    subUnits: {
      '지수함수와 로그함수': ['지수와 로그', '지수함수와 로그함수'],
      '삼각함수': ['삼각함수', '사인법칙과 코사인법칙'],
      '수열': ['등차수열과 등비수열', '수열의 합', '수학적 귀납법']
    }
  },
  '미적분1': {
    mainUnits: [
      '함수의 극한과 연속',
      '미분',
      '적분'
    ],
    subUnits: {
      '함수의 극한과 연속': ['함수의 극한', '함수의 연속'],
      '미분': ['미분계수와 도함수', '도함수의 활용'],
      '적분': ['부정적분과 정적분', '정적분의 활용']
    }
  },
  '미적분2': {
    mainUnits: [
      '수열의극한',
      '미분법',
      '적분법'
    ],
    subUnits: {
      '수열의극한': ['수열의 극한', '급수'],
      '미분법': ['지수함수와 로그함수의 미분', '삼각함수의 미분', '여러가지 미분법', '도함수의 활용'],
      '적분법': ['여러가지 함수의 적분', '치환적분과 부분적분법', '정적분의 활용']
    }
  },
  '확률과통계': {
    mainUnits: [
      '순열과 조합',
      '확률',
      '통계'
    ],
    subUnits: {
      '순열과 조합': ['순열', '조합'],
      '확률': ['확률의 뜻과 활용', '조건부확률'],
      '통계': ['확률분포', '통계적추정']
    }
  },
  '기하': {
    mainUnits: [
      '이차곡선',
      '공간도형과 공간좌표',
      '벡터'
    ],
    subUnits: {
      '이차곡선': ['포물선, 타원, 쌍곡선', '이차곡선의 접선'],
      '공간도형과 공간좌표': ['직선과 평면의 위치관계', '삼수선 정리', '정사영', '좌표공간의 거리 및 내분점', '구의 방정식'],
      '벡터': ['백터의 덧셈, 뺄셈, 실수배', '내적 계산', '평면의 방정식']
    }
  }
};

// 소단원별 통계 정렬 함수
function sortSubUnitStats(stats) {
  return stats.sort((a, b) => {
    // 1. 과목 순서 비교
    const subjectOrder = Object.keys(unitOrder);
    const subjectIndexA = subjectOrder.indexOf(a.subject);
    const subjectIndexB = subjectOrder.indexOf(b.subject);
    
    if (subjectIndexA !== subjectIndexB) {
      // 과목이 정의되지 않은 경우 맨 뒤로
      if (subjectIndexA === -1) return 1;
      if (subjectIndexB === -1) return -1;
      return subjectIndexA - subjectIndexB;
    }
    
    // 같은 과목인 경우
    const subjectData = unitOrder[a.subject];
    if (!subjectData) {
      // 과목 데이터가 없으면 문자열 비교
      if (a.mainUnit !== b.mainUnit) {
        return (a.mainUnit || '').localeCompare(b.mainUnit || '');
      }
      return (a.subUnit || '').localeCompare(b.subUnit || '');
    }
    
    // 2. 대단원 순서 비교
    const mainUnitIndexA = subjectData.mainUnits.indexOf(a.mainUnit);
    const mainUnitIndexB = subjectData.mainUnits.indexOf(b.mainUnit);
    
    if (mainUnitIndexA !== mainUnitIndexB) {
      // 대단원이 정의되지 않은 경우 맨 뒤로
      if (mainUnitIndexA === -1) return 1;
      if (mainUnitIndexB === -1) return -1;
      return mainUnitIndexA - mainUnitIndexB;
    }
    
    // 같은 대단원인 경우
    const subUnits = subjectData.subUnits[a.mainUnit];
    if (!subUnits) {
      // 소단원 데이터가 없으면 문자열 비교
      return (a.subUnit || '').localeCompare(b.subUnit || '');
    }
    
    // 3. 소단원 순서 비교
    const subUnitIndexA = subUnits.indexOf(a.subUnit);
    const subUnitIndexB = subUnits.indexOf(b.subUnit);
    
    if (subUnitIndexA !== subUnitIndexB) {
      // 소단원이 정의되지 않은 경우 맨 뒤로
      if (subUnitIndexA === -1) return 1;
      if (subUnitIndexB === -1) return -1;
      return subUnitIndexA - subUnitIndexB;
    }
    
    return 0;
  });
}

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

    // 소단원별 통계 배열로 변환 및 정렬
    const subUnitStats = sortSubUnitStats(Array.from(subUnitStatsMap.values()));

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

    // 강점 단원 찾기 (정답률이 70% 이상인 단원)
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

