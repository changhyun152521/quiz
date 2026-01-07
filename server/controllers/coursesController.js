// mathchang-quiz는 mathchang의 인증을 사용합니다.
// 사용자 ID는 mathchang의 _id (문자열)를 사용합니다.

const Course = require('../models/Course');
const Assignment = require('../models/Assignment');

const MATHCHANG_API_URL = process.env.MATHCHANG_API_URL || 'https://api.mathchang.com';

// 학생 ID 배열로 학생 정보를 가져오는 헬퍼 함수
const fetchStudentsByIds = async (studentIds, authHeader) => {
  if (!studentIds || studentIds.length === 0) return [];

  try {
    const response = await fetch(`${MATHCHANG_API_URL}/api/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader || ''
      }
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('학생 정보 API 응답 오류:', response.status, data);
      return [];
    }

    const users = data.data || data;
    const studentIdStrings = studentIds.map(id => String(id));

    // 학생 ID에 해당하는 사용자만 필터링하고 순서 유지
    const result = studentIdStrings.map(id => {
      const user = users.find(u => String(u._id) === id);
      if (!user) {
        console.log(`학생 ID ${id}에 해당하는 사용자를 찾을 수 없음`);
      }
      return user ? { _id: user._id, name: user.name, userId: user.userId } : { _id: id, name: '알 수 없음' };
    });
    return result;
  } catch (error) {
    console.error('학생 정보 조회 오류:', error);
    return studentIds.map(id => ({ _id: String(id), name: '알 수 없음' }));
  }
};

// 강좌에 학생 정보를 join하는 헬퍼 함수
const populateStudents = async (courses, authHeader) => {
  // 모든 강좌의 학생 ID를 수집 (중복 제거)
  const allStudentIds = [...new Set(
    courses.flatMap(course => (course.students || []).map(id => String(id)))
  )];

  if (allStudentIds.length === 0) return courses;

  // 한 번에 모든 학생 정보 조회
  const studentsInfo = await fetchStudentsByIds(allStudentIds, authHeader);
  const studentMap = new Map(studentsInfo.map(s => [String(s._id), s]));

  // 각 강좌의 students를 학생 정보로 교체
  return courses.map(course => {
    const courseObj = course.toObject ? course.toObject() : { ...course };
    courseObj.students = (course.students || []).map(id =>
      studentMap.get(String(id)) || { _id: String(id), name: '알 수 없음' }
    );
    return courseObj;
  });
};

// GET /api/courses - 모든 강좌 조회 (페이지네이션 지원)
// studentId 쿼리 파라미터가 있으면 해당 학생이 등록된 강좌만 반환
const getAllCourses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { studentId } = req.query;

    // 필터 조건 설정
    const filter = {};
    if (studentId) {
      filter.students = studentId;  // 해당 학생이 등록된 강좌만 필터링
    }

    const courses = await Course.find(filter)
      .populate({
        path: 'assignments',
        select: 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate submissions questionFileUrl questionFileType solutionFileUrl solutionFileType fileUrl fileType'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(filter);

    // 학생 정보 join
    const coursesWithStudents = await populateStudents(courses, req.headers.authorization);

    res.json({
      success: true,
      data: coursesWithStudents,
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

    // 학생 정보 join
    const [courseWithStudents] = await populateStudents([course], req.headers.authorization);

    res.json({
      success: true,
      data: courseWithStudents
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
// 프론트엔드에서 teacher(ID), teacherName, students(ID배열)를 전달받음
const createCourse = async (req, res) => {
  try {
    const { courseName, teacher, teacherName, students = [], assignments = [] } = req.body;

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
      assignments: assignmentIds
    });

    const savedCourse = await newCourse.save();

    // populate하여 응답
    const populatedCourse = await Course.findById(savedCourse._id)
      .populate('assignments', 'assignmentName subject mainUnit subUnit questionCount assignmentType startDate dueDate questionFileUrl questionFileType solutionFileUrl solutionFileType fileUrl fileType');

    // 학생 정보 join
    const coursesWithStudents = await populateStudents([populatedCourse], req.headers.authorization);

    res.status(201).json({
      success: true,
      message: '강좌가 성공적으로 생성되었습니다',
      data: coursesWithStudents[0]
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
// 프론트엔드에서 teacher(ID), teacherName, students(ID배열)를 전달받음
const updateCourse = async (req, res) => {
  try {
    const { courseName, teacher, teacherName, students, assignments } = req.body;

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

    // 학생 수정 (ID배열만 전달받음)
    if (students !== undefined) {
      updateData.students = Array.isArray(students) ? students : [];
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

    // 학생 정보 join
    const coursesWithStudents = await populateStudents([populatedCourse], req.headers.authorization);

    res.json({
      success: true,
      message: '강좌 정보가 성공적으로 수정되었습니다',
      data: coursesWithStudents[0]
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
// 프론트엔드에서 studentId만 전달받음
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

    // 이미 등록된 학생인지 확인
    const studentIdStr = String(studentId);
    if (course.students.some(id => String(id) === studentIdStr)) {
      return res.status(409).json({
        success: false,
        message: '이미 등록된 학생입니다'
      });
    }

    // 학생 추가
    course.students.push(studentId);

    const updatedCourse = await course.save();

    // 학생 정보 join
    const coursesWithStudents = await populateStudents([updatedCourse], req.headers.authorization);

    res.json({
      success: true,
      message: '학생이 등록되었습니다',
      data: coursesWithStudents[0]
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
    const studentIndex = course.students.findIndex(id => String(id) === String(studentId));
    if (studentIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '등록된 학생이 아닙니다'
      });
    }

    // 학생 제거
    course.students.splice(studentIndex, 1);

    const updatedCourse = await course.save();

    // 학생 정보 join
    const coursesWithStudents = await populateStudents([updatedCourse], req.headers.authorization);

    res.json({
      success: true,
      message: '학생이 취소되었습니다',
      data: coursesWithStudents[0]
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

    // 학생 정보 join
    const coursesWithStudents = await populateStudents(courses, req.headers.authorization);

    res.json({
      success: true,
      data: coursesWithStudents
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
    const assignmentIdStr = String(assignmentId);
    if (course.assignments.some(id => String(id) === assignmentIdStr)) {
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

    // 학생 정보 join
    const coursesWithStudents = await populateStudents([populatedCourse], req.headers.authorization);

    res.json({
      success: true,
      message: '과제가 등록되었습니다',
      data: coursesWithStudents[0]
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
    const assignmentIndex = course.assignments.findIndex(id => String(id) === String(assignmentId));
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

    // 학생 정보 join
    const coursesWithStudents = await populateStudents([populatedCourse], req.headers.authorization);

    res.json({
      success: true,
      message: '과제가 제거되었습니다',
      data: coursesWithStudents[0]
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

