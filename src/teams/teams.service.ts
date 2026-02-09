import { Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '../shared/constants/error-codes';

interface InquiryData {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  inquiryType: string;
  message: string;
  createdAt: Date;
}

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);
  private readonly webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  private readonly timeout = 15000; // 15초 타임아웃

  async sendInquiryNotification(inquiry: InquiryData): Promise<void> {
    if (!this.webhookUrl) {
      this.logger.warn(
        'TEAMS_WEBHOOK_URL is not configured. Skipping Teams notification.',
      );
      return;
    }

    const payload = this.buildAdaptiveCard(inquiry);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.logger.error(
          `Teams API Error: ${response.status} ${response.statusText}`,
          ErrorCode.TEAMS_API_ERROR,
        );
      } else {
        this.logger.log('Teams notification sent successfully');
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          this.logger.error(
            'Teams API Timeout: Request exceeded 15 seconds',
            ErrorCode.TEAMS_API_TIMEOUT,
          );
        } else {
          this.logger.error(
            `Teams API Error: ${error.message}`,
            ErrorCode.TEAMS_API_ERROR,
          );
        }
      }
    }
  }

  private buildAdaptiveCard(inquiry: InquiryData) {
    const inquiryTypeMap: Record<string, string> = {
      kiwi: 'Kiwi 문의',
      kiwiFeature: 'Kiwi 기능 문의',
      kiwiPartnership: 'Kiwi 파트너십 문의',
    };

    return {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
              {
                type: 'TextBlock',
                text: '새 문의가 도착했습니다',
                weight: 'bolder',
                size: 'large',
              },
              {
                type: 'FactSet',
                facts: [
                  { title: '이름', value: inquiry.name },
                  { title: '기업/기관명', value: inquiry.companyName },
                  { title: '이메일', value: inquiry.email },
                  { title: '휴대폰', value: inquiry.phone },
                  {
                    title: '문의 구분',
                    value:
                      inquiryTypeMap[inquiry.inquiryType] ||
                      inquiry.inquiryType,
                  },
                  {
                    title: '문의일시',
                    value: inquiry.createdAt.toISOString(),
                  },
                ],
              },
              {
                type: 'TextBlock',
                text: '문의 내용',
                weight: 'bolder',
                spacing: 'medium',
              },
              {
                type: 'TextBlock',
                text: inquiry.message,
                wrap: true,
              },
            ],
          },
        },
      ],
    };
  }
}
