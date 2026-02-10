import type * as ExcelJS from 'exceljs';

/**
 * 문의 내역 Excel 컬럼 정의
 */
export interface InquiryExcelRow {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  inquiryType: string;
  message: string;
  status: string;
  marketingConsent: string;
  privacyConsent: string;
  createdAt: string;
}

/**
 * 문의 내역 Excel 워크시트 설정
 */
export function setupInquiryWorksheet(worksheet: ExcelJS.Worksheet): void {
  worksheet.columns = [
    { header: '문의자명', key: 'name', width: 15 },
    { header: '기업/기관명', key: 'companyName', width: 20 },
    { header: '이메일', key: 'email', width: 25 },
    { header: '휴대폰 번호', key: 'phone', width: 15 },
    { header: '문의 구분', key: 'inquiryType', width: 15 },
    { header: '문의 내용', key: 'message', width: 50 },
    { header: '상태', key: 'status', width: 10 },
    { header: '광고성 정보 수신', key: 'marketingConsent', width: 15 },
    { header: '개인정보 수집 동의', key: 'privacyConsent', width: 15 },
    { header: '생성일', key: 'createdAt', width: 20 },
  ];
}

/**
 * 문의 데이터를 Excel 행 형식으로 변환
 */
export function toInquiryExcelRow(
  inquiry: {
    name: string;
    companyName: string;
    email: string;
    phone: string;
    inquiryType: string;
    message: string;
    status: string;
    createdAt: Date;
  },
  marketingConsent: boolean,
  privacyConsent: boolean,
): InquiryExcelRow {
  return {
    name: inquiry.name,
    companyName: inquiry.companyName,
    email: inquiry.email,
    phone: inquiry.phone,
    inquiryType: inquiry.inquiryType,
    message: inquiry.message,
    status: inquiry.status,
    marketingConsent: marketingConsent ? 'O' : 'X',
    privacyConsent: privacyConsent ? 'O' : 'X',
    createdAt: inquiry.createdAt.toISOString(),
  };
}
