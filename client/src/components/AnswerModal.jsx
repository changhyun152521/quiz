import { useState, useEffect } from 'react';
import './AnswerModal.css';

function AnswerModal({ showModal, onClose, assignment, onSave, mode }) {
  const [answers, setAnswers] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (showModal && assignment) {
      // 문항수에 맞게 정답 배열 초기화
      const questionCount = assignment.questionCount || 0;
      const initialAnswers = [];

      // 과제에 저장된 정답이 있으면 사용, 없으면 빈 값으로 초기화
      const existingAnswers = assignment.answers || [];

      for (let i = 1; i <= questionCount; i++) {
        const existing = existingAnswers.find(ans => ans.questionNumber === i);
        initialAnswers.push({
          questionNumber: i,
          answer: existing?.answer || '',
          score: existing?.score || 1 // score로 통일
        });
      }

      setAnswers(initialAnswers);
      setErrors({});
    }
  }, [showModal, assignment]);

  const handleAnswerChange = (index, field, value) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = {
        ...newAnswers[index],
        [field]: value
      };
      return newAnswers;
    });

    // 에러 제거
    if (errors[`question_${index + 1}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`question_${index + 1}`];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    answers.forEach((ans, index) => {
      if (!ans.answer || ans.answer.trim() === '') {
        newErrors[`question_${index + 1}`] = `${index + 1}번 문항의 정답을 입력해주세요`;
      } else if (ans.answer.length > 50) {
        newErrors[`question_${index + 1}`] = '정답은 최대 50자까지 가능합니다';
      }

      if (ans.score < 0) {
        newErrors[`score_${index + 1}`] = '배점은 0 이상이어야 합니다';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(answers, assignment._id);
      // 성공적으로 완료된 경우에만 모달 닫기
      setIsSubmitting(false);
      onClose();
    } catch (error) {
      console.error('저장 오류:', error);
      setIsSubmitting(false);
      // 에러 발생 시 모달은 열어둠
    }
  };

  if (!showModal || !assignment) {
    return null;
  }

  return (
    <div className="answer-modal-overlay" onClick={(e) => {
      // 작업 중이 아닐 때만 overlay 클릭으로 닫기
      if (!isSubmitting && e.target === e.currentTarget) {
        onClose();
      }
    }}>
      <div className="answer-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="answer-modal-header">
          <h2 className="answer-modal-title">
            정답 입력 - {assignment.assignmentName}
          </h2>
          <button className="answer-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="answer-modal-body">
          <div className="answer-info">
            <p><strong>과제명:</strong> {assignment.assignmentName}</p>
            <p><strong>문항 수:</strong> {assignment.questionCount}개</p>
          </div>

          <form onSubmit={handleSubmit} className="answer-modal-form">
            <div className="answers-list">
              {answers.map((ans, index) => (
                <div key={index} className="answer-item">
                  <div className="question-header">
                    <span className="question-number">{index + 1}번</span>
                    {errors[`question_${index + 1}`] && (
                      <span className="error-message">{errors[`question_${index + 1}`]}</span>
                    )}
                  </div>
                  <div className="answer-inputs">
                    <div className="answer-input-group">
                      <label>정답 *</label>
                      <input
                        type="text"
                        value={ans.answer}
                        onChange={(e) => handleAnswerChange(index, 'answer', e.target.value)}
                        placeholder={`${index + 1}번 문항 정답`}
                        className={errors[`question_${index + 1}`] ? 'error' : ''}
                        maxLength={50}
                      />
                    </div>
                    <div className="points-input-group">
                      <label>배점</label>
                      <input
                        type="number"
                        value={ans.score}
                        onChange={(e) => handleAnswerChange(index, 'score', parseFloat(e.target.value) || 0)}
                        placeholder="배점"
                        min="0"
                        step="0.5"
                        className={errors[`score_${index + 1}`] ? 'error' : ''}
                      />
                    </div>
                  </div>
                  {errors[`score_${index + 1}`] && (
                    <span className="error-message">{errors[`score_${index + 1}`]}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="answer-modal-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                취소
              </button>
              <button type="submit" className="btn-submit" disabled={isSubmitting}>
                {isSubmitting ? '처리 중...' : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AnswerModal;
