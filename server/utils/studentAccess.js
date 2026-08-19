const mongoose = require('mongoose');
const getUser = require('../models/User');
const { getMathchangConnection } = require('../config/database');

const isTeacher = (req) => req?.user?.userType === '강사';
const isStudent = (req) => req?.user?.userType === '학생';

const denied = (message = '학생 데이터에 접근할 권한이 없습니다') => ({
  ok: false,
  status: 403,
  message,
});

const invalid = (message = '올바른 학생 ID가 아닙니다') => ({
  ok: false,
  status: 400,
  message,
});

const toObjectId = (value) => {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) return null;
  return new mongoose.Types.ObjectId(String(value));
};

/**
 * Parent access is derived from the source-of-truth mathchang database. The
 * legacy contact linkage is kept as a compatibility path, while the explicit
 * ParentStudentLink collection is preferred whenever it is available.
 */
const getLinkedStudentIds = async (req) => {
  if (req?.user?.userType !== '학부모') return [];

  const User = getUser();
  const parent = await User.findById(req.user._id)
    .select('userId phone parentContact studentContact')
    .lean();
  if (!parent) return [];

  const linkedIds = new Set();
  const connection = getMathchangConnection();
  const parentObjectId = toObjectId(req.user._id);

  if (connection && parentObjectId) {
    try {
      const links = await connection.db.collection('parentstudentlinks')
        .find({ parentId: parentObjectId }, { projection: { studentId: 1 } })
        .toArray();
      links.forEach((link) => {
        if (link.studentId) linkedIds.add(String(link.studentId));
      });
    } catch (error) {
      // A missing legacy collection must not make a parent implicitly trusted.
      if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error;
    }
  }

  const parentKeys = [parent.userId, parent.phone, parent.parentContact]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);
  if (parentKeys.length > 0) {
    const linkedStudents = await User.find({
      userType: '학생',
      parentContact: { $in: parentKeys },
    }).select('_id').lean();
    linkedStudents.forEach((student) => linkedIds.add(String(student._id)));
  }

  return [...linkedIds];
};

/**
 * Resolve a target student ID for read/report APIs. Students can only resolve
 * themselves, teachers can select a current student, and parents can only
 * resolve a server-verified linked child.
 */
const resolveStudentAccess = async (req, requestedId) => {
  if (!requestedId) return invalid('학생 ID는 필수입니다');

  const targetObjectId = toObjectId(requestedId);
  if (!targetObjectId) return invalid();
  const targetId = String(targetObjectId);

  if (isTeacher(req)) {
    const target = await getUser().findById(targetObjectId).select('_id userType').lean();
    if (!target || target.userType !== '학생') return denied();
    return { ok: true, id: targetId, user: target };
  }

  if (isStudent(req)) {
    if (String(req.user._id) !== targetId) return denied('본인 학생 데이터만 조회할 수 있습니다');
    return { ok: true, id: targetId, user: { _id: targetObjectId, userType: '학생' } };
  }

  if (req?.user?.userType === '학부모') {
    const linkedIds = await getLinkedStudentIds(req);
    if (!linkedIds.includes(targetId)) return denied('연결된 자녀의 데이터만 조회할 수 있습니다');
    return { ok: true, id: targetId, user: { _id: targetObjectId, userType: '학생' } };
  }

  return denied();
};

const requireStudentActor = (req, res) => {
  if (isStudent(req)) return true;
  res.status(403).json({
    success: false,
    message: '학생 계정만 이 작업을 수행할 수 있습니다',
  });
  return false;
};

const sendAccessError = (res, access) => res.status(access.status).json({
  success: false,
  message: access.message,
});

module.exports = {
  isTeacher,
  isStudent,
  getLinkedStudentIds,
  resolveStudentAccess,
  requireStudentActor,
  sendAccessError,
};
