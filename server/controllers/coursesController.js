// mathchang-quiz는 mathchang의 인증을 사용합니다.
// 사용자 정보(이름 등)는 프론트엔드에서 전달받습니다.
// 사용자 ID는 mathchang의 _id (문자열)를 사용합니다.

const Course = require('../models/Course');
const Assignment = require('../models/Assignment');

const MATHCHANG_API_URL = process.env.MATHCHANG_API_URL || 'https://api.mathchang.com';

// GET /api/courses - 모든 강좌 조회 (페이지네이션 지원)
const getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // teacher, students는 문자열 ID로 저장됨 (populate 불필요)
    // teacherName, studentNames에 이름 저장됨
    const courses = await Course.find()
      .populate({
        path: 'assignments',
        select: 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate submissions questionFileUrl questionFileType solutionFileUrl solutionFileType fileUrl fileType'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments();

    res.json({
      success: true,
      data: courses,
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
      message: '강좌 목록 조회 실패',
      error: error.message
    });
  }
};

// GET /api/courses/:id - 특정 강좌 조회
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate questionFileUrl questionFileType solutionFileUrl solutionFileType fileUrl fileType');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: '강좌를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '강좌 조회 실패',
      error: error.message
    });
  }
};

// POST /api/courses - 새 강좌 생성
// 프론트엔드에서 teacher(ID), teacherName, students(ID배열), studentNames(이름배열)를 전달받음
const createCourse = async (req, res) => {
  try {
    const { courseName, teacher, teacherName, students = [], studentNames = [], assignments = [] } = req.body;

    // 필수 필드 검증
    if (!courseName || !teacher || !teacherName) {
      return res.status(400).json({
        success: false,
        message: '강좌 이름, 강사 ID, 강사 이름은 필수입니다'
      });
    }

    // 과제 유효성 검증
    const assignmentIds = Array.isArray(assignments) ? assignments : [];
    if (assignmentIds.length > 0) {
      const assignmentDocs = await Assignment.find({
        _id: { $in: assignmentIds }
      });

      if (assignmentDocs.length !== assignmentIds.length) {
        return res.status(400).json({
          success: false,
          message: '일부 과제를 찾을 수 없습니다'
        });
      }
    }

    // 새 강좌 생성
    const newCourse = new Course({
      courseName,
      teacher,
      teacherName,
      students: Array.isArray(students) ? students : [],
      studentNames: Array.isArray(studentNames) ? studentNames : [],
      assignments: assignmentIds
    });

    const savedCourse = await newCourse.save();

    // populate하여 응답
    const populatedCourse = await Course.findById(savedCourse._id)
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate questionFileUrl questionFileType solutionFileUrl solutionFileType fileUrl fileType');

    res.status(201).json({
      success: true,
      message: '강좌가 성공적으로 생성되었습니다',
      data: populatedCourse
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
      message: '강좌 생성 실패',
      error: error.message
    });
  }
};

// PUT /api/courses/:id - 강좌 정보 수정
// 프론트엔드에서 teacher(ID), teacherName, students(ID배열), studentNames(이름배열)를 전달받음
const updateCourse = async (req, res) => {
  try {
    const { courseName, teacher, teacherName, students, studentNames, assignments } = req.body;

    // 강좌 찾기
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '강좌를 찾을 수 없습니다'
      });
    }

    const updateData = {};

    // 강좌 이름 수정
    if (courseName) {
      // 강좌 이름 중복 체크 (다른 강좌가 사용 중인지)
      const existingCourse = await Course.findOne({
        courseName: courseName,
        _id: { $ne: req.params.id }
      });

      if (existingCourse) {
        return res.status(409).json({
          success: false,
          message: '이미 존재하는 강좌 이름입니다'
        });
      }
      updateData.courseName = courseName;
    }

    // 강사 수정 (ID와 이름 함께 전달받음)
    if (teacher && teacherName) {
      updateData.teacher = teacher;
      updateData.teacherName = teacherName;
    }

    // 학생 수정 (ID배열과 이름배열 함께 전달받음)
    if (students !== undefined && studentNames !== undefined) {
      updateData.students = Array.isArray(students) ? students : [];
      updateData.studentNames = Array.isArray(studentNames) ? studentNames : [];
    }

    // 과제 수정
    if (assignments !== undefined) {
      const assignmentIds = Array.isArray(assignments) ? assignments : [];

      if (assignmentIds.length > 0) {
        const assignmentDocs = await Assignment.find({
          _id: { $in: assignmentIds }
        });

        if (assignmentDocs.length !== assignmentIds.length) {
          return res.status(400).json({
            success: false,
            message: '일부 과제를 찾을 수 없습니다'
          });
        }
      }

      updateData.assignments = assignmentIds;
    }

    // 수정할 데이터가 없으면 에러
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '수정할 데이터가 없습니다'
      });
    }

    // 강좌 정보 업데이트
    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // populate하여 응답
    const populatedCourse = await Course.findById(updatedCourse._id)
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate questionFileUrl questionFileType solutionFileUrl solutionFileType fileUrl fileType');

    res.json({
      success: true,
      message: '강좌 정보가 성공적으로 수정되었습니다',
      data: populatedCourse
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
      message: '강좌 정보 수정 실패',
      error: error.message
    });
  }
};

// DELETE /api/courses/:id - 강좌 삭제
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: '강좌를 찾을 수 없습니다'
      });
    }

    res.json({
      success: true,
      message: '강좌가 삭제되었습니다'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '강좌 삭제 실패',
      error: error.message
    });
  }
};

// POST /api/courses/:id/students - 학생 등록
// 프론트엔드에서 studentId와 studentName을 함께 전달받음
const addStudentToCourse = async (req, res) => {
  try {
    const { studentId, studentName } = req.body;

    if (!studentId || !studentName) {
      return res.status(400).json({
        success: false,
        message: '학생 ID와 이름은 필수입니다'
      });
    }

    // 강좌 찾기
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '강좌를 찾을 수 없습니다'
      });
    }

    // 이미 등록된 학생인지 확인
    if (course.students.includes(studentId)) {
      return res.status(409).json({
        success: false,
        message: '이미 등록된 학생입니다'
      });
    }

    // 학생 추가
    course.students.push(studentId);
    course.studentNames.push(studentName);

    const updatedCourse = await course.save();

    res.json({
      success: true,
      message: '학생이 등록되었습니다',
      data: updatedCourse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '학생 등록 실패',
      error: error.message
    });
  }
};

// DELETE /api/courses/:id/students/:studentId - 학생 취소
const removeStudentFromCourse = async (req, res) => {
  try {
    const { studentId } = req.params;

    // 강좌 찾기
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '강좌를 찾을 수 없습니다'
      });
    }

    // 학생이 등록되어 있는지 확인
    const studentIndex = course.students.indexOf(studentId);
    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '등록된 학생이 아닙니다'
      });
    }

    // 학생 제거
    course.students.splice(studentIndex, 1);
    course.studentNames.splice(studentIndex, 1);

    const updatedCourse = await course.save();

    res.json({
      success: true,
      message: '학생이 취소되었습니다',
      data: updatedCourse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '학생 취소 실패',
      error: error.message
    });
  }
};

// GET /api/courses/teachers - 강사 목록 조회
// mathchang API에서 전체 유저를 가져와 강사만 필터링
const getTeachers = async (req, res) => {
  try {
    // mathchang API로 전체 유저 목록 요청
    const response = await fetch(`${MATHCHANG_API_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // 강사만 필터링 (userType === '강사' 또는 isAdmin === true)
    const users = data.data || data;
    const teachers = users.filter(user =>
      user.userType === '강사' || user.isAdmin === true
    );

    res.json({
      success: true,
      data: teachers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '강사 목록 조회 실패',
      error: error.message
    });
  }
};

// GET /api/courses/students - 학생 목록 조회
// mathchang API에서 전체 유저를 가져와 학생만 필터링
const getStudents = async (req, res) => {
  try {
    // mathchang API로 전체 유저 목록 요청
    const response = await fetch(`${MATHCHANG_API_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // 학생만 필터링 (userType === '학생')
    const users = data.data || data;
    const students = users.filter(user => user.userType === '학생');

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '학생 목록 조회 실패',
      error: error.message
    });
  }
};

// GET /api/courses/student/:studentId - 특정 학생이 등록된 강좌 목록 조회
const getCoursesByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: '학생 ID는 필수입니다'
      });
    }

    // 학생이 등록된 강좌들 조회
    const courses = await Course.find({ students: studentId })
      .populate({
        path: 'assignments',
        select: 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate createdAt fileUrl fileType questionFileUrl questionFileType solutionFileUrl solutionFileType submissions'
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '학생 강좌 목록 조회 실패',
      error: error.message
    });
  }
};

// POST /api/courses/:id/assignments - 강좌에 과제 추가
const addAssignmentToCourse = async (req, res) => {
  try {
    const { assignmentId } = req.body;

    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: '과제 ID는 필수입니다'
      });
    }

    // 강좌 찾기
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '강좌를 찾을 수 없습니다'
      });
    }

    // 과제 찾기
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: '과제를 찾을 수 없습니다'
      });
    }

    // 이미 등록된 과제인지 확인
    if (course.assignments.includes(assignmentId)) {
      return res.status(409).json({
        success: false,
        message: '이미 등록된 과제입니다'
      });
    }

    // 과제 추가
    course.assignments.push(assignmentId);

    const updatedCourse = await course.save();

    // populate하여 응답
    const populatedCourse = await Course.findById(updatedCourse._id)
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate questionFileUrl questionFileType solutionFileUrl solutionFileType fileUrl fileType');

    res.json({
      success: true,
      message: '과제가 등록되었습니다',
      data: populatedCourse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '과제 등록 실패',
      error: error.message
    });
  }
};

// DELETE /api/courses/:id/assignments/:assignmentId - 강좌에서 과제 제거
const removeAssignmentFromCourse = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    // 강좌 찾기
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: '강좌를 찾을 수 없습니다'
      });
    }

    // 과제가 등록되어 있는지 확인
    const assignmentIndex = course.assignments.indexOf(assignmentId);
    if (assignmentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '등록된 과제가 아닙니다'
      });
    }

    // 과제 제거
    course.assignments.splice(assignmentIndex, 1);

    const updatedCourse = await course.save();

    // populate하여 응답
    const populatedCourse = await Course.findById(updatedCourse._id)
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate questionFileUrl questionFileType solutionFileUrl solutionFileType fileUrl fileType');

    res.json({
      success: true,
      message: '과제가 제거되었습니다',
      data: populatedCourse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '과제 제거 실패',
      error: error.message
    });
  }
};

module.exports = {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  addStudentToCourse,
  removeStudentFromCourse,
  getTeachers,
  getStudents,
  getCoursesByStudent,
  addAssignmentToCourse,
  removeAssignmentFromCourse
};

