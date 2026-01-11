const Assignment = require('../models/Assignment');
const getUser = require('../models/User');
const { deleteFileByUrl } = require('../utils/fileService');

// GET /api/assignments - 모든 과제 조회 (페이지네이션 지원)
const getAllAssignments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const assignments = await Assignment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Assignment.countDocuments();

    res.json({
      success: true,
      data: assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '과제 목록 조회 실패',
      error: error.message
    });
  }
};

// GET /api/assignments/:id - 특정 과제 조회
// submissions.studentId를 mathchang DB의 User에서 조회하여 학생 이름 포함
const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    const assignmentObj = assignment.toObject();

    // submissions의 studentId에 대해 mathchang DB에서 User 정보 조회
    if (assignmentObj.submissions && assignmentObj.submissions.length > 0) {
      const User = getUser();

      for (let i = 0; i < assignmentObj.submissions.length; i++) {
        const sub = assignmentObj.submissions[i];
        if (sub.studentId) {
          try {
            const studentIdStr = sub.studentId.toString();
            const user = await User.findById(studentIdStr).select('name userId');
            if (user) {
              assignmentObj.submissions[i].studentId = {
                _id: studentIdStr,
                name: user.name,
                userId: user.userId
              };
            } else {
              // User를 찾을 수 없는 경우 ID만 유지
              assignmentObj.submissions[i].studentId = {
                _id: studentIdStr,
                name: null,
                userId: null
              };
            }
          } catch (err) {
            assignmentObj.submissions[i].studentId = {
              _id: sub.studentId.toString(),
              name: null,
              userId: null
            };
          }
        }
      }
    }

    // 학생인 경우 정답(answers) 제외
    // 단, 제출된 과제인 경우 정답 포함 (정답 확인을 위해)
    // req.user가 있으면 (인증된 경우) 역할 확인, 없으면 정답 제외 (안전을 위해)
    // mathchang의 userType: '학생', '학부모', '강사'
    const user = req.user;
    const isStudent = !user || (!user.isAdmin && user.userType !== '강사');

    // 학생인 경우
    if (isStudent && user) {
      // 제출 여부 확인
      const hasSubmission = assignmentObj.submissions && assignmentObj.submissions.some(
        sub => {
          const subStudentId = sub.studentId?._id || sub.studentId;
          const userId = user._id;
          return subStudentId && userId && String(subStudentId) === String(userId);
        }
      );

      // 제출하지 않은 경우에만 정답 제외
      if (!hasSubmission) {
        delete assignmentObj.answers;
      } else {
        // 제출한 경우 정답 포함 (정답 확인을 위해)
        // assignmentObj.answers가 없으면 원본 assignment에서 가져오기
        if (!assignmentObj.answers || assignmentObj.answers.length === 0) {
          if (assignment.answers && assignment.answers.length > 0) {
            assignmentObj.answers = assignment.answers;
          }
        }
      }
    } else if (isStudent && !user) {
      // 인증되지 않은 경우 정답 제외
      delete assignmentObj.answers;
    }
    // 관리자나 강사인 경우 정답 포함 (기본 동작)

    // 최종 확인: 제출된 과제인데 정답이 없으면 원본에서 가져오기
    if (isStudent && user && assignmentObj.submissions && assignmentObj.submissions.some(
      sub => {
        const subStudentId = sub.studentId?._id || sub.studentId;
        return subStudentId && String(subStudentId) === String(user._id);
      }
    ) && (!assignmentObj.answers || assignmentObj.answers.length === 0)) {
      // 원본 assignment에 정답이 있으면 포함
      if (assignment.answers && assignment.answers.length > 0) {
        assignmentObj.answers = assignment.answers;
      }
    }

    res.json({
      success: true,
      data: assignmentObj
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '과제 조회 실패',
      error: error.message
    });
  }
};

// POST /api/assignments - 새 과제 생성
const createAssignment = async (req, res) => {
  try {
    const {
      assignmentName,
      subject,
      mainUnit,
      subUnit,
      questionCount,
      assignmentType,
      startDate,
      dueDate,
      fileUrl,
      fileType,
      questionFileUrl,
      questionFileType,
      solutionFileUrl,
      solutionFileType,
      answers
    } = req.body;

    // 필수 필드 검증
    // 클리닉 타입일 때는 mainUnit과 subUnit이 필수가 아님
    const isClinic = assignmentType === '클리닉';
    if (!assignmentName || !subject || !questionCount || !assignmentType || !startDate || !dueDate) {
      return res.status(400).json({
        success: false,
        message: '모든 필수 필드를 입력해주세요'
      });
    }
    
    // QUIZ 타입일 때만 mainUnit과 subUnit 필수
    if (!isClinic && (!mainUnit || !subUnit)) {
      return res.status(400).json({
        success: false,
        message: 'QUIZ 타입일 때는 대단원과 소단원이 필수입니다'
      });
    }

    // 과제 타입 검증
    if (!['QUIZ', '클리닉'].includes(assignmentType)) {
      return res.status(400).json({
        success: false,
        message: '과제 타입은 QUIZ 또는 클리닉이어야 합니다'
      });
    }

    // 날짜 검증
    const start = new Date(startDate);
    const due = new Date(dueDate);

    if (isNaN(start.getTime()) || isNaN(due.getTime())) {
      return res.status(400).json({
        success: false,
        message: '올바른 날짜 형식이 아닙니다'
      });
    }

    if (due < start) {
      return res.status(400).json({
        success: false,
        message: '과제 제출일은 시작일 이후여야 합니다'
      });
    }

    // 새 과제 생성
    // fileUrl과 fileType은 배열로 처리 (여러 파일 지원, 하위 호환성 유지)
    // questionFileUrl, questionFileType, solutionFileUrl, solutionFileType은 새로운 필드
    // 클리닉 타입일 때는 mainUnit과 subUnit을 빈 문자열로 설정
    const newAssignment = new Assignment({
      assignmentName,
      subject,
      mainUnit: isClinic ? '' : mainUnit,
      subUnit: isClinic ? '' : subUnit,
      questionCount,
      assignmentType,
      startDate: start,
      dueDate: due,
      fileUrl: Array.isArray(fileUrl) ? fileUrl : (fileUrl ? [fileUrl] : []), // 하위 호환성 유지
      fileType: Array.isArray(fileType) ? fileType : (fileType ? [fileType] : []), // 하위 호환성 유지
      questionFileUrl: Array.isArray(questionFileUrl) ? questionFileUrl : (questionFileUrl ? [questionFileUrl] : []),
      questionFileType: Array.isArray(questionFileType) ? questionFileType : (questionFileType ? [questionFileType] : []),
      solutionFileUrl: Array.isArray(solutionFileUrl) ? solutionFileUrl : (solutionFileUrl ? [solutionFileUrl] : []),
      solutionFileType: Array.isArray(solutionFileType) ? solutionFileType : (solutionFileType ? [solutionFileType] : []),
      answers: Array.isArray(answers) ? answers : (answers ? [answers] : [])
    });

    const savedAssignment = await newAssignment.save();

    res.status(201).json({
      success: true,
      message: '과제가 성공적으로 생성되었습니다',
      data: savedAssignment
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: '과제 생성 실패',
      error: error.message
    });
  }
};

// PUT /api/assignments/:id - 과제 정보 수정
const updateAssignment = async (req, res) => {
  try {
    const {
      assignmentName,
      subject,
      mainUnit,
      subUnit,
      questionCount,
      assignmentType,
      startDate,
      dueDate,
      fileUrl,
      fileType,
      questionFileUrl,
      questionFileType,
      solutionFileUrl,
      solutionFileType,
      answers
    } = req.body;

    const updateData = {};
    if (assignmentName) updateData.assignmentName = assignmentName;
    if (subject) updateData.subject = subject;
    
    // 과제 타입 확인
    const isClinic = assignmentType === '클리닉';
    
    // 클리닉으로 변경하거나 이미 클리닉인 경우 mainUnit과 subUnit을 빈 문자열로 설정
    if (isClinic) {
      updateData.mainUnit = '';
      updateData.subUnit = '';
    } else {
      // QUIZ 타입일 때만 mainUnit과 subUnit 업데이트
      if (mainUnit !== undefined) updateData.mainUnit = mainUnit;
      if (subUnit !== undefined) updateData.subUnit = subUnit;
    }
    
    if (questionCount !== undefined) {
      if (questionCount < 1) {
        return res.status(400).json({
          success: false,
          message: '문항 수는 최소 1개 이상이어야 합니다'
        });
      }
      updateData.questionCount = questionCount;
    }
    if (assignmentType) {
      if (!['QUIZ', '클리닉'].includes(assignmentType)) {
        return res.status(400).json({
          success: false,
          message: '과제 타입은 QUIZ 또는 클리닉이어야 합니다'
        });
      }
      updateData.assignmentType = assignmentType;
    }
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl; // 하위 호환성 유지
    if (fileType !== undefined) updateData.fileType = fileType; // 하위 호환성 유지
    if (questionFileUrl !== undefined) {
      updateData.questionFileUrl = Array.isArray(questionFileUrl) ? questionFileUrl : (questionFileUrl ? [questionFileUrl] : []);
    }
    if (questionFileType !== undefined) {
      updateData.questionFileType = Array.isArray(questionFileType) ? questionFileType : (questionFileType ? [questionFileType] : []);
    }
    if (solutionFileUrl !== undefined) {
      updateData.solutionFileUrl = Array.isArray(solutionFileUrl) ? solutionFileUrl : (solutionFileUrl ? [solutionFileUrl] : []);
    }
    if (solutionFileType !== undefined) {
      updateData.solutionFileType = Array.isArray(solutionFileType) ? solutionFileType : (solutionFileType ? [solutionFileType] : []);
    }
    // answers 필드 처리
    if (answers !== undefined) {
      if (Array.isArray(answers)) {
        // 유효성 검증: 각 정답이 올바른 형식인지 확인
        for (const answer of answers) {
          if (!answer.questionNumber || !answer.answer) {
            return res.status(400).json({
              success: false,
              message: '정답 데이터 형식이 올바르지 않습니다. 문항 번호와 정답은 필수입니다.'
            });
          }
          if (answer.questionNumber < 1) {
            return res.status(400).json({
              success: false,
              message: '문항 번호는 1 이상이어야 합니다.'
            });
          }
          if (answer.score !== undefined && answer.score < 0) {
            return res.status(400).json({
              success: false,
              message: '배점은 0 이상이어야 합니다.'
            });
          }
        }
        updateData.answers = answers;
      } else {
        return res.status(400).json({
          success: false,
          message: '정답은 배열 형식이어야 합니다.'
        });
      }
    }
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: '올바른 시작일 형식이 아닙니다'
        });
      }
      updateData.startDate = start;
    }
    if (dueDate) {
      const due = new Date(dueDate);
      if (isNaN(due.getTime())) {
        return res.status(400).json({
          success: false,
          message: '올바른 제출일 형식이 아닙니다'
        });
      }
      updateData.dueDate = due;
    }

    // 날짜 검증 (시작일과 제출일이 모두 업데이트되는 경우)
    if (updateData.startDate && updateData.dueDate) {
      if (updateData.dueDate < updateData.startDate) {
        return res.status(400).json({
          success: false,
          message: '과제 제출일은 시작일 이후여야 합니다'
        });
      }
    } else if (updateData.startDate) {
      // 시작일만 업데이트되는 경우, 기존 제출일과 비교
      const existingAssignment = await Assignment.findById(req.params.id);
      if (existingAssignment && existingAssignment.dueDate < updateData.startDate) {
        return res.status(400).json({
          success: false,
          message: '과제 제출일은 시작일 이후여야 합니다'
        });
      }
    } else if (updateData.dueDate) {
      // 제출일만 업데이트되는 경우, 기존 시작일과 비교
      const existingAssignment = await Assignment.findById(req.params.id);
      if (existingAssignment && existingAssignment.startDate > updateData.dueDate) {
        return res.status(400).json({
          success: false,
          message: '과제 제출일은 시작일 이후여야 합니다'
        });
      }
    }

    // 수정할 데이터가 없으면 에러
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '수정할 데이터가 없습니다'
      });
    }

    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      message: '과제 정보가 수정되었습니다',
      data: assignment
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: '과제 수정 실패',
      error: error.message
    });
  }
};

// Cloudinary URL에서 public_id와 resource_type 추출 함수
const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Cloudinary URL 형식: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
    // 또는: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{public_id}.{format}
    const cloudinaryPattern = /\/res\.cloudinary\.com\/[^\/]+\/([^\/]+)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?(?:\?.*)?$/;
    const match = url.match(cloudinaryPattern);
    
    if (match && match[1] && match[2]) {
      const resourceType = match[1]; // 'image', 'raw', 'video' 등
      let publicId = match[2];
      
      // URL 디코딩
      publicId = decodeURIComponent(publicId);
      // 쿼리 파라미터 제거
      publicId = publicId.split('?')[0];
      
      return {
        publicId,
        resourceType: resourceType === 'raw' ? 'raw' : 'image' // PDF는 raw, 이미지는 image
      };
    }
    
    return null;
  } catch (error) {
    console.error('public_id 추출 오류:', error);
    return null;
  }
};

// DELETE /api/assignments/:id - 과제 삭제
const deleteAssignment = async (req, res) => {
  try {
    // 삭제 전에 과제 정보 가져오기 (파일 삭제를 위해)
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    const deletePromises = [];

    // 1. 과제의 원본 파일(문제지) 삭제
    const fileUrls = Array.isArray(assignment.fileUrl) ? assignment.fileUrl : (assignment.fileUrl ? [assignment.fileUrl] : []);
    for (const fileUrl of fileUrls) {
      deletePromises.push(deleteFileByUrl(fileUrl).catch((err) => {
        console.error('파일 삭제 실패:', err.message);
        return null;
      }));
    }

    // 2. questionFileUrl 삭제
    if (assignment.questionFileUrl && Array.isArray(assignment.questionFileUrl)) {
      for (const fileUrl of assignment.questionFileUrl) {
        deletePromises.push(deleteFileByUrl(fileUrl).catch((err) => {
          console.error('문제지 파일 삭제 실패:', err.message);
          return null;
        }));
      }
    }

    // 3. solutionFileUrl (해설지) 삭제
    if (assignment.solutionFileUrl && Array.isArray(assignment.solutionFileUrl)) {
      for (const fileUrl of assignment.solutionFileUrl) {
        deletePromises.push(deleteFileByUrl(fileUrl).catch((err) => {
          console.error('해설지 파일 삭제 실패:', err.message);
          return null;
        }));
      }
    }

    // 4. 모든 학생 풀이 이미지 삭제
    if (assignment.submissions && Array.isArray(assignment.submissions) && assignment.submissions.length > 0) {
      for (const submission of assignment.submissions) {
        if (submission.solutionImages && Array.isArray(submission.solutionImages) && submission.solutionImages.length > 0) {
          for (const solutionImageUrl of submission.solutionImages) {
            deletePromises.push(deleteFileByUrl(solutionImageUrl).catch((err) => {
              console.error('풀이 이미지 삭제 실패:', err.message);
              return null;
            }));
          }
        }
      }
    }

    // 모든 파일 삭제 시도 (일부 실패해도 계속 진행)
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }

    // 과제 삭제
    await Assignment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: '과제가 삭제되었습니다'
    });
  } catch (error) {
    console.error('과제 삭제 오류:', error);
    res.status(500).json({
      success: false,
      message: '과제 삭제 실패',
      error: error.message
    });
  }
};

// POST /api/assignments/:id/submit - 학생 답안 제출 및 채점
const submitAnswers = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentAnswers, strokeData } = req.body; // strokeData: 스트로크 데이터 배열
    const studentId = req.user._id; // 인증된 사용자 ID

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다'
      });
    }

    // 과제 조회
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    // 관리자 정답이 있는지 확인
    if (!assignment.answers || assignment.answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: '과제에 정답이 설정되지 않았습니다'
      });
    }

    // 학생 답안 검증
    if (!Array.isArray(studentAnswers) || studentAnswers.length === 0) {
      return res.status(400).json({
        success: false,
        message: '답안을 입력해주세요'
      });
    }

    // 정답 비교 및 채점
    let correctCount = 0;
    let wrongCount = 0;

    // 관리자 정답을 Map으로 변환 (빠른 조회를 위해)
    const correctAnswersMap = new Map();
    assignment.answers.forEach(answer => {
      correctAnswersMap.set(answer.questionNumber, answer.answer.trim().toLowerCase());
    });

    // 학생 답안과 비교
    studentAnswers.forEach(studentAnswer => {
      const questionNumber = studentAnswer.questionNumber;
      const studentAnswerText = studentAnswer.answer.trim().toLowerCase();
      const correctAnswer = correctAnswersMap.get(questionNumber);

      if (correctAnswer && studentAnswerText === correctAnswer) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });

    // 기존 제출이 있는지 확인
    const existingSubmissionIndex = assignment.submissions.findIndex(
      sub => sub.studentId.toString() === studentId.toString()
    );

    // 스트로크 데이터 처리 (새 방식 - 우선)
    let validatedStrokeData = [];
    if (strokeData && Array.isArray(strokeData) && strokeData.length > 0) {
      // 스트로크 데이터 유효성 검사 및 정리
      validatedStrokeData = strokeData.map((pageData, index) => {
        if (!pageData || typeof pageData !== 'object') {
          return {
            imageIndex: index,
            canvasSize: { width: 2100, height: 2970 },
            strokes: []
          };
        }

        // 스트로크 배열 검증
        const validStrokes = Array.isArray(pageData.strokes)
          ? pageData.strokes.filter(stroke =>
              stroke &&
              stroke.id &&
              stroke.type &&
              stroke.width &&
              Array.isArray(stroke.points) &&
              stroke.points.length > 0
            )
          : [];

        return {
          imageIndex: pageData.imageIndex ?? index,
          canvasSize: pageData.canvasSize || { width: 2100, height: 2970 },
          strokes: validStrokes
        };
      });
    }

    const submissionData = {
      studentId,
      studentAnswers,
      correctCount,
      wrongCount,
      submittedAt: new Date(),
      strokeData: validatedStrokeData
    };

    if (existingSubmissionIndex >= 0) {
      // 기존 제출 업데이트 (timeSpentSeconds 보존)
      const existingTimeSpent = assignment.submissions[existingSubmissionIndex].timeSpentSeconds || 0;
      assignment.submissions[existingSubmissionIndex] = {
        ...submissionData,
        timeSpentSeconds: existingTimeSpent
      };
    } else {
      // 새 제출 추가
      assignment.submissions.push({
        ...submissionData,
        timeSpentSeconds: 0
      });
    }

    await assignment.save();

    res.json({
      success: true,
      message: '답안이 제출되었습니다',
      data: {
        correctCount,
        wrongCount,
        totalCount: studentAnswers.length
      }
    });
  } catch (error) {
    console.error('답안 제출 오류:', error);
    console.error('에러 상세:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: '답안 제출 실패',
      error: error.message || '알 수 없는 오류가 발생했습니다.'
    });
  }
};

// POST /api/assignments/:id/heartbeat - 체류 시간 업데이트
const updateTimeSpent = async (req, res) => {
  try {
    const { id } = req.params;
    const { seconds } = req.body;
    const studentId = req.user._id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다'
      });
    }

    if (!seconds || typeof seconds !== 'number' || seconds <= 0) {
      return res.status(400).json({
        success: false,
        message: '유효한 시간(초)을 입력해주세요'
      });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    const existingIndex = assignment.submissions.findIndex(
      sub => sub.studentId.toString() === studentId.toString()
    );

    let totalSeconds = 0;

    if (existingIndex >= 0) {
      // 기존 submission이 있으면 시간 누적
      assignment.submissions[existingIndex].timeSpentSeconds =
        (assignment.submissions[existingIndex].timeSpentSeconds || 0) + seconds;
      totalSeconds = assignment.submissions[existingIndex].timeSpentSeconds;
    } else {
      // 없으면 새 submission 생성 (체류 시간만 기록)
      assignment.submissions.push({
        studentId,
        timeSpentSeconds: seconds,
        studentAnswers: [],
        correctCount: 0,
        wrongCount: 0,
        submittedAt: null,
        strokeData: []
      });
      totalSeconds = seconds;
    }

    await assignment.save();

    res.json({
      success: true,
      totalSeconds
    });
  } catch (error) {
    console.error('체류 시간 업데이트 오류:', error);
    res.status(500).json({
      success: false,
      message: '체류 시간 업데이트 실패',
      error: error.message
    });
  }
};

// POST /api/assignments/:id/save-draft - 풀이 임시저장
const saveDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { strokeData } = req.body;
    const studentId = req.user._id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다'
      });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    // 기존 제출이 있는지 확인
    const existingSubmissionIndex = assignment.submissions.findIndex(
      sub => String(sub.studentId) === String(studentId)
    );

    // 스트로크 데이터 검증
    let validatedStrokeData = [];
    if (strokeData && Array.isArray(strokeData)) {
      validatedStrokeData = strokeData.map((pageData, index) => {
        const validStrokes = Array.isArray(pageData.strokes)
          ? pageData.strokes.filter(stroke =>
              stroke &&
              stroke.id &&
              stroke.type &&
              stroke.width &&
              Array.isArray(stroke.points) &&
              stroke.points.length > 0
            )
          : [];

        return {
          imageIndex: pageData.imageIndex ?? index,
          canvasSize: pageData.canvasSize || { width: 2100, height: 2970 },
          strokes: validStrokes
        };
      });
    }

    if (existingSubmissionIndex >= 0) {
      // 기존 제출에 스트로크 데이터만 업데이트
      assignment.submissions[existingSubmissionIndex].strokeData = validatedStrokeData;
      assignment.submissions[existingSubmissionIndex].draftSavedAt = new Date();
    } else {
      // 새 임시저장 생성 (답안 없이 스트로크만)
      assignment.submissions.push({
        studentId,
        studentAnswers: [],
        correctCount: 0,
        wrongCount: 0,
        strokeData: validatedStrokeData,
        draftSavedAt: new Date(),
        submittedAt: null,  // 아직 제출 안 됨
        timeSpentSeconds: 0
      });
    }

    await assignment.save();

    const totalStrokes = validatedStrokeData.reduce((sum, page) => sum + page.strokes.length, 0);

    res.json({
      success: true,
      message: '임시저장되었습니다',
      data: {
        strokeCount: totalStrokes,
        savedAt: new Date()
      }
    });
  } catch (error) {
    console.error('임시저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '임시저장 실패',
      error: error.message
    });
  }
};

// GET /api/assignments/:id/draft - 임시저장된 풀이 조회
const getDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user._id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다'
      });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    const submission = assignment.submissions.find(
      sub => String(sub.studentId) === String(studentId)
    );

    if (!submission || !submission.strokeData || submission.strokeData.length === 0) {
      return res.json({
        success: true,
        data: {
          strokeData: [],
          savedAt: null
        }
      });
    }

    res.json({
      success: true,
      data: {
        strokeData: submission.strokeData,
        savedAt: submission.draftSavedAt || submission.submittedAt
      }
    });
  } catch (error) {
    console.error('임시저장 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '임시저장 조회 실패',
      error: error.message
    });
  }
};

module.exports = {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAnswers,
  updateTimeSpent,
  saveDraft,
  getDraft
};

