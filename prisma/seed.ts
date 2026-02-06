import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@linus.kr';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin1234';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('Admin 계정이 이미 존재합니다:', adminEmail);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: '관리자',
    },
  });

  console.log('Admin 계정 생성 완료:', admin.email);
}

main()
  .catch((e) => {
    console.error('시드 실행 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
