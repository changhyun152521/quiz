import { useState, useRef } from 'react';
import './MessageSendModal.css';

function MessageSendModal({ showModal, onClose, onSend, student, courseName, startDate, endDate, reportData }) {
  const [reportTitle, setReportTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isSending, setIsSending] = useState(false);
  const reportRef = useRef(null);

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
        comment: comment.trim(),
        reportRef: reportRef.current
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
          <h2 className="message-send-modal-title">메시지 발송</h2>
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
            <p><strong>학생:</strong> {student?.name} ({student?.userId})</p>
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
                placeholder="학생에게 전달할 코멘트를 입력하세요..."
                className="form-textarea"
                disabled={isSending}
                rows={5}
                maxLength={500}
              />
              <div className="char-count">{comment.length}/500</div>
            </div>
          </div>

          {/* 보고서 미리보기 (이미지 변환용, 숨김) */}
          <div className="report-preview-container" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <div ref={reportRef} className="report-preview-content">
              <div className="report-preview-header">
                <h1 className="report-preview-title">{reportTitle || '학습 보고서'}</h1>
                <div className="report-preview-meta">
                  <p><strong>학생:</strong> {student?.name} ({student?.userId})</p>
                  <p><strong>강좌:</strong> {courseName}</p>
                  <p><strong>학습 기간:</strong> {formatDate(startDate)} ~ {formatDate(endDate)}</p>
                </div>
              </div>

              {comment && (
                <div className="report-preview-comment">
                  <h3>코멘트</h3>
                  <p>{comment}</p>
                </div>
              )}

              {reportData && (
                <div className="report-preview-data">
                  {/* 전체 요약 */}
                  <div className="report-preview-summary">
                    <h3>전체 요약</h3>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <div className="summary-label">전체 푼 문제 수</div>
                        <div className="summary-value">{reportData.totalQuestions || 0}문제</div>
                      </div>
                      <div className="summary-item">
                        <div className="summary-label">맞은 문제 수</div>
                        <div className="summary-value">{reportData.totalCorrect || 0}문제</div>
                      </div>
                      <div className="summary-item">
                        <div className="summary-label">정답률</div>
                        <div className="summary-value">
                          {reportData.totalQuestions > 0
                            ? ((reportData.totalCorrect / reportData.totalQuestions) * 100).toFixed(1)
                            : 0}%
                        </div>
                      </div>
                      <div className="summary-item">
                        <div className="summary-label">반 내 상위</div>
                        <div className="summary-value">
                          {reportData.percentile !== null && reportData.percentile !== undefined
                            ? `상위 ${(100 - reportData.percentile).toFixed(1)}%`
                            : '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 소단원별 통계 */}
                  {reportData.subUnitStats && reportData.subUnitStats.length > 0 && (
                    <div className="report-preview-subunit">
                      <h3>소단원별 학습 현황</h3>
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>과목</th>
                            <th>대단원</th>
                            <th>소단원</th>
                            <th>전체</th>
                            <th>맞은</th>
                            <th>정답률</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.subUnitStats.slice(0, 10).map((stat, index) => {
                            const accuracy = stat.totalQuestions > 0
                              ? ((stat.correctQuestions / stat.totalQuestions) * 100).toFixed(1)
                              : 0;
                            return (
                              <tr key={index}>
                                <td>{stat.subject || '-'}</td>
                                <td>{stat.mainUnit || '-'}</td>
                                <td>{stat.subUnit || '-'}</td>
                                <td>{stat.totalQuestions || 0}</td>
                                <td>{stat.correctQuestions || 0}</td>
                                <td>{accuracy}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* 잘한 단원 */}
                  {reportData.strongUnits && reportData.strongUnits.length > 0 && (
                    <div className="report-preview-strong">
                      <h3>잘한 단원</h3>
                      <div className="units-list">
                        {reportData.strongUnits.slice(0, 5).map((unit, index) => {
                          const accuracy = unit.totalQuestions > 0
                            ? ((unit.correctQuestions / unit.totalQuestions) * 100).toFixed(1)
                            : 0;
                          const unitName = unit.subject && unit.mainUnit && unit.subUnit
                            ? `${unit.subject} / ${unit.mainUnit} / ${unit.subUnit}`
                            : unit.subUnit || unit.mainUnit || '-';
                          return (
                            <div key={index} className="unit-item">
                              <span className="unit-name">{unitName}</span>
                              <span className="unit-accuracy">{accuracy}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 취약 단원 */}
                  {reportData.weakUnits && reportData.weakUnits.length > 0 && (
                    <div className="report-preview-weak">
                      <h3>취약 단원</h3>
                      <div className="units-list">
                        {reportData.weakUnits.slice(0, 5).map((unit, index) => {
                          const accuracy = unit.totalQuestions > 0
                            ? ((unit.correctQuestions / unit.totalQuestions) * 100).toFixed(1)
                            : 0;
                          const unitName = unit.subject && unit.mainUnit && unit.subUnit
                            ? `${unit.subject} / ${unit.mainUnit} / ${unit.subUnit}`
                            : unit.subUnit || unit.mainUnit || '-';
                          return (
                            <div key={index} className="unit-item">
                              <span className="unit-name">{unitName}</span>
                              <span className="unit-accuracy">{accuracy}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
            {isSending ? '발송 중...' : '발송'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MessageSendModal;

