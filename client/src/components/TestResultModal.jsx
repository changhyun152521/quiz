import { useState, useEffect } from 'react';
import './TestResultModal.css';

function TestResultModal({ showModal, onClose, course }) {
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // 과제 선택 시 학생별 결과 조회
  useEffect(() => {
    if (selectedAssignment && course) {
      fetchStudentResults();
    } else {
      setStudentResults([]);
    }
  }, [selectedAssignment, course]);

  const fetchStudentResults = async () => {
    if (!selectedAssignment || !course) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // 과제 ID 추출
      const assignmentId = selectedAssignment._id || selectedAssignment;
      
      const response = await fetch(`http://localhost:5000/api/assignments/${assignmentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success && data.data) {
        const assignment = data.data;
        const results = [];

        // 강좌의 모든 학생에 대해 결과 확인
        // course.students가 populate되었는지 확인
        const students = course.students || [];
        const studentNames = course.studentNames || [];
        
        students.forEach((student, index) => {
          const studentId = student._id || student;
          const studentName = student.name || studentNames[index] || '알 수 없음';
          
          // 해당 학생의 제출 정보 찾기
          const submission = assignment.submissions?.find(sub => {
            const subStudentId = sub.studentId?._id || sub.studentId;
            return subStudentId && String(subStudentId) === String(studentId);
          });

          results.push({
            studentId: studentId,
            studentName: studentName,
            isSubmitted: !!submission,
            correctCount: submission?.correctCount || 0,
            wrongCount: submission?.wrongCount || 0,
            totalCount: assignment.questionCount || 0,
            submittedAt: submission?.submittedAt || null
          });
        });

        setStudentResults(results);
      }
    } catch (error) {
      console.error('학생 결과 조회 오류:', error);
      alert('학생 결과를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="test-result-modal-overlay" onClick={onClose}>
      <div className="test-result-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="test-result-modal-header">
          <h2 className="test-result-modal-title">테스트 조회</h2>
          <button className="test-result-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="test-result-modal-body">
          {/* 강좌 정보 */}
          <div className="test-result-course-info">
            <h3>{course?.courseName || '강좌명'}</h3>
            <p>수강생: {course?.students?.length || 0}명</p>
          </div>

          {/* 과제 선택 */}
          <div className="test-result-assignment-select">
            <label className="test-result-label">과제 선택</label>
            <select
              className="test-result-select"
              value={selectedAssignment?._id || selectedAssignment || ''}
              onChange={(e) => {
                const assignmentId = e.target.value;
                if (!assignmentId) {
                  setSelectedAssignment(null);
                  return;
                }
                
                // assignment 객체 찾기
                const assignment = course?.assignments?.find(a => {
                  const aId = a._id || a;
                  return String(aId) === String(assignmentId);
                });
                
                if (assignment) {
                  // assignment 객체가 이미 있는 경우
                  setSelectedAssignment(assignment._id ? assignment : { _id: assignment, ...assignment });
                } else {
                  // assignment ID만 있는 경우 객체 생성
                  setSelectedAssignment({ _id: assignmentId });
                }
              }}
            >
              <option value="">과제를 선택하세요</option>
              {course?.assignments?.map((assignment) => {
                const assignmentId = assignment._id || assignment;
                const assignmentName = assignment.assignmentName || assignment.name || '과제명 없음';
                return (
                  <option key={assignmentId} value={assignmentId}>
                    {assignmentName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 학생별 결과 테이블 */}
          {selectedAssignment && (
            <div className="test-result-table-container">
              {loading ? (
                <div className="test-result-loading">
                  <p>로딩 중...</p>
                </div>
              ) : (
                <table className="test-result-table">
                  <thead>
                    <tr>
                      <th>학생명</th>
                      <th>제출 상태</th>
                      <th>결과</th>
                      <th>제출일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentResults.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="test-result-empty">
                          수강생이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      studentResults.map((result) => (
                        <tr key={result.studentId}>
                          <td>{result.studentName}</td>
                          <td>
                            <span className={`test-result-status ${result.isSubmitted ? 'submitted' : 'not-submitted'}`}>
                              {result.isSubmitted ? '제출완료' : '미제출'}
                            </span>
                          </td>
                          <td>
                            {result.isSubmitted ? (
                              <span className="test-result-score">
                                {result.totalCount}개 중 {result.correctCount}개 맞음
                              </span>
                            ) : (
                              <span className="test-result-no-score">-</span>
                            )}
                          </td>
                          <td>
                            {result.submittedAt ? (
                              new Date(result.submittedAt).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestResultModal;

