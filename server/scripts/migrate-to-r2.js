/**
 * Cloudinary -> R2 마이그레이션 스크립트
 *
 * 이 스크립트는 기존 Cloudinary에 저장된 파일들을 Cloudflare R2로 마이그레이션합니다.
 *
 * 실행 방법:
 * 1. 환경변수 설정 (.env 파일에 R2 설정 추가)
 * 2. node scripts/migrate-to-r2.js
 *
 * 마이그레이션 대상:
 * - 문제지 파일 (questionFileUrl)
 * - 해설지 파일 (solutionFileUrl)
 * - 학생 풀이 이미지 (submissions.solutionImages)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const { uploadFile } = require('../utils/r2');
const { isCloudinaryUrl } = require('../utils/fileService');

// 연결 설정
const MONGODB_URI = process.env.MONGODB_ATLAS_URL || process.env.MONGODB_URI;

// 마이그레이션 통계
const stats = {
  totalAssignments: 0,
  questionFiles: { total: 0, migrated: 0, failed: 0 },
  solutionFiles: { total: 0, migrated: 0, failed: 0 },
  studentSolutionImages: { total: 0, migrated: 0, failed: 0 }
};

/**
 * URL에서 파일 다운로드
 */
async function downloadFile(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`파일 다운로드 실패: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Content-Type 추정
 */
function getContentType(url, fileType) {
  if (fileType === 'pdf') return 'application/pdf';
  if (fileType === 'image') {
    if (url.includes('.png')) return 'image/png';
    if (url.includes('.jpg') || url.includes('.jpeg')) return 'image/jpeg';
    if (url.includes('.webp')) return 'image/webp';
    return 'image/png'; // 기본값
  }
  return 'application/octet-stream';
}

/**
 * 파일 확장자 추출
 */
function getExtension(url, contentType) {
  // URL에서 확장자 추출 시도
  const urlMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (urlMatch) return urlMatch[1];

  // Content-Type에서 추출
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('pdf')) return 'pdf';
  return 'bin';
}

/**
 * 단일 파일 마이그레이션
 */
async function migrateFile(cloudinaryUrl, r2Key, contentType) {
  if (!isCloudinaryUrl(cloudinaryUrl)) {
    console.log(`  [스킵] Cloudinary URL이 아님: ${cloudinaryUrl.substring(0, 50)}...`);
    return cloudinaryUrl; // 이미 R2 URL이거나 다른 URL
  }

  try {
    console.log(`  [다운로드] ${cloudinaryUrl.substring(0, 60)}...`);
    const buffer = await downloadFile(cloudinaryUrl);
    console.log(`  [업로드] ${r2Key} (${Math.round(buffer.length / 1024)}KB)`);
    const r2Url = await uploadFile(r2Key, buffer, contentType);
    console.log(`  [완료] ${r2Url.substring(0, 60)}...`);
    return r2Url;
  } catch (error) {
    console.error(`  [실패] ${error.message}`);
    throw error;
  }
}

/**
 * 문제지/해설지 파일 마이그레이션
 */
async function migrateAssignmentFiles(assignment) {
  let updated = false;

  // 문제지 마이그레이션
  if (assignment.questionFileUrl && assignment.questionFileUrl.length > 0) {
    for (let i = 0; i < assignment.questionFileUrl.length; i++) {
      const url = assignment.questionFileUrl[i];
      const fileType = assignment.questionFileType?.[i] || 'image';
      stats.questionFiles.total++;

      if (isCloudinaryUrl(url)) {
        try {
          const contentType = getContentType(url, fileType);
          const ext = getExtension(url, contentType);
          const r2Key = `questions/${assignment._id}/file_${i}.${ext}`;
          const newUrl = await migrateFile(url, r2Key, contentType);
          assignment.questionFileUrl[i] = newUrl;
          stats.questionFiles.migrated++;
          updated = true;
        } catch (error) {
          stats.questionFiles.failed++;
          console.error(`  문제지 ${i} 마이그레이션 실패:`, error.message);
        }
      }
    }
  }

  // 해설지 마이그레이션
  if (assignment.solutionFileUrl && assignment.solutionFileUrl.length > 0) {
    for (let i = 0; i < assignment.solutionFileUrl.length; i++) {
      const url = assignment.solutionFileUrl[i];
      const fileType = assignment.solutionFileType?.[i] || 'image';
      stats.solutionFiles.total++;

      if (isCloudinaryUrl(url)) {
        try {
          const contentType = getContentType(url, fileType);
          const ext = getExtension(url, contentType);
          const r2Key = `solutions/${assignment._id}/file_${i}.${ext}`;
          const newUrl = await migrateFile(url, r2Key, contentType);
          assignment.solutionFileUrl[i] = newUrl;
          stats.solutionFiles.migrated++;
          updated = true;
        } catch (error) {
          stats.solutionFiles.failed++;
          console.error(`  해설지 ${i} 마이그레이션 실패:`, error.message);
        }
      }
    }
  }

  return updated;
}

/**
 * 학생 풀이 이미지 마이그레이션
 */
async function migrateSubmissionImages(assignment) {
  let updated = false;

  if (!assignment.submissions || assignment.submissions.length === 0) {
    return false;
  }

  for (const submission of assignment.submissions) {
    if (!submission.solutionImages || submission.solutionImages.length === 0) {
      continue;
    }

    for (let i = 0; i < submission.solutionImages.length; i++) {
      const url = submission.solutionImages[i];
      stats.studentSolutionImages.total++;

      if (isCloudinaryUrl(url)) {
        try {
          const contentType = 'image/png';
          const r2Key = `submissions/${assignment._id}/${submission.studentId}/image_${i}.png`;
          const newUrl = await migrateFile(url, r2Key, contentType);
          submission.solutionImages[i] = newUrl;
          stats.studentSolutionImages.migrated++;
          updated = true;
        } catch (error) {
          stats.studentSolutionImages.failed++;
          console.error(`  풀이 이미지 ${i} 마이그레이션 실패:`, error.message);
        }
      }
    }
  }

  return updated;
}

/**
 * 메인 마이그레이션 함수
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log('Cloudinary -> R2 마이그레이션 시작');
  console.log('='.repeat(60));
  console.log();

  // MongoDB 연결
  console.log('MongoDB 연결 중...');
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB 연결 완료');
  console.log();

  // 모든 과제 조회
  const assignments = await Assignment.find({});
  stats.totalAssignments = assignments.length;
  console.log(`총 ${assignments.length}개 과제 발견`);
  console.log();

  // 각 과제 마이그레이션
  for (let idx = 0; idx < assignments.length; idx++) {
    const assignment = assignments[idx];
    console.log(`[${idx + 1}/${assignments.length}] ${assignment.assignmentName || assignment._id}`);

    let updated = false;

    // 문제지/해설지 마이그레이션
    const filesUpdated = await migrateAssignmentFiles(assignment);
    updated = updated || filesUpdated;

    // 학생 풀이 이미지 마이그레이션
    const submissionsUpdated = await migrateSubmissionImages(assignment);
    updated = updated || submissionsUpdated;

    // 변경사항 저장
    if (updated) {
      await assignment.save();
      console.log('  [저장 완료]');
    } else {
      console.log('  [변경 없음]');
    }
    console.log();
  }

  // 결과 출력
  console.log('='.repeat(60));
  console.log('마이그레이션 완료');
  console.log('='.repeat(60));
  console.log();
  console.log('통계:');
  console.log(`  총 과제: ${stats.totalAssignments}`);
  console.log();
  console.log('  문제지:');
  console.log(`    - 총: ${stats.questionFiles.total}`);
  console.log(`    - 마이그레이션: ${stats.questionFiles.migrated}`);
  console.log(`    - 실패: ${stats.questionFiles.failed}`);
  console.log();
  console.log('  해설지:');
  console.log(`    - 총: ${stats.solutionFiles.total}`);
  console.log(`    - 마이그레이션: ${stats.solutionFiles.migrated}`);
  console.log(`    - 실패: ${stats.solutionFiles.failed}`);
  console.log();
  console.log('  학생 풀이 이미지:');
  console.log(`    - 총: ${stats.studentSolutionImages.total}`);
  console.log(`    - 마이그레이션: ${stats.studentSolutionImages.migrated}`);
  console.log(`    - 실패: ${stats.studentSolutionImages.failed}`);
  console.log();

  // 연결 종료
  await mongoose.disconnect();
  console.log('MongoDB 연결 종료');
}

// 실행
migrate()
  .then(() => {
    console.log('마이그레이션 스크립트 종료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('마이그레이션 오류:', error);
    process.exit(1);
  });
