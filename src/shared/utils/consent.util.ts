import { inArray, desc } from 'drizzle-orm';
import type { DrizzleDB } from '../database/drizzle.provider';
import { consentHistories } from '../database/schema';

/**
 * 동의 상태 정보
 */
export interface ConsentInfo {
  customerId: string;
  marketing: boolean;
  privacy: boolean;
}

/**
 * 고객 ID 목록에 대한 최신 동의 상태를 배치로 조회 (N+1 해결)
 *
 * @param db - Drizzle DB 인스턴스
 * @param customerIds - 고객 ID 배열
 * @returns 고객 ID를 키로 하는 동의 정보 Map
 */
export async function getConsentsByCustomerIds(
  db: DrizzleDB,
  customerIds: string[],
): Promise<Map<string, ConsentInfo>> {
  const result = new Map<string, ConsentInfo>();

  if (customerIds.length === 0) {
    return result;
  }

  // 중복 제거
  const uniqueCustomerIds = [...new Set(customerIds)];

  // 모든 동의 내역을 한 번에 조회
  const allConsents = await db
    .select()
    .from(consentHistories)
    .where(inArray(consentHistories.customerId, uniqueCustomerIds))
    .orderBy(desc(consentHistories.createdAt));

  // 고객별, 동의 유형별 최신 상태 매핑
  const consentMap = new Map<
    string,
    { marketing?: boolean; privacy?: boolean }
  >();

  for (const consent of allConsents) {
    const existing = consentMap.get(consent.customerId) ?? {};

    // 이미 해당 유형의 동의가 있으면 (최신 것이므로) 스킵
    if (
      consent.consentType === 'MARKETING' &&
      existing.marketing === undefined
    ) {
      existing.marketing = consent.consented;
    }
    if (consent.consentType === 'PRIVACY' && existing.privacy === undefined) {
      existing.privacy = consent.consented;
    }

    consentMap.set(consent.customerId, existing);
  }

  // 결과 Map 생성
  for (const customerId of uniqueCustomerIds) {
    const consent = consentMap.get(customerId);
    result.set(customerId, {
      customerId,
      marketing: consent?.marketing ?? false,
      privacy: consent?.privacy ?? false,
    });
  }

  return result;
}

/**
 * 단일 고객의 최신 동의 상태 조회
 */
export async function getConsentByCustomerId(
  db: DrizzleDB,
  customerId: string,
): Promise<ConsentInfo> {
  const consents = await getConsentsByCustomerIds(db, [customerId]);
  return (
    consents.get(customerId) ?? {
      customerId,
      marketing: false,
      privacy: false,
    }
  );
}
