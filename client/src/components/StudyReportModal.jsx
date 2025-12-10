import { useState, useEffect, useRef } from 'react';
import { get } from '../utils/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './StudyReportModal.css';

function StudyReportModal({ showModal, onClose, user, selectedCourseId }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportContentRef = useRef(null);

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

  // PDF 생성 함수
  const handleGeneratePDF = async () => {
    if (!reportContentRef.current || !reportData) {
      alert('보고서 데이터가 없습니다.');
      return;
    }

    setIsGeneratingPDF(true);

    try {
      // 원본 스타일 및 상태 저장
      const element = reportContentRef.current;
      const modalBody = element.querySelector('.study-report-modal-body');
      const originalBodyScrollTop = modalBody ? modalBody.scrollTop : 0;
      
      // 인라인 스타일이 있는지 확인하고 저장
      const originalStyles = {
        display: element.style.display,
        flexDirection: element.style.flexDirection,
        flex: element.style.flex,
        minHeight: element.style.minHeight,
        overflow: element.style.overflow,
        width: element.style.width,
        maxWidth: element.style.maxWidth,
        position: element.style.position,
        left: element.style.left,
        height: element.style.height,
        maxHeight: element.style.maxHeight,
      };
      
      const originalBodyStyles = modalBody ? {
        overflow: modalBody.style.overflow,
        height: modalBody.style.height,
        maxHeight: modalBody.style.maxHeight,
      } : {};
      
      // PDF 생성 시에만 전체 내용이 보이도록 임시 스타일 적용
      const pcWidth = 900; // PC 버전 max-width
      element.style.setProperty('display', 'block', 'important');
      element.style.setProperty('width', `${pcWidth}px`, 'important');
      element.style.setProperty('max-width', `${pcWidth}px`, 'important');
      element.style.setProperty('overflow', 'visible', 'important');
      element.style.setProperty('position', 'relative', 'important');
      element.style.setProperty('left', '0', 'important');
      element.style.setProperty('height', 'auto', 'important');
      element.style.setProperty('max-height', 'none', 'important');
      element.style.setProperty('min-height', 'auto', 'important');
      
      if (modalBody) {
        modalBody.style.setProperty('overflow', 'visible', 'important');
        modalBody.style.setProperty('height', 'auto', 'important');
        modalBody.style.setProperty('max-height', 'none', 'important');
        modalBody.scrollTop = 0;
      }
      
      // 약간의 지연을 주어 스타일 변경이 적용되도록 함
      await new Promise(resolve => setTimeout(resolve, 200));

      // PDF에 포함할 컨텐츠 영역 캡처 (PC 버전 기준, 스크롤 없이 전체 내용)
      // x 버튼은 data-html2canvas-ignore 속성으로 자동 제외됨
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: pcWidth,
        windowHeight: element.scrollHeight,
        allowTaint: false,
        ignoreElements: (el) => {
          // x 버튼과 새로고침 버튼 제외
          return el.classList && (
            el.classList.contains('study-report-modal-close') ||
            el.classList.contains('refresh-btn')
          );
        },
      });

      // 원본 스타일 복원 (인라인 스타일 제거하여 CSS가 적용되도록)
      // removeProperty를 사용하여 important 스타일도 제거
      element.style.removeProperty('display');
      element.style.removeProperty('flex-direction');
      element.style.removeProperty('flex');
      element.style.removeProperty('min-height');
      element.style.removeProperty('overflow');
      element.style.removeProperty('width');
      element.style.removeProperty('max-width');
      element.style.removeProperty('position');
      element.style.removeProperty('left');
      element.style.removeProperty('height');
      element.style.removeProperty('max-height');
      
      // 원래 인라인 스타일이 있었던 경우에만 복원
      if (originalStyles.display) element.style.display = originalStyles.display;
      if (originalStyles.flexDirection) element.style.flexDirection = originalStyles.flexDirection;
      if (originalStyles.flex) element.style.flex = originalStyles.flex;
      if (originalStyles.minHeight) element.style.minHeight = originalStyles.minHeight;
      if (originalStyles.overflow) element.style.overflow = originalStyles.overflow;
      if (originalStyles.width) element.style.width = originalStyles.width;
      if (originalStyles.maxWidth) element.style.maxWidth = originalStyles.maxWidth;
      if (originalStyles.position) element.style.position = originalStyles.position;
      if (originalStyles.left) element.style.left = originalStyles.left;
      if (originalStyles.height) element.style.height = originalStyles.height;
      if (originalStyles.maxHeight) element.style.maxHeight = originalStyles.maxHeight;
      
      if (modalBody) {
        modalBody.style.removeProperty('overflow');
        modalBody.style.removeProperty('height');
        modalBody.style.removeProperty('max-height');
        
        // 원래 인라인 스타일이 있었던 경우에만 복원
        if (originalBodyStyles.overflow) modalBody.style.overflow = originalBodyStyles.overflow;
        if (originalBodyStyles.height) modalBody.style.height = originalBodyStyles.height;
        if (originalBodyStyles.maxHeight) modalBody.style.maxHeight = originalBodyStyles.maxHeight;
        
        modalBody.scrollTop = originalBodyScrollTop;
      }

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 너비 (mm)
      const pageHeight = 297; // A4 높이 (mm)
      const margin = 15; // 여백 (mm)
      const contentWidth = imgWidth - (margin * 2); // 여백 제외한 컨텐츠 너비
      const contentHeight = pageHeight - (margin * 2); // 여백 제외한 컨텐츠 높이
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let yPosition = margin; // 상단 여백

      // 첫 페이지 추가 (여백 적용)
      pdf.addImage(imgData, 'PNG', margin, yPosition, contentWidth, imgHeight);
      heightLeft -= contentHeight;

      // 여러 페이지가 필요한 경우
      while (heightLeft > 0) {
        yPosition = margin - (imgHeight - heightLeft); // 다음 페이지에서 보여줄 y 위치 계산
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, yPosition, contentWidth, imgHeight);
        heightLeft -= contentHeight;
      }

      // 파일명 생성 (학생명_년월_학습현황보고서.pdf)
      const fileName = `${user?.name || '학생'}_${selectedYear}년${selectedMonth}월_학습현황보고서.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="study-report-modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="study-report-modal-content" onClick={(e) => e.stopPropagation()}>
        <div ref={reportContentRef} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="study-report-modal-header">
            <h2 className="study-report-modal-title">{user?.name || '학생'}학생 학습현황</h2>
            <button 
              className="study-report-modal-close" 
              onClick={onClose}
              data-html2canvas-ignore="true"
            >
              ×
            </button>
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
              data-html2canvas-ignore="true"
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
        </div>

        <div className="study-report-modal-footer">
          <button 
            className="study-report-pdf-btn" 
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF || !reportData}
          >
            {isGeneratingPDF ? 'PDF 생성 중...' : 'PDF'}
          </button>
          <button className="study-report-close-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudyReportModal;

