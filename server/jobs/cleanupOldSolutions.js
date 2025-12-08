const cron = require('node-cron');
const Assignment = require('../models/Assignment');
const { deleteFile } = require('../utils/cloudinary');

// Cloudinary URL에서 public_id와 resource_type 추출 함수
const extractPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Cloudinary URL 형식: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{version}/{public_id}.{format}
    const cloudinaryPattern = /\/res\.cloudinary\.com\/[^\/]+\/([^\/]+)\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?(?:\?.*)?$/;
    const match = url.match(cloudinaryPattern);
    
    if (match && match[1] && match[2]) {
      const resourceType = match[1]; // 'image', 'raw', 'video' 등
      let publicId = match[2];
      
      // URL 디코딩
      publicId = decodeURIComponent(publicId);
      // 쿼리 파라미터 제거
      publicId = publicId.split('?')[0];
      
      return {
        publicId,
        resourceType: resourceType === 'raw' ? 'raw' : 'image'
      };
    }
    
    return null;
  } catch (error) {
    console.error('public_id 추출 오류:', error);
    return null;
  }
};

// 한 달 이상 된 풀이 이미지 삭제 작업
const cleanupOldSolutions = async () => {
  try {
    console.log('[스케줄러] 오래된 풀이 이미지 삭제 작업 시작...');
    
    // 한 달 전 날짜 계산
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // 한 달 이상 된 제출을 가진 모든 과제 조회
    const assignments = await Assignment.find({
      'submissions.submittedAt': { $lt: oneMonthAgo }
    });
    
    let totalDeleted = 0;
    let totalErrors = 0;
    
    for (const assignment of assignments) {
      for (const submission of assignment.submissions) {
        // 한 달 이상 된 제출인지 확인
        if (submission.submittedAt && new Date(submission.submittedAt) < oneMonthAgo) {
          // solutionImages가 있으면 삭제
          if (submission.solutionImages && Array.isArray(submission.solutionImages) && submission.solutionImages.length > 0) {
            console.log(`[스케줄러] 과제 ${assignment._id}, 학생 ${submission.studentId}의 풀이 이미지 ${submission.solutionImages.length}개 삭제 시작...`);
            
            // Cloudinary에서 이미지 삭제
            for (const imageUrl of submission.solutionImages) {
              try {
                const publicIdInfo = extractPublicIdFromUrl(imageUrl);
                if (publicIdInfo && publicIdInfo.publicId) {
                  await deleteFile(publicIdInfo.publicId, publicIdInfo.resourceType);
                  totalDeleted++;
                  console.log(`[스케줄러] 이미지 삭제 완료: ${publicIdInfo.publicId}`);
                } else {
                  console.warn(`[스케줄러] public_id 추출 실패: ${imageUrl}`);
                }
              } catch (deleteError) {
                console.error(`[스케줄러] 이미지 삭제 실패: ${imageUrl}`, deleteError.message);
                totalErrors++;
              }
            }
            
            // 데이터베이스에서 solutionImages 필드 제거
            try {
              // Mongoose의 $pull과 $set을 사용하여 배열 내부 필드 업데이트
              // 먼저 assignment를 다시 조회하여 최신 데이터 가져오기
              const updatedAssignment = await Assignment.findById(assignment._id);
              if (updatedAssignment) {
                const submissionIndex = updatedAssignment.submissions.findIndex(
                  sub => sub._id && sub._id.toString() === submission._id.toString()
                );
                
                if (submissionIndex >= 0) {
                  // solutionImages를 빈 배열로 설정
                  updatedAssignment.submissions[submissionIndex].solutionImages = [];
                  await updatedAssignment.save();
                  console.log(`[스케줄러] 데이터베이스에서 solutionImages 필드 제거 완료`);
                }
              }
            } catch (dbError) {
              console.error(`[스케줄러] 데이터베이스 업데이트 실패:`, dbError.message);
              totalErrors++;
            }
          }
        }
      }
    }
    
    console.log(`[스케줄러] 작업 완료: ${totalDeleted}개 이미지 삭제, ${totalErrors}개 오류`);
  } catch (error) {
    console.error('[스케줄러] 오래된 풀이 이미지 삭제 작업 중 오류:', error);
  }
};

// 매일 새벽 2시에 실행 (0 2 * * *)
// 또는 테스트를 위해 매 시간마다 실행하려면: '0 * * * *'
const scheduleCleanup = () => {
  // 매일 새벽 2시에 실행
  cron.schedule('0 2 * * *', async () => {
    console.log(`[스케줄러] ${new Date().toISOString()} - 오래된 풀이 이미지 삭제 작업 시작`);
    await cleanupOldSolutions();
  }, {
    scheduled: true,
    timezone: 'Asia/Seoul'
  });
  
  console.log('✓ 스케줄러 등록 완료: 매일 새벽 2시에 오래된 풀이 이미지 삭제 작업 실행');
};

module.exports = {
  cleanupOldSolutions,
  scheduleCleanup
};

