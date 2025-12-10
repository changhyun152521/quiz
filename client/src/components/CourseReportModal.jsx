import { useState, useEffect, useRef } from 'react';
import { get, post } from '../utils/api';
import html2canvas from 'html2canvas';
import MessageSendModal from './MessageSendModal';
import './CourseReportModal.css';
import './StudyReportModal.css';

function CourseReportModal({ showModal, onClose, course }) {
  // 기본 기간: 이번 달 1일부터 오늘까지
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [startDate, setStartDate] = useState(
    firstDayOfMonth.toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    today.toISOString().split('T')[0]
  );
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);

  // 강좌 정보 가져오기 (학생 정보 포함)
  useEffect(() => {
    const fetchCourseData = async () => {
      if (showModal && course?._id) {
        try {
          const response = await get(`/api/courses/${course._id}`);
          const data = await response.json();
          if (data.success) {
            setCourseData(data.data);
            // 첫 번째 학생을 기본 선택
            if (data.data?.students && data.data.students.length > 0) {
              setSelectedStudentId(data.data.students[0]._id);
            }
          }
        } catch (error) {
          console.error('강좌 정보 조회 오류:', error);
        }
      }
    };
    fetchCourseData();
  }, [showModal, course]);

  // 선택한 학생의 보고서 데이터 가져오기
  const fetchReportData = async () => {
    const currentCourse = courseData || course;
    if (!currentCourse?._id || !selectedStudentId) {
      setError('강좌 정보 또는 학생 정보가 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await get(
        `/api/students/${selectedStudentId}/study-report?startDate=${startDate}&endDate=${endDate}&courseId=${currentCourse._id}`
      );
      const data = await response.json();

      if (data.success) {
        setReportData(data.data);
      } else {
        setError(data.message || '보고서 데이터를 불러올 수 없습니다.');
        setReportData(null);
      }
    } catch (error) {
      console.error('보고서 데이터 조회 오류:', error);
      setError('보고서 데이터를 불러오는 중 오류가 발생했습니다.');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  // 모달이 열릴 때마다 또는 선택이 변경될 때마다 데이터 가져오기
  useEffect(() => {
    const currentCourse = courseData || course;
    if (showModal && currentCourse?._id && selectedStudentId && startDate && endDate) {
      fetchReportData();
    }
  }, [showModal, courseData, course, startDate, endDate, selectedStudentId]);

  // 개별 메시지 발송 모달 열기
  const handleSendMessage = () => {
    if (!selectedStudentId || !reportData) {
      alert('학생을 선택하고 보고서를 불러온 후 발송할 수 있습니다.');
      return;
    }
    setShowMessageModal(true);
  };

  // 개별 메시지 실제 발송
  const handleSendMessageConfirm = async ({ reportTitle, comment, reportRef }) => {
    setSendingMessage(true);
    try {
      const currentCourse = courseData || course;
      const selectedStudent = courseData?.students?.find(s => s._id === selectedStudentId);

      // 보고서를 이미지로 변환
      let reportImage = null;
      if (reportRef) {
        try {
          const canvas = await html2canvas(reportRef, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
          });
          reportImage = canvas.toDataURL('image/png');
        } catch (error) {
          console.error('이미지 변환 오류:', error);
          alert('보고서 이미지 변환 중 오류가 발생했습니다.');
          setSendingMessage(false);
          return;
        }
      }

      const response = await post('/api/messages/send-report', {
        studentId: selectedStudentId,
        courseId: currentCourse._id,
        startDate,
        endDate,
        reportTitle,
        comment,
        reportImage,
        parentPhone: selectedStudent?.parentPhone
      });

      const data = await response.json();
      if (data.success) {
        alert('메시지가 발송되었습니다.');
        setShowMessageModal(false);
      } else {
        alert(data.message || '메시지 발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('메시지 발송 오류:', error);
      alert('메시지 발송 중 오류가 발생했습니다.');
    } finally {
      setSendingMessage(false);
    }
  };

  // 일괄 메시지 발송 모달 열기
  const handleSendBulkMessages = () => {
    const currentCourse = courseData || course;
    if (!currentCourse?.students || currentCourse.students.length === 0) {
      alert('발송할 학생이 없습니다.');
      return;
    }
    setShowBulkMessageModal(true);
  };

  // 일괄 메시지 실제 발송
  const handleSendBulkMessagesConfirm = async ({ reportTitle, comment }) => {
    const currentCourse = courseData || course;
    setSendingBulk(true);
    try {
      // 모든 학생의 보고서 데이터 가져오기
      const studentReports = await Promise.all(
        currentCourse.students.map(async (student) => {
          try {
            const response = await get(
              `/api/students/${student._id}/study-report?startDate=${startDate}&endDate=${endDate}&courseId=${currentCourse._id}`
            );
            const data = await response.json();

            if (data.success) {
              return {
                studentId: student._id,
                student: student,
                reportData: data.data
              };
            } else {
              return {
                studentId: student._id,
                student: student,
                reportData: null,
                error: data.message
              };
            }
          } catch (error) {
            console.error(`학생 ${student.name} 보고서 조회 오류:`, error);
            return {
              studentId: student._id,
              student: student,
              reportData: null,
              error: '보고서 데이터를 불러올 수 없습니다.'
            };
          }
        })
      );

      // 보고서 데이터가 있는 학생만 필터링
      const validReports = studentReports.filter(sr => sr.reportData !== null);

      if (validReports.length === 0) {
        alert('발송할 보고서 데이터가 없습니다.');
        setSendingBulk(false);
        return;
      }

      // 각 학생의 보고서를 이미지로 변환
      const reportsWithImages = await Promise.all(
        validReports.map(async ({ studentId, student, reportData: rd }) => {
          // 임시로 보고서 미리보기 요소 생성 (실제로는 MessageSendModal의 reportRef를 사용해야 함)
          // 여기서는 서버에서 이미지 생성하도록 하거나, 클라이언트에서 생성 후 전송
          return {
            studentId,
            student,
            reportData: rd,
            parentPhone: student.parentPhone
          };
        })
      );

      const response = await post('/api/messages/send-bulk-reports', {
        courseId: currentCourse._id,
        startDate,
        endDate,
        reportTitle,
        comment,
        studentReports: reportsWithImages
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowBulkMessageModal(false);
      } else {
        alert(data.message || '일괄 메시지 발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('일괄 메시지 발송 오류:', error);
      alert('일괄 메시지 발송 중 오류가 발생했습니다.');
    } finally {
      setSendingBulk(false);
    }
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="course-report-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="course-report-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="course-report-modal-header">
          <h2 className="course-report-modal-title">
            {(courseData || course)?.courseName} - 학습 보고서
          </h2>
          <button className="course-report-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="course-report-controls">
          <div className="report-selectors">
            <div className="selector-group">
              <label>학생 선택</label>
              <select
                value={selectedStudentId || ''}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="report-select"
                disabled={!courseData?.students || courseData.students.length === 0}
              >
                {!courseData?.students || courseData.students.length === 0 ? (
                  <option value="">학생이 없습니다</option>
                ) : (
                  <>
                    <option value="">학생을 선택하세요</option>
                    {courseData.students.map(student => (
                      <option key={student._id} value={student._id}>
                        {student.name} ({student.userId})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div className="selector-group">
              <label>시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="report-select"
                max={endDate}
              />
            </div>
            <div className="selector-group">
              <label>종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="report-select"
                min={startDate}
              />
            </div>
            <button
              className="refresh-btn"
              onClick={fetchReportData}
              disabled={loading || !selectedStudentId}
            >
              {loading ? '로딩 중...' : '새로고침'}
            </button>
            {selectedStudentId && reportData && (
              <button
                className="send-message-btn"
                onClick={handleSendMessage}
                disabled={sendingMessage}
              >
                {sendingMessage ? '발송 중...' : '📧 메시지 발송'}
              </button>
            )}
            {courseData?.students && courseData.students.length > 0 && (
              <button
                className="send-bulk-btn"
                onClick={handleSendBulkMessages}
                disabled={sendingBulk}
              >
                {sendingBulk ? '일괄 발송 중...' : '📨 일괄 발송'}
              </button>
            )}
          </div>
        </div>

        <div className="course-report-body">
          {!selectedStudentId ? (
            <div className="report-empty">
              <p>학생을 선택해주세요.</p>
            </div>
          ) : loading ? (
            <div className="report-loading">
              <p>보고서를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="report-error">
              <p>{error}</p>
            </div>
          ) : reportData ? (
            <div className="study-report-content">
              {/* 전체 요약 */}
              <div className="report-summary-section">
                <h3 className="report-section-title">전체 요약</h3>
                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="summary-card-label">전체 푼 문제 수</div>
                    <div className="summary-card-value">{reportData.totalQuestions || 0}문제</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-label">맞은 문제 수</div>
                    <div className="summary-card-value success">{reportData.totalCorrect || 0}문제</div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-label">정답률</div>
                    <div className="summary-card-value">
                      {reportData.totalQuestions > 0
                        ? ((reportData.totalCorrect / reportData.totalQuestions) * 100).toFixed(1)
                        : '0'}%
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-label">반 내 상위</div>
                    <div className="summary-card-value">
                      {reportData.percentile !== null && reportData.percentile !== undefined
                        ? `상위 ${(100 - reportData.percentile).toFixed(1)}%`
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 소단원별 통계 */}
              {reportData.subUnitStats && reportData.subUnitStats.length > 0 && (
                <div className="report-detail-section">
                  <h3 className="report-section-title">소단원별 학습 현황</h3>
                  <div className="subunit-stats-table">
                    <table>
                      <thead>
                        <tr>
                          <th>과목</th>
                          <th>대단원</th>
                          <th>소단원</th>
                          <th>전체 문항</th>
                          <th>맞은 문항</th>
                          <th>정답률</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.subUnitStats.map((stat, index) => {
                          const accuracy = stat.totalQuestions > 0
                            ? (stat.correctQuestions / stat.totalQuestions) * 100
                            : 0;
                          return (
                            <tr key={index}>
                              <td>{stat.subject || '-'}</td>
                              <td>{stat.mainUnit || '-'}</td>
                              <td>{stat.subUnit || '-'}</td>
                              <td>{stat.totalQuestions || 0}</td>
                              <td>{stat.correctQuestions || 0}</td>
                              <td>
                                <div className="accuracy-cell">
                                  <span className="accuracy-value">{accuracy.toFixed(1)}%</span>
                                  <div className="accuracy-bar">
                                    <div
                                      className="accuracy-bar-fill"
                                      style={{ width: `${accuracy}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 강점 단원 */}
              {reportData.strongUnits && reportData.strongUnits.length > 0 && (
                <div className="report-strong-section">
                  <h3 className="report-section-title">강점 단원</h3>
                  <div className="strong-units-list">
                    {reportData.strongUnits.map((unit, index) => {
                      const accuracy = unit.totalQuestions > 0
                        ? (unit.correctQuestions / unit.totalQuestions) * 100
                        : 0;
                      return (
                        <div key={index} className="strong-unit-item">
                          <div className="strong-unit-header">
                            <span className="strong-unit-name">
                              {unit.subject && unit.mainUnit && unit.subUnit
                                ? `${unit.subject} / ${unit.mainUnit} / ${unit.subUnit}`
                                : unit.subUnit || unit.mainUnit || '-'}
                            </span>
                            <span className="strong-unit-accuracy">{accuracy.toFixed(1)}%</span>
                          </div>
                          <div className="strong-unit-details">
                            <span>맞은 문제: {unit.correctQuestions || 0} / 전체: {unit.totalQuestions || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 취약 단원 */}
              {reportData.weakUnits && reportData.weakUnits.length > 0 && (
                <div className="report-weak-section">
                  <h3 className="report-section-title">취약 단원</h3>
                  <div className="weak-units-list">
                    {reportData.weakUnits.map((unit, index) => {
                      const accuracy = unit.totalQuestions > 0
                        ? (unit.correctQuestions / unit.totalQuestions) * 100
                        : 0;
                      return (
                        <div key={index} className="weak-unit-item">
                          <div className="weak-unit-header">
                            <span className="weak-unit-name">
                              {unit.subject && unit.mainUnit && unit.subUnit
                                ? `${unit.subject} / ${unit.mainUnit} / ${unit.subUnit}`
                                : unit.subUnit || unit.mainUnit || '-'}
                            </span>
                            <span className="weak-unit-accuracy">{accuracy.toFixed(1)}%</span>
                          </div>
                          <div className="weak-unit-details">
                            <span>맞은 문제: {unit.correctQuestions || 0} / 전체: {unit.totalQuestions || 0}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 데이터가 없는 경우 */}
              {(!reportData.subUnitStats || reportData.subUnitStats.length === 0) &&
               (!reportData.weakUnits || reportData.weakUnits.length === 0) &&
               (!reportData.strongUnits || reportData.strongUnits.length === 0) && (
                <div className="study-report-empty">
                  <p>선택한 기간에 제출한 QUIZ가 없습니다.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="report-empty">
              <p>데이터를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>

        <div className="course-report-modal-actions">
          <button className="btn-close" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>

      {/* 개별 메시지 발송 모달 */}
      {showMessageModal && selectedStudentId && reportData && (
        <MessageSendModal
          showModal={showMessageModal}
          onClose={() => setShowMessageModal(false)}
          onSend={handleSendMessageConfirm}
          student={courseData?.students?.find(s => s._id === selectedStudentId)}
          courseName={(courseData || course)?.courseName}
          startDate={startDate}
          endDate={endDate}
          reportData={reportData}
        />
      )}

      {/* 일괄 메시지 발송 모달 */}
      {showBulkMessageModal && (
        <BulkMessageSendModal
          showModal={showBulkMessageModal}
          onClose={() => setShowBulkMessageModal(false)}
          onSend={handleSendBulkMessagesConfirm}
          courseName={(courseData || course)?.courseName}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
}

// 일괄 메시지 발송 모달
function BulkMessageSendModal({ showModal, onClose, onSend, courseName, startDate, endDate }) {
  const [reportTitle, setReportTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!showModal) {
    return null;
  }

  const handleSend = async () => {
    if (!reportTitle.trim()) {
      alert('보고서 제목을 입력해주세요.');
      return;
    }

    setIsSending(true);
    try {
      await onSend({
        reportTitle: reportTitle.trim(),
        comment: comment.trim()
      });
    } catch (error) {
      console.error('메시지 발송 오류:', error);
      alert('메시지 발송 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  return (
    <div className="message-send-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget && !isSending) {
        onClose();
      }
    }}>
      <div className="message-send-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="message-send-modal-header">
          <h2 className="message-send-modal-title">일괄 메시지 발송</h2>
          <button 
            className="message-send-modal-close" 
            onClick={onClose}
            disabled={isSending}
          >
            ×
          </button>
        </div>

        <div className="message-send-modal-body">
          <div className="message-send-info">
            <p><strong>강좌:</strong> {courseName}</p>
            <p><strong>학습 기간:</strong> {formatDate(startDate)} ~ {formatDate(endDate)}</p>
          </div>

          <div className="message-send-form">
            <div className="form-group">
              <label>보고서 제목 *</label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="예: 2024년 1월 학습 보고서"
                className="form-input"
                disabled={isSending}
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>코멘트</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="모든 학생에게 전달할 코멘트를 입력하세요..."
                className="form-textarea"
                disabled={isSending}
                rows={5}
                maxLength={500}
              />
              <div className="char-count">{comment.length}/500</div>
            </div>
          </div>
        </div>

        <div className="message-send-modal-actions">
          <button 
            className="btn-cancel" 
            onClick={onClose}
            disabled={isSending}
          >
            취소
          </button>
          <button 
            className="btn-send" 
            onClick={handleSend}
            disabled={isSending || !reportTitle.trim()}
          >
            {isSending ? '발송 중...' : '일괄 발송'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CourseReportModal;

