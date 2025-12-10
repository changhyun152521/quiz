const Course = require('../models/Course');
const User = require('../models/User');
const Assignment = require('../models/Assignment');

// GET /api/courses - 모든 강좌 조회 (페이지네이션 지원)
const getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const courses = await Course.find()
      .populate('teacher', 'name userId')
      .populate('students', 'name userId email grade schoolName')
      .populate({
        path: 'assignments',
        select: 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate submissions',
        populate: {
          path: 'submissions.studentId',
          select: 'name userId'
        }
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
      .populate('teacher', 'name userId')
      .populate('students', 'name userId email grade schoolName studentPhone parentPhone')
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate');

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
const createCourse = async (req, res) => {
  try {
    const { courseName, teacher, students = [], assignments = [] } = req.body;

    // 필수 필드 검증
    if (!courseName || !teacher) {
      return res.status(400).json({
        success: false,
        message: '강좌 이름과 강사는 필수입니다'
      });
    }

    // 강사 존재 확인
    const teacherUser = await User.findById(teacher);
    if (!teacherUser || teacherUser.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: '유효한 강사를 찾을 수 없습니다'
      });
    }

    // 학생 유효성 검증
    const studentIds = Array.isArray(students) ? students : [];
    const studentNames = [];
    if (studentIds.length > 0) {
      const studentUsers = await User.find({ 
        _id: { $in: studentIds },
        role: 'student'
      });
      
      if (studentUsers.length !== studentIds.length) {
        return res.status(400).json({
          success: false,
          message: '일부 학생을 찾을 수 없습니다'
        });
      }
      
      studentUsers.forEach(student => {
        studentNames.push(student.name);
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
      teacherName: teacherUser.name,
      students: studentIds,
      studentNames: studentNames,
      assignments: assignmentIds
    });

    const savedCourse = await newCourse.save();

    // populate하여 응답
    const populatedCourse = await Course.findById(savedCourse._id)
      .populate('teacher', 'name userId')
      .populate('students', 'name userId email grade schoolName')
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate');

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
const updateCourse = async (req, res) => {
  try {
    const { courseName, teacher, students, assignments } = req.body;

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

    // 강사 수정
    if (teacher) {
      const teacherUser = await User.findById(teacher);
      if (!teacherUser || teacherUser.role !== 'teacher') {
        return res.status(404).json({
          success: false,
          message: '유효한 강사를 찾을 수 없습니다'
        });
      }
      updateData.teacher = teacher;
      updateData.teacherName = teacherUser.name;
    }

    // 학생 수정
    if (students !== undefined) {
      const studentIds = Array.isArray(students) ? students : [];
      const studentNames = [];
      
      if (studentIds.length > 0) {
        const studentUsers = await User.find({ 
          _id: { $in: studentIds },
          role: 'student'
        });
        
        if (studentUsers.length !== studentIds.length) {
          return res.status(400).json({
            success: false,
            message: '일부 학생을 찾을 수 없습니다'
          });
        }
        
        studentUsers.forEach(student => {
          studentNames.push(student.name);
        });
      }
      
      updateData.students = studentIds;
      updateData.studentNames = studentNames;
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
      .populate('teacher', 'name userId')
      .populate('students', 'name userId email grade schoolName')
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate');

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
const addStudentToCourse = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: '학생 ID는 필수입니다'
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

    // 학생 찾기
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: '학생을 찾을 수 없습니다'
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
    course.studentNames.push(student.name);

    const updatedCourse = await course.save();

    // populate하여 응답
    const populatedCourse = await Course.findById(updatedCourse._id)
      .populate('teacher', 'name userId')
      .populate('students', 'name userId email grade schoolName');

    res.json({
      success: true,
      message: '학생이 등록되었습니다',
      data: populatedCourse
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

    // populate하여 응답
    const populatedCourse = await Course.findById(updatedCourse._id)
      .populate('teacher', 'name userId')
      .populate('students', 'name userId email grade schoolName');

    res.json({
      success: true,
      message: '학생이 취소되었습니다',
      data: populatedCourse
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
const getTeachers = async (req, res) => {
  try {
    // role이 'teacher'인 사용자만 반환
    const teachers = await User.find({ role: 'teacher' })
      .select('name userId email')
      .sort({ name: 1 });

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
      .populate('teacher', 'name userId')
      .populate({
        path: 'assignments',
        select: 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate createdAt fileUrl fileType submissions',
        populate: {
          path: 'submissions.studentId',
          select: 'name userId'
        }
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
      .populate('teacher', 'name userId')
      .populate('students', 'name userId email grade schoolName')
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate');

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
      .populate('teacher', 'name userId')
      .populate('students', 'name userId email grade schoolName')
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate');

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
  getCoursesByStudent,
  addAssignmentToCourse,
  removeAssignmentFromCourse
};

