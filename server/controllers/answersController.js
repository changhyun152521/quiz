const Answer = require('../models/Answer');
const Assignment = require('../models/Assignment');
const Course = require('../models/Course');

// GET /api/answers - 모든 정답 조회 (필터링 지원)
const getAllAnswers = async (req, res) => {
  try {
    const { assignment, course } = req.query;
    const query = {};

    if (assignment) query.assignment = assignment;
    if (course) query.course = course;

    const answers = await Answer.find(query)
      .populate('assignment', 'assignmentName subject questionCount')
      .populate('course', 'courseName')
      .sort({ assignment: 1, course: 1, questionNumber: 1 });

    res.json({
      success: true,
      data: answers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '정답 목록 조회 실패',
      error: error.message
    });
  }
};

// GET /api/answers/:id - 특정 정답 조회
const getAnswerById = async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id)
      .populate('assignment', 'assignmentName subject questionCount')
      .populate('course', 'courseName');

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: '정답을 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      data: answer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '정답 조회 실패',
      error: error.message
    });
  }
};

// GET /api/answers/assignment/:assignmentId/course/:courseId - 특정 과제와 강좌의 모든 정답 조회
const getAnswersByAssignmentAndCourse = async (req, res) => {
  try {
    const { assignmentId, courseId } = req.params;

    const answers = await Answer.find({
      assignment: assignmentId,
      course: courseId
    })
      .sort({ questionNumber: 1 });

    res.json({
      success: true,
      data: answers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '정답 조회 실패',
      error: error.message
    });
  }
};

// POST /api/answers - 새 정답 생성 (또는 여러 정답 일괄 생성)
const createAnswer = async (req, res) => {
  try {
    const { assignment, course, answers } = req.body;

    // 단일 정답 생성
    if (!answers || !Array.isArray(answers)) {
      const { questionNumber, answer, points } = req.body;

      if (!assignment || !course || !questionNumber || !answer) {
        return res.status(400).json({
          success: false,
          message: '과제 ID, 강좌 ID, 문항 번호, 정답은 필수입니다'
        });
      }

      // 과제 존재 확인
      const assignmentDoc = await Assignment.findById(assignment);
      if (!assignmentDoc) {
        return res.status(404).json({
          success: false,
          message: '과제를 찾을 수 없습니다'
        });
      }

      // 문항 번호 유효성 검증
      if (questionNumber < 1 || questionNumber > assignmentDoc.questionCount) {
        return res.status(400).json({
          success: false,
          message: `문항 번호는 1부터 ${assignmentDoc.questionCount}까지 가능합니다`
        });
      }

      // 강좌 존재 확인
      const courseDoc = await Course.findById(course);
      if (!courseDoc) {
        return res.status(404).json({
          success: false,
          message: '강좌를 찾을 수 없습니다'
        });
      }

      // 중복 체크
      const existingAnswer = await Answer.findOne({
        assignment,
        course,
        questionNumber
      });

      if (existingAnswer) {
        return res.status(409).json({
          success: false,
          message: '이미 해당 문항의 정답이 존재합니다'
        });
      }

      const newAnswer = new Answer({
        assignment,
        course,
        questionNumber,
        answer,
        points: points || 1
      });

      const savedAnswer = await newAnswer.save();

      res.status(201).json({
        success: true,
        message: '정답이 성공적으로 생성되었습니다',
        data: savedAnswer
      });
    } else {
      // 여러 정답 일괄 생성
      if (!assignment || !course) {
        return res.status(400).json({
          success: false,
          message: '과제 ID와 강좌 ID는 필수입니다'
        });
      }

      // 과제 존재 확인
      const assignmentDoc = await Assignment.findById(assignment);
      if (!assignmentDoc) {
        return res.status(404).json({
          success: false,
          message: '과제를 찾을 수 없습니다'
        });
      }

      // 강좌 존재 확인
      const courseDoc = await Course.findById(course);
      if (!courseDoc) {
        return res.status(404).json({
          success: false,
          message: '강좌를 찾을 수 없습니다'
        });
      }

      // 기존 정답 삭제
      await Answer.deleteMany({ assignment, course });

      // 새 정답들 생성
      const answerDocs = answers.map((ans, index) => ({
        assignment,
        course,
        questionNumber: ans.questionNumber || index + 1,
        answer: ans.answer,
        points: ans.points || 1
      }));

      // 문항 번호 유효성 검증
      for (const ans of answerDocs) {
        if (ans.questionNumber < 1 || ans.questionNumber > assignmentDoc.questionCount) {
          return res.status(400).json({
            success: false,
            message: `문항 번호는 1부터 ${assignmentDoc.questionCount}까지 가능합니다`
          });
        }
      }

      const savedAnswers = await Answer.insertMany(answerDocs);

      res.status(201).json({
        success: true,
        message: `${savedAnswers.length}개의 정답이 성공적으로 생성되었습니다`,
        data: savedAnswers
      });
    }
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: '입력 데이터가 유효하지 않습니다',
        error: error.message
      });
    }
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: '이미 해당 문항의 정답이 존재합니다'
      });
    }
    res.status(500).json({
      success: false,
      message: '정답 생성 실패',
      error: error.message
    });
  }
};

// PUT /api/answers/:id - 정답 수정
const updateAnswer = async (req, res) => {
  try {
    const { answer, points } = req.body;
    const updateData = {};

    if (answer !== undefined) updateData.answer = answer;
    if (points !== undefined) updateData.points = points;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '수정할 데이터가 없습니다'
      });
    }

    const updatedAnswer = await Answer.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('assignment', 'assignmentName subject questionCount')
      .populate('course', 'courseName');

    if (!updatedAnswer) {
      return res.status(404).json({
        success: false,
        message: '정답을 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      message: '정답이 성공적으로 수정되었습니다',
      data: updatedAnswer
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
      message: '정답 수정 실패',
      error: error.message
    });
  }
};

// DELETE /api/answers/:id - 정답 삭제
const deleteAnswer = async (req, res) => {
  try {
    const deletedAnswer = await Answer.findByIdAndDelete(req.params.id);

    if (!deletedAnswer) {
      return res.status(404).json({
        success: false,
        message: '정답을 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      message: '정답이 성공적으로 삭제되었습니다',
      data: deletedAnswer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '정답 삭제 실패',
      error: error.message
    });
  }
};

// DELETE /api/answers/assignment/:assignmentId/course/:courseId - 특정 과제와 강좌의 모든 정답 삭제
const deleteAnswersByAssignmentAndCourse = async (req, res) => {
  try {
    const { assignmentId, courseId } = req.params;

    const result = await Answer.deleteMany({
      assignment: assignmentId,
      course: courseId
    });

    res.json({
      success: true,
      message: `${result.deletedCount}개의 정답이 성공적으로 삭제되었습니다`,
      data: { deletedCount: result.deletedCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '정답 삭제 실패',
      error: error.message
    });
  }
};

module.exports = {
  getAllAnswers,
  getAnswerById,
  getAnswersByAssignmentAndCourse,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  deleteAnswersByAssignmentAndCourse
};
