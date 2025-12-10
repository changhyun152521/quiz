const Assignment = require('../models/Assignment');
const { deleteFile, cloudinary } = require('../utils/cloudinary');

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
    const assignment = await Assignment.findById(req.params.id)
      .populate('submissions.studentId', 'name email');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    // 학생인 경우 정답(answers) 제외
    // 단, 제출된 과제인 경우 정답 포함 (정답 확인을 위해)
    // req.user가 있으면 (인증된 경우) 역할 확인, 없으면 정답 제외 (안전을 위해)
    const user = req.user;
    const isStudent = !user || (user.role === 'student' || !user.role);
    
    console.log('[getAssignmentById] 사용자 정보 확인:', {
      hasUser: !!user,
      userId: user?._id,
      userRole: user?.role,
      isStudent: isStudent
    });
    
    const assignmentData = assignment.toObject();
    
    // 디버깅 로그
    console.log('[getAssignmentById] assignment 데이터:', {
      assignmentId: assignment._id,
      hasAnswers: !!assignmentData.answers,
      answersCount: assignmentData.answers?.length,
      hasSubmissions: !!assignmentData.submissions,
      submissionsCount: assignmentData.submissions?.length,
      submissions: assignmentData.submissions?.map(sub => ({
        studentId: sub.studentId?._id || sub.studentId,
        hasStudentAnswers: !!sub.studentAnswers,
        studentAnswersCount: sub.studentAnswers?.length,
        studentAnswers: sub.studentAnswers
      })),
      user: user ? { _id: user._id, role: user.role } : null
    });
    
    // 학생인 경우
    if (isStudent && user) {
      // 제출 여부 확인
      const hasSubmission = assignment.submissions && assignment.submissions.some(
        sub => {
          const subStudentId = sub.studentId?._id || sub.studentId;
          const userId = user._id;
          return subStudentId && userId && String(subStudentId) === String(userId);
        }
      );
      
      console.log('[getAssignmentById] 제출 여부 확인:', {
        hasSubmission,
        userId: user._id,
        hasAnswers: !!assignmentData.answers,
        answersCount: assignmentData.answers?.length,
        submissions: assignment.submissions?.map(sub => ({
          studentId: sub.studentId?._id || sub.studentId,
          hasStudentAnswers: !!sub.studentAnswers,
          studentAnswers: sub.studentAnswers
        }))
      });
      
      // 제출하지 않은 경우에만 정답 제외
      if (!hasSubmission) {
        console.log('[getAssignmentById] 제출하지 않음 - 정답 제외');
        delete assignmentData.answers;
      } else {
        // 제출한 경우 정답 포함 (정답 확인을 위해)
        // assignmentData.answers가 없으면 원본 assignment에서 가져오기
        if (!assignmentData.answers || assignmentData.answers.length === 0) {
          if (assignment.answers && assignment.answers.length > 0) {
            console.log('[getAssignmentById] assignmentData에 정답이 없어서 원본에서 가져옵니다:', {
              answersCount: assignment.answers.length,
              answers: assignment.answers
            });
            assignmentData.answers = assignment.answers;
          }
        }
        console.log('[getAssignmentById] 제출함 - 정답 포함:', {
          hasAnswers: !!assignmentData.answers,
          answersCount: assignmentData.answers?.length,
          answers: assignmentData.answers
        });
      }
    } else if (isStudent && !user) {
      // 인증되지 않은 경우 정답 제외
      console.log('[getAssignmentById] 인증되지 않음 - 정답 제외');
      delete assignmentData.answers;
    } else {
      // 관리자나 강사인 경우 정답 포함
      console.log('[getAssignmentById] 관리자/강사 - 정답 포함:', {
        hasAnswers: !!assignmentData.answers,
        answersCount: assignmentData.answers?.length
      });
    }

    console.log('[getAssignmentById] 최종 반환 데이터:', {
      hasAnswers: !!assignmentData.answers,
      answersCount: assignmentData.answers?.length,
      answers: assignmentData.answers, // 정답 내용도 로그에 포함
      hasSubmissions: !!assignmentData.submissions,
      submissionsCount: assignmentData.submissions?.length,
      isStudent: isStudent,
      hasUser: !!user,
      userRole: user?.role
    });

    // 최종 확인: 제출된 과제인데 정답이 없으면 경고
    if (isStudent && user && assignmentData.submissions && assignmentData.submissions.some(
      sub => {
        const subStudentId = sub.studentId?._id || sub.studentId;
        return subStudentId && String(subStudentId) === String(user._id);
      }
    ) && (!assignmentData.answers || assignmentData.answers.length === 0)) {
      console.error('[getAssignmentById] 경고: 제출된 과제인데 정답이 없습니다!', {
        assignmentId: assignment._id,
        userId: user._id,
        assignmentHasAnswers: !!assignment.answers,
        assignmentAnswersCount: assignment.answers?.length,
        assignmentDataHasAnswers: !!assignmentData.answers,
        assignmentDataAnswersCount: assignmentData.answers?.length
      });
      
      // 원본 assignment에 정답이 있으면 포함
      if (assignment.answers && assignment.answers.length > 0) {
        console.log('[getAssignmentById] 원본 assignment에 정답이 있음, 포함합니다:', {
          answersCount: assignment.answers.length,
          answers: assignment.answers
        });
        assignmentData.answers = assignment.answers;
      }
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
      mainUnit,
      subUnit,
      questionCount,
      assignmentType,
      startDate,
      dueDate,
      fileUrl,
      fileType,
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
    // fileUrl과 fileType은 배열로 처리 (여러 파일 지원)
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
      mainUnit,
      subUnit,
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
    // 삭제 전에 과제 정보 가져오기 (Cloudinary 파일 삭제를 위해)
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
    const fileTypes = Array.isArray(assignment.fileType) ? assignment.fileType : (assignment.fileType ? [assignment.fileType] : []);

    console.log(`[과제 삭제] 과제 ${req.params.id}의 원본 파일 ${fileUrls.length}개 삭제 시작...`);
    
    for (let i = 0; i < fileUrls.length; i++) {
      const fileUrl = fileUrls[i];
      const fileType = fileTypes[i] || 'image'; // 기본값은 image
      
      if (fileUrl) {
        const urlInfo = extractPublicIdFromUrl(fileUrl);
        if (urlInfo && urlInfo.publicId) {
          // fileType에 따라 resource_type 결정
          const resourceType = fileType === 'pdf' ? 'raw' : 'image';
          
          // Cloudinary에서 파일 삭제
          deletePromises.push(
            deleteFile(urlInfo.publicId, resourceType).catch(error => {
              // 개별 파일 삭제 실패는 로그만 남기고 계속 진행
              console.error(`[과제 삭제] 원본 파일 삭제 실패 (public_id: ${urlInfo.publicId}, resource_type: ${resourceType}):`, error.message);
              return null; // 에러를 throw하지 않고 null 반환
            })
          );
        } else {
          console.warn(`[과제 삭제] Cloudinary URL에서 public_id를 추출할 수 없습니다: ${fileUrl}`);
        }
      }
    }

    // 2. 모든 학생 풀이 이미지 삭제
    if (assignment.submissions && Array.isArray(assignment.submissions) && assignment.submissions.length > 0) {
      console.log(`[과제 삭제] 학생 제출 ${assignment.submissions.length}개의 풀이 이미지 삭제 시작...`);
      
      for (const submission of assignment.submissions) {
        if (submission.solutionImages && Array.isArray(submission.solutionImages) && submission.solutionImages.length > 0) {
          console.log(`[과제 삭제] 학생 ${submission.studentId}의 풀이 이미지 ${submission.solutionImages.length}개 삭제 중...`);
          
          for (const solutionImageUrl of submission.solutionImages) {
            if (solutionImageUrl) {
              const urlInfo = extractPublicIdFromUrl(solutionImageUrl);
              if (urlInfo && urlInfo.publicId) {
                // 풀이 이미지는 항상 image 타입
                deletePromises.push(
                  deleteFile(urlInfo.publicId, urlInfo.resourceType || 'image').catch(error => {
                    // 개별 파일 삭제 실패는 로그만 남기고 계속 진행
                    console.error(`[과제 삭제] 학생 풀이 이미지 삭제 실패 (public_id: ${urlInfo.publicId}):`, error.message);
                    return null; // 에러를 throw하지 않고 null 반환
                  })
                );
              } else {
                console.warn(`[과제 삭제] 학생 풀이 이미지 URL에서 public_id를 추출할 수 없습니다: ${solutionImageUrl}`);
              }
            }
          }
        }
      }
    }

    // 모든 파일 삭제 시도 (일부 실패해도 계속 진행)
    if (deletePromises.length > 0) {
      console.log(`[과제 삭제] 총 ${deletePromises.length}개의 Cloudinary 파일 삭제 시도 중...`);
      await Promise.all(deletePromises);
      console.log(`[과제 삭제] ${deletePromises.length}개의 Cloudinary 파일 삭제 시도 완료`);
    } else {
      console.log(`[과제 삭제] 삭제할 Cloudinary 파일이 없습니다.`);
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
    const { studentAnswers, solutionImages } = req.body; // solutionImages: base64 이미지 배열
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

    // 풀이 이미지를 Cloudinary에 업로드
    let solutionImageUrls = [];
    if (solutionImages && Array.isArray(solutionImages) && solutionImages.length > 0) {
      console.log(`풀이 이미지 업로드 시작: ${solutionImages.length}개 이미지`);
      
      try {
        // 기존 풀이 이미지가 있으면 삭제
        if (existingSubmissionIndex >= 0 && assignment.submissions[existingSubmissionIndex].solutionImages) {
          console.log('기존 풀이 이미지 삭제 시작');
          for (const oldImageUrl of assignment.submissions[existingSubmissionIndex].solutionImages) {
            try {
              const publicIdInfo = extractPublicIdFromUrl(oldImageUrl);
              if (publicIdInfo && publicIdInfo.publicId) {
                await deleteFile(publicIdInfo.publicId, publicIdInfo.resourceType);
                console.log(`기존 이미지 삭제 완료: ${publicIdInfo.publicId}`);
              }
            } catch (deleteError) {
              console.error('기존 풀이 이미지 삭제 실패:', deleteError.message);
              // 삭제 실패해도 계속 진행
            }
          }
        }

        // 새 풀이 이미지 업로드
        for (let i = 0; i < solutionImages.length; i++) {
          const base64Image = solutionImages[i];
          if (base64Image && base64Image.startsWith('data:image')) {
            try {
              // base64 이미지 크기 확인 (디버깅용)
              const imageSizeKB = Math.round(base64Image.length / 1024);
              console.log(`풀이 이미지 ${i} 업로드 시작 (크기: ${imageSizeKB}KB)`);
              
              // base64를 Cloudinary에 업로드
              const uploadResult = await cloudinary.uploader.upload(base64Image, {
                folder: `assignments/${id}/solutions/${studentId}`,
                resource_type: 'image',
                public_id: `solution_${i}_${Date.now()}`,
                overwrite: false
              });
              
              solutionImageUrls.push(uploadResult.secure_url);
              console.log(`풀이 이미지 ${i} 업로드 완료: ${uploadResult.secure_url.substring(0, 50)}...`);
            } catch (uploadError) {
              console.error(`풀이 이미지 ${i} 업로드 실패:`, uploadError.message || uploadError);
              console.error('업로드 에러 상세:', JSON.stringify(uploadError, null, 2));
              // 업로드 실패해도 계속 진행 (답안 제출은 성공)
            }
          } else {
            console.warn(`풀이 이미지 ${i}가 유효한 base64 형식이 아닙니다.`);
          }
        }
        
        console.log(`풀이 이미지 업로드 완료: ${solutionImageUrls.length}/${solutionImages.length}개 성공`);
      } catch (error) {
        console.error('풀이 이미지 업로드 중 예상치 못한 오류:', error.message || error);
        console.error('에러 스택:', error.stack);
        // 이미지 업로드 실패해도 답안 제출은 계속 진행
      }
    } else {
      console.log('풀이 이미지가 없습니다.');
    }

    const submissionData = {
      studentId,
      studentAnswers,
      correctCount,
      wrongCount,
      submittedAt: new Date(),
      solutionImages: solutionImageUrls
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

module.exports = {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAnswers
};

