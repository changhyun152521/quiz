const express = require('express');
const router = express.Router();
const { sendReportMessage, sendBulkReportMessages } = require('../controllers/messagesController');
const { authenticate } = require('../middleware/auth');

// POST /api/messages/send-report - 개별 학습 보고서 메시지 발송
router.post('/send-report', authenticate, sendReportMessage);

// POST /api/messages/send-bulk-reports - 일괄 학습 보고서 메시지 발송
router.post('/send-bulk-reports', authenticate, sendBulkReportMessages);

module.exports = router;

