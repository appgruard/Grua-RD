export interface SMSService {
  sendSMS(phone: string, message: string): Promise<boolean>;
}

class MockSMSService implements SMSService {
  async sendSMS(phone: string, message: string): Promise<boolean> {
    console.log(`📱 [MOCK SMS] Enviando a ${phone}: ${message}`);
    return true;
  }
}

export const smsService: SMSService = new MockSMSService();

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
