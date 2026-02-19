import { execSync } from 'child_process';

try {
  console.log('Running prisma generate...');
  execSync('npx prisma generate', { stdio: 'inherit', cwd: '/vercel/share/v0-project' });
  console.log('Prisma generate completed successfully.');
  
  console.log('Running prisma db push...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd: '/vercel/share/v0-project' });
  console.log('Prisma db push completed successfully.');
} catch (error) {
  console.error('Error:', error.message);
  console.log('Note: If DATABASE_URL is not set, the schema changes have been saved to prisma/schema.prisma');
  console.log('Run "npx prisma db push" manually once your database is connected.');
}
