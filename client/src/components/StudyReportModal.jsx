import { useState, useEffect } from 'react';
import { get } from '../utils/api';
import './StudyReportModal.css';

function StudyReportModal({ showModal, onClose, user, selectedCourseId }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  // 년도 목록 생성 (현재 년도부터 2년 전까지)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // 월 목록
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // 보고서 데이터 가져오기
  const fetchReportData = async () => {
    if (!user?._id || !selectedCourseId) {
      setError('사용자 정보 또는 강좌 정보가 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await get(
        `/api/students/${user._id}/study-report?year=${selectedYear}&month=${selectedMonth}&courseId=${selectedCourseId}`
      );
      const data = await response.json();

      if (data.success) {
        setReportData(data.data);
      } else {
        setError(data.message || '보고서 데이터를 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('보고서 데이터 조회 오류:', error);
      setError('보고서 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 모달이 열릴 때마다 데이터 가져오기
  useEffect(() => {
    if (showModal && user?._id && selectedCourseId) {
      fetchReportData();
    }
  }, [showModal, selectedYear, selectedMonth, user?._id, selectedCourseId]);

  if (!showModal) {
    return null;
  }

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '-';
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="study-report-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="study-report-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="study-report-modal-header">
          <h2 className="study-report-modal-title">학습현황 보고서</h2>
          <button className="study-report-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="study-report-modal-body">
          {/* 년/월 선택 */}
          <div className="study-report-filters">
            <div className="filter-group">
              <label>년도</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="filter-select"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>월</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="filter-select"
              >
                {months.map(month => (
                  <option key={month} value={month}>{month}월</option>
                ))}
              </select>
            </div>
            <button
              className="refresh-btn"
              onClick={fetchReportData}
              disabled={loading}
            >
              {loading ? '로딩 중...' : '새로고침'}
            </button>
          </div>

          {loading ? (
            <div className="study-report-loading">
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="study-report-error">
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
                        ? formatPercent((reportData.totalCorrect / reportData.totalQuestions) * 100)
                        : '0%'}
                    </div>
                  </div>
                  <div className="summary-card">
                    <div className="summary-card-label">반 내 상위</div>
                    <div className="summary-card-value">
                      {reportData.percentile !== null && reportData.percentile !== undefined
                        ? `상위 ${formatPercent(100 - reportData.percentile)}`
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
                                  <span className="accuracy-value">{formatPercent(accuracy)}</span>
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

              {/* 잘한 단원 */}
              {reportData.strongUnits && reportData.strongUnits.length > 0 && (
                <div className="report-strong-section">
                  <h3 className="report-section-title">잘한 단원</h3>
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
                            <span className="strong-unit-accuracy">{formatPercent(accuracy)}</span>
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
                            <span className="weak-unit-accuracy">{formatPercent(accuracy)}</span>
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
            <div className="study-report-empty">
              <p>데이터를 불러올 수 없습니다.</p>
            </div>
          )}
        </div>

        <div className="study-report-modal-footer">
          <button className="study-report-close-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudyReportModal;

