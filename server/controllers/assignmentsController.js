const Assignment = require('../models/Assignment');

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
const getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    // 학생인 경우 정답(answers) 제외
    // req.user가 있으면 (인증된 경우) 역할 확인, 없으면 정답 제외 (안전을 위해)
    const user = req.user;
    const isStudent = !user || (user.role === 'student' || !user.role);
    
    const assignmentData = assignment.toObject();
    if (isStudent) {
      delete assignmentData.answers;
    }

    res.json({
      success: true,
      data: assignmentData
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
      questionCount,
      assignmentType,
      startDate,
      dueDate,
      fileUrl,
      fileType,
      answers
    } = req.body;

    // 필수 필드 검증
    if (!assignmentName || !subject || !questionCount || !assignmentType || !startDate || !dueDate) {
      return res.status(400).json({
        success: false,
        message: '모든 필수 필드를 입력해주세요'
      });
    }

    // 과제 타입 검증
    if (!['QUIZ', '실전TEST'].includes(assignmentType)) {
      return res.status(400).json({
        success: false,
        message: '과제 타입은 QUIZ 또는 실전TEST여야 합니다'
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
    // fileUrl과 fileType은 배열로 처리 (여러 파일 지원)
    const newAssignment = new Assignment({
      assignmentName,
      subject,
      questionCount,
      assignmentType,
      startDate: start,
      dueDate: due,
      fileUrl: Array.isArray(fileUrl) ? fileUrl : (fileUrl ? [fileUrl] : []),
      fileType: Array.isArray(fileType) ? fileType : (fileType ? [fileType] : []),
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
      questionCount,
      assignmentType,
      startDate,
      dueDate,
      fileUrl,
      fileType,
      answers
    } = req.body;

    const updateData = {};
    if (assignmentName) updateData.assignmentName = assignmentName;
    if (subject) updateData.subject = subject;
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
      if (!['QUIZ', '실전TEST'].includes(assignmentType)) {
        return res.status(400).json({
          success: false,
          message: '과제 타입은 QUIZ 또는 실전TEST여야 합니다'
        });
      }
      updateData.assignmentType = assignmentType;
    }
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
    if (fileType !== undefined) updateData.fileType = fileType;
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

// DELETE /api/assignments/:id - 과제 삭제
const deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      message: '과제가 삭제되었습니다'
    });
  } catch (error) {
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
    const { studentAnswers } = req.body;
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

    const submissionData = {
      studentId,
      studentAnswers,
      correctCount,
      wrongCount,
      submittedAt: new Date()
    };

    if (existingSubmissionIndex >= 0) {
      // 기존 제출 업데이트
      assignment.submissions[existingSubmissionIndex] = submissionData;
    } else {
      // 새 제출 추가
      assignment.submissions.push(submissionData);
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
    res.status(500).json({
      success: false,
      message: '답안 제출 실패',
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
  submitAnswers
};

